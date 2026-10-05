// audit-ignored mencari panggilan yang hasilnya dibuang: ExprStmt yang chain-nya
// berakar pada variabel DB / sqlDB / r. Bukan soal gaya — di jalur-jalur itu kegagalan
// Postgres sempat-sempatnya dijawab 200.
//
//	go run ./cmd/audit-ignored [dir]   # default: direktori ini
package main

import (
	"fmt"
	"go/ast"
	"go/parser"
	"go/token"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

// rootsDB adalah variabel yang panggilan ber-status-statement-nya wajib diperiksa:
// hasil *gorm.DB selalu mengandung .Error, dan membuangnya berarti kegagalan DB
// dijawab dengan 200.
var rootsDB = map[string]bool{"DB": true, "sqlDB": true}

// listenMethods adalah panggilan yang mengakhiri proses: kalau error-nya dibuang,
// bind yang gagal bisa keluar dengan rc=0 dan orchestrator mengira container sehat.
var listenMethods = map[string]bool{"Run": true, "RunTLS": true}

// calleeSplit memisah identifier paling kiri dari nama method terakhir pada chain.
func calleeSplit(call *ast.CallExpr) (root, method string) {
	sel, ok := call.Fun.(*ast.SelectorExpr)
	if !ok {
		return rootName(call.Fun), ""
	}
	method = sel.Sel.Name
	return rootName(sel.X), method
}

type finding struct {
	pos  token.Position
	text string
	kind string
}

// rootName menelusuri chain selector/call/indext back ke identifier paling kiri.
func rootName(e ast.Expr) string {
	for {
		switch n := e.(type) {
		case *ast.SelectorExpr:
			e = n.X
		case *ast.IndexExpr:
			e = n.X
		case *ast.CallExpr:
			e = n.Fun
		case *ast.ParenExpr:
			e = n.X
		case *ast.Ident:
			return n.Name
		default:
			return ""
		}
	}
}

func main() {
	dir := "."
	if len(os.Args) > 1 {
		dir = os.Args[1]
	}

	var found []finding
	fset := token.NewFileSet()

	entries, err := os.ReadDir(dir)
	if err != nil {
		fmt.Fprintf(os.Stderr, "audit: %v\n", err)
		os.Exit(2)
	}
	for _, de := range entries {
		if de.IsDir() || !strings.HasSuffix(de.Name(), ".go") {
			continue
		}
		path := filepath.Join(dir, de.Name())
		data, rerr := os.ReadFile(path)
		if rerr != nil {
			fmt.Fprintf(os.Stderr, "audit: %v\n", rerr)
			os.Exit(2)
		}
		f, perr := parser.ParseFile(fset, path, data, 0)
		if perr != nil {
			fmt.Fprintf(os.Stderr, "audit: %v\n", perr)
			os.Exit(2)
		}
		ast.Inspect(f, func(n ast.Node) bool {
			stmt, ok := n.(*ast.ExprStmt)
			if !ok {
				return true
			}
			call, ok := stmt.X.(*ast.CallExpr)
			if !ok {
				return true
			}
			root, method := calleeSplit(call)
			var kind string
			switch {
			case rootsDB[root]:
				kind = "gorm"
			case root == "r" && listenMethods[method]:
				kind = "listen"
			default:
				return true
			}
			start := fset.Position(stmt.Pos()).Offset
			end := fset.Position(stmt.End()).Offset
			found = append(found, finding{
				pos:  fset.Position(stmt.Pos()),
				text: fmt.Sprintf("%s", data[start:end]),
				kind: kind,
			})
			return true
		})
	}

	sort.Slice(found, func(i, j int) bool {
		if found[i].pos.Filename != found[j].pos.Filename {
			return found[i].pos.Filename < found[j].pos.Filename
		}
		return found[i].pos.Line < found[j].pos.Line
	})
	gormN, listenN := 0, 0
	for _, f := range found {
		fmt.Printf("%s:%d  %s dibuang: %s\n", f.pos.Filename, f.pos.Line, f.kind, oneLine(f.text))
		if f.kind == "gorm" {
			gormN++
		} else {
			listenN++
		}
	}
	fmt.Printf("silent_gorm=%d silent_listen=%d\n", gormN, listenN)
	if gormN+listenN > 0 {
		os.Exit(1)
	}
}

func oneLine(s string) string {
	return strings.Join(strings.Fields(s), " ")
}
