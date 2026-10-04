# TODO — website-porto2

Milestone mengikuti konvensi yang dipakai di Pickertime: setiap milestone punya exit criteria
`E*` yang **wajib dibuktikan dengan angka keluaran alat**, bukan narasi.

Status hari ini: **CI/CD porto2 hijau tapi tidak membuktikan apa pun.** Run #14 `success`
(2026-10-02 14:29 UTC) sementara form kontak di situs publik membuang setiap pesan visitor.
M10 membangun gerbangnya supaya klaim "stable" punya dasar.

> **Update 2026-10-04 16:55 UTC:** P0–P5 selesai dengan angka di §7; P7 (dokumen) sedang lewat
> PR-nya sendiri — dan PR itu adalah bukti E7, jadi baris E7 di §7 masih "menunggu bukti" sampai
> hitungan run `deploy.yml` untuk merge-nya dibaca. Tabel §1 dibiarkan apa adanya sebagai foto
> sebelum perubahan — itu pembanding, bukan keadaan sekarang.
> Yang masih terbuka: **E4** (dua push berjarak < 60 s), **P6** (`watch.yml`, butuh 7 hari
> pengamatan), dan **E8** sepenuhnya (drift-check otomatis).
>
> **Update 2026-10-04 17:45 UTC:** E7 **terbukti** (merge PR #9 = `f218564`, 0 run `deploy.yml`
> untuk SHA itu, CI push run #14 hijau — lihat §7 P7). P7 selesai, termasuk tiga koreksi atas
> klaimku sendiri. P6 **hidup dan hijau di runner**: `watch.yml` merge lewat PR #10 (`f5fdcf1`), run
> manual pertamanya **merah** — bukan karena produksi, karena `gh` di `ubuntu-latest` menolak jalan
> tanpa `GH_TOKEN`; perbaikannya merge lewat PR #11 (`6b4ad9d`, deploy run #21 `success`) dan Watch
> run #2 (17:39:24 UTC) `success` dengan `merah=0`. Angka, causa, dan perbaikannya di §7 P6 +
> `DEPLOY.md` § "Run pertama di runner".
> Yang masih terbuka tinggal dua: **E4** (dua push berjarak < 60 s, sampai sekarang belum pernah
> terjadi) dan **6 baris hijau harian berikutnya untuk E8** — baru 1 dari 7, jadi M10 belum bisa
> dinyatakan selesai sebelum 2026-10-11.

---

## 1. Baseline terukur (snapshot 2026-10-04 15:10 UTC)

Dicatat supaya angka setelah M10 bisa dibandingkan. Sumber: GitHub REST + `gcloud`.

| Metric | Nilai |
|---|---|
| Workflow di `main` | 1 (`deploy.yml`, id 365188131, active) |
| Total run | 14 → 10 success, 4 failure, 1 cancelled |
| Event yang pernah terjadi | `push` saja. `pull_request` = 0, `workflow_dispatch` = 0 |
| Run terakhir | #14 = `37019562266`, success, 14:23:45→14:29:06Z (test 99 s + deploy 214 s) |
| Image terpasang | `…/portfolio-app/backend:230eff0ed…` + `frontend:230eff0ed…` (rev `portfolio-be-00010-5x9`, `portfolio-fe-00009-q6b`) |
| Step `Rollback backend on failure` | **0× tereksekusi** dari 14 run; satu-satunya observasi `skipped` |
| Branch protection `main` | `required_approving_review_count=0`, `required_status_checks=null`, `enforce_admins=true`, force-push & delete=false |
| File `_test.go` | **0** → langkah `go test ./...` adalah no-op |
| Call gorm tanpa penanganan error | 13 (`main.go:173,179,193,199,209,215,255-267`) |
| Tag di AR | backend 13, frontend 12 — tanpa retention policy; `:latest` di-push tapi tidak pernah dipakai deploy |
| Cloud SQL `portfolio-pg` | backup enabled, PITR on, retainedBackups=7, ZONAL, backup terbaru `2026-10-04T03:00Z` (12,1 jam), semua `SUCCESSFUL`. Restore drill: 0×. **[koreksi P7 16:52 UTC: dua angka di baris ini salah baca. `pointInTimeRecoveryEnabled` dan `retainedBackups` absen di API ⇒ PITR mati; "7" hanyalah jumlah baris `backups list`. Waktu `03:00Z` adalah epoch *id* backup, `endTime` sebenarnya `04:52:13Z`.]** |
| Runtime SA kedua service | `486641216758-compute@developer.gserviceaccount.com` = `roles/editor` + `roles/pubsub.publisher` se-proyek, dengan `allUsers → roles/run.invoker` |
| Kunci statis SA `github-cd` | **aktif**, `validAfter 2026-09-23T12:55:14Z`, `validBefore 2028-09-22` — ada di samping WIF |
| Endpoint kesehatan | `GET /api/health` = 404; `GET /` backend = 404 |
| Latency terukur | cold `/api/certificates` 1,7 s; `/api/cv` (Puppeteer) 13,87 s cold / 5,77 s warm, 774 803 B, PDF 2 halaman — **tidak di-smoke-test** |
| `min-instances` | be 0 (512Mi), fe 0 (1Gi) |
| Cloud Build `porto2-build-main` | `disabled=True` (konsisten dengan DEPLOY.md) |
| Branch layu | `chore/bughunter-ci` ahead 1 / behind 5, **bukan** ancestor `main`; berisi `ci.yml` (satu-satunya gate pre-merge) + `deploy.yml` versi lama yang mengembalikan anti-pattern `gcloud secrets versions access` → `--set-env-vars` |

Dead path yang terkonfirmasi live dari domain publik (`arkfazone-portofolio.elarisnoir.my.id`):

| Dipanggil dari | Path | Hasil | Sebab |
|---|---|---|---|
| `app/components/Contact.tsx:29` | `POST /api/contact` | 200 "Message sent successfully" | `src/app/api/contact/route.ts:11-16` hanya `setTimeout(1000)` — simulasi, tidak pernah mengirim |
| `app/admin/dashboard/page.tsx:23,41` | `GET` + `DELETE /api/contact[/:id]` | 405 | route handler lokal hanya export `POST`; tidak ada rewrite ke backend |
| `app/admin/projects/page.tsx:35,49,63,70,76` | `/api/admin/projects*` | 404 | rewrite ada (`next.config.ts:12`), rute di `main.go` tidak pernah dibuat |
| `app/admin/login/page.tsx:22` | `POST /api/auth/login` | 404 | rewrite `/api/auth/:path*` ada, backend hanya punya `/api/login` |
| `app/admin/page.tsx:100,119,133,152` | `POST/DELETE /api/certificates*` pakai `fetch` polos | 401 | rute itu ada di group `protected`; hanya `authFetch` yang mengirim header `Authorization` |

Backend yang sebenarnya hidup (8 rute): `POST /api/login`, `GET /api/certificates`, `GET /api/experience`,
`POST /api/certificates`, `DELETE /api/certificates/:id`, `POST /api/experience`, `DELETE /api/experience/:id`,
`POST /api/contact`. `POST /api/certificates` tanpa token → 401 (auth works).

Mail mati dua lapis: `mailer/mailer.go:18-19` baca `EMAIL_USER`/`EMAIL_PASS`, dan keduanya **tidak ada**
di env runtime `portfolio-be` maupun di Secret Manager.

---

## 2. Exit criteria M10

| # | Kriteria | Bukti yang dituntut |
|---|---|---|
| E1 | Ada workflow yang jalan di **setiap** PR | `actions/runs?event=pull_request` ≥ 1, dua-duanya `completed/success`; check name muncul di `status_check_contexts` |
| E2 | Kerusakan benar-benar **memblokir** merge | 1 PR sengaja rusak (vet/gofmt mati) → job `ci` `failure`, `mergeable_state` menolak, dan **0** run `deploy.yml` untuk commit itu |
| E3 | PR tidak mungkin menyentuh produksi | grep log job PR: 0 pemintaan token WIF, 0 `docker push`; `deploy.yml` tetap hanya `push: main` |
| E4 | Cancel tidak bisa meninggalkan deploy setengah jalan | 2 push berjarak < 60 s → run kedua `queued`, **bukan** membatalkan yang pertama; setelah keduanya selesai, image live == SHA HEAD, kedua service `Ready` |
| E5 | Rollback **pernah dieksekusi** dan memulihkan | 1 drill: deploy dengan smoke yang sengaja digagalkan → kedua service kembali ke SHA sebelumnya, health 200, dan hasilnya tercatat (bukan `skipped`) |
| E6 | Smoke test bisa **gagal**, bukan cuma lolos | assertion isi (bukan cuma status code) terbukti menolak response rusak: 1 test lokal dengan rewrite salah → `failure` |
| E7 | Perubahan dokumen tidak memicu deploy produksi | PR yang hanya mengubah `*.md` → `deploy.yml` run count = 0 |
| E8 | Dokumen tidak boleh menyimpang dari realita | cek drift `DEPLOY.md`/`README.md` vs keluaran `gcloud` jalan dan hijau; tabel IAM di `DEPLOY.md:45-49` sudah dikoreksi |

Skala keberhasilan bukan "workflow hijau", tapi "workflow hijau **dan** menolak hal yang seharusnya ditolak".
E2 dan E6 adalah dua kriteria yang membuktikan itu.

---

## 3. Fase

### P0 — Bekukan baseline, jangan sentuh produksi
Kerjakan: simpan tabel §1 ke commit ini. Tidak ada perubahan workflow/prod di fase ini.
Selesai: angka §1 ada di git dan bisa di-diff.

### P1 — `ci.yml`: gerbang test-only di PR
Buat `.github/workflows/ci.yml` (baru), **tanpa** `paths:` filter (lihat §4 trap #1).

```
on: pull_request (branches: [main]) + workflow_dispatch
permissions: contents: read          # tanpa id-token, supaya E3 terbukti struktural
concurrency: { group: ci-${{ github.ref }}, cancel-in-progress: true }
jobs:
  go:    go-version-file: go-backend/go.mod → gofmt -l (harus 0) → go vet → go build → go test
         + errcheck untuk 13 call gorm yang mengabaikan error
  web:   npm ci → npm run lint → npx tsc --noEmit → npm run build (BACKEND_URL dummy, sengaja)
  image: docker build kedua Dockerfile (tanpa push), dengan .dockerignore yang baru dibuat
```
Semua action dipin SHA seperti konvensi repo. `timeout-minutes` dipasang di tiap job.
Catatan jujur: `npm run build` di CI memakai `BACKEND_URL` dummy, jadi artefak CI ≠ artefak produksi
(perbedaan build-arg). Ini sengaja dan akan ditutup P4.
Selesai: E1 terpenuhi pada PR dummy pertama.

### P2 — Tripwire kontrak API (ini yang menangkap bug kontak)
Skrip `tools/ci/api-contract-check.mjs`, dijalankan di job `web`:

1. Enumerasi literal `"/api/…"` + method dari `nextjs-frontend/src/**` (`fetch`, `authFetch`).
2. Resolve tiap path ke: route handler Next (`src/app/api/**/route.ts`, cocokkan method yang di-export)
   **atau** rewrite `next.config.ts` yang **targetnya benar-benar terdaftar di `main.go`** (parse rute gin).
3. Path yang tidak resolve = mati. Fail kalau ada **dead path baru**; lolos kalau daftar hanya menyusut.
4. Baseline ratchet `tools/ci/api-baseline.txt` diisi 6 baris dari tabel §1. Aturan: hanya boleh mengecil.

Job `api` tambahan: Postgres 15 service container + binary Go asli, lalu assertion nyata —
`GET /api/certificates` → 200 **dan** array dengan key `id,title,issuer,date`; `POST /api/certificates`
tanpa token → 401; login benar → token → POST → 201. Ini sekaligus menutup `go test ./...` yang no-op.
Selesai: tripwire merah pada 6 dead path baseline + satu PR percobaan dengan path fiktif baru → `failure`.

### P3 — Balik branch protection (setelah, bukan sebelum, P1 hidup)
`required_status_checks.contexts = ["ci / go", "ci / web"]` (verifikasi nama context persis dari
API sebelum menyimpan), pertahankan `required_approving_review_count=0`, `enforce_admins=true`,
`allow_force_pushes=false`, `allow_deletions=false`.
Selesai: E2 — satu PR rusak tidak bisa di-merge, dan `git push` langsung tetap ditolak.

### P4 — Kerasukan `deploy.yml` (bukan menambah fitur)
- `paths-ignore: ['**.md','README.md','docs/**','TODO.md']` pada pemicu `push` → E7.
- Pisahkan concurrency: job `test` boleh `cancel-in-progress: true`; **job deploy pakai group sendiri
  dengan `cancel-in-progress: false`** → E4. Deploy tidak boleh bisa dibunuh.
- Ganti `env.PREV_IMG` (dipakai di `if:` di `deploy.yml:155`) dengan **step output**
  (`id: be_prev` → `steps.be_prev.outputs.image`). `steps`/`needs` dijamin tersedia di `if:`,
  `env` dari `GITHUB_ENV` tidak → lihat §4 trap #2.
- Rollback untuk **kedua** service, lalu **verifikasi pasca-rollback** (bandingkan image live dengan
  image yang diharapkan + probe health) sebelum `exit 1`. Sekarang rollback cuma ada untuk backend
  (`deploy.yml:154-168`) dan tidak ada pengecekan apa pun setelahnya.
- Deploy by **digest** (`@sha256:` hasil push), bukan tag; hilangkan push `:latest` yang tidak dipakai.
- Tambah `GET /api/health` di `main.go` (cek `DB.Ping()`), dan pakai di smoke test → menutup §1
  "endpoint kesehatan 404".
- Smoke test assert **isi JSON**, bukan `curl -f` saja (`deploy.yml:116`, `:141-147`), karena
  `main.go:173` mengabaikan error gorm → 200 + `null` tetap lolos.
- Selaraskan artefak: pakai `BACKEND_URL` asli di job `test` juga, atau hapus build-arg dari jalur
  tes dengan menyadari perbedaannya secara tertulis.
Selesai: E4, E6, E7 hijau dengan log run sebagai bukti.

### P5 — Drill rollback (butuh izinmu — menyentuh produksi)
Satu siklus nyata: PR sengaja merusak response health → merge → deploy gagal di smoke → rollback
jalan → verifikasi kedua service kembali ke SHA sebelumnya. Catat: run id, SHA sebelum/sesudah,
`Ready` timestamp, hasil health probe. Ini padanan P5 di Pickertime; tanpa ini E5 tetap merah.
Alternatif tanpa risiko produksi: buat service `portfolio-be-drill` sementara (biaya Cloud Run
mendekati nol, butuh izin bikin resource baru).

### P6 — Jendela observasi (padanan E8 Pickertime)
Workflow `watch.yml` terjadwal harian (`schedule`, jam fix supaya tidak menumpuk):
probe `/api/health`, `/api/certificates`, `/api/cv` via domain publik **dan** run.app, bandingkan
image live dengan SHA HEAD `main` (drift), jalankan tripwire API, cek `chore/*` layu. Keluaran
satu baris per hari. Kalau gagal → buat issue (butuh izin + scope `issues: write`).
Selesai: 1 baris tercatat per hari; minimal 7 hari berturut-turut sebelum M10 dinyatakan selesai.

**Status 2026-10-04 17:39 UTC:** `watch.yml` hidup di runner, baris pertama tercatat (`merah=0`).
Isinya lebih dari rencananya: tiga origin, assertion isi untuk `/` dan `/api/cv`, vonis drift
berbasis `git log --first-parent` + daftar run `deploy.yml`. **Issue otomatis tidak dibuat** —
`issues: write` sengaja tidak dipasang dan itu masih keputusanmu (§6 butir 5). Sisa exit criterion:
6 baris hijau berikutnya, 02:37 UTC tiap hari, sampai 2026-10-11. Angka lengkap di §7 P6.

### P7 — Rekonsiliasi dokumen & beres-beres
- Koreksi `DEPLOY.md:45-49`: tabel IAM tidak matches realita (runtime SA pegang `roles/editor`).
- `README.md` salah total dan menyesatkan: menyebut backend `.NET 9` di `MyPostgreApi` (direktori itu
  tidak ada; yang ada `go-backend`), Next.js 15 (aktual `^16.1.6`), `tailwind.config` (aktual Tailwind v4
  via `postcss.config.mjs`), dan email kontak berbeda dari `main.go:233`.
- Cabut kunci statis `github-cd` setelah WIF terbukti dipakai (E7 Pickertime-analog), atau catat sebagai
  hutang yang diterima secara eksplisit.
- Putuskan nasib `chore/bughunter-ci` (salvage ide `ci.yml`-nya lalu hapus branch; **jangan di-merge**
  — `deploy.yml`-nya regression) dan `staging` (layu sejak 2026-09-23).
Selesai: E8 + tidak ada klaim dokumen yang bertentangan dengan keluaran `gcloud`.

---

## 4. Jebakan yang sudah diantisipasi

1. **Required check + path filter = PR menggantung.** Ini persis alasan yang ditulis
   `DEPLOY.md:15-17` untuk tidak memasang required check. Solusinya bukan skip gerbangnya, tapi
   pasang `ci.yml` **tanpa** `paths:` dulu (P1), baru wajibkan (P3). Kalau `ci.yml` dipasang
   `paths-ignore`, PR dokumen akan tak pernah punya check dan terkunci.
2. **`env` context di `if:` tidak dijamin berisi nilai dari `GITHUB_ENV`.** Step output adalah jalur
   yang dijamin. Guard lama `deploy.yml:155` belum pernah dievaluasi dalam kondisi gagal, jadi
   statusnya "tidak terverifikasi" — bukan "bekerja".
3. **Cancel ≠ failure.** `if: failure()` tidak jalan saat job dibatalkan, jadi rollback berbasis
   `failure()` tidak melindungi dari `cancel-in-progress`. Karena itu perbaikannya "jangan batalkan
   deploy", bukan "rollback lebih pinter".
4. **Nama context required check** bisa `job name` atau `workflow / job`. Baca
   `check-runs/{sha}` dulu, jangan menebak — salah tebak = semua PR terblokir.
5. **Ratchet harus boleh menyusut.** Tripwire P2 akan merah di hari pertama (6 dead path). Kalau
   dibuat blocking tanpa baseline, gerbang ini justru menghentikan semua pekerjaan.
6. **`go.mod` minta `go 1.25.0`**, lokal 1.27.1. CI akan pakai 1.25.x — jangan kaget kalau ada
   perbedaan `go vet`.

---

## 5. Eksplisit di luar scope M10 (jadi M11)

Perbaikan produk, bukan gerbang: wiring form kontak ke backend + secret SMTP (`EMAIL_USER`/
`EMAIL_PASS`) + menghentikan pola fire-and-forget (`main.go:237-242`); memperbaiki 5 dead path
admin; menghapus `seedData()` (`main.go:121,253-270`) dari jalur start produksi dan mengganti
`AutoMigrate` (`main.go:105`) dengan migration yang berversi; mengembalikan error gorm yang diabaikan
di 13 titik. M10 sengaja dibuat **mendukung** M11: baseline ratchet §1 menyusut tiap perbaikan.

Urutan yang kuambil: gerbang dulu (permintaanmu), produk setelah — dengan konsekuensi jujur bahwa
situs tetap kehilangan pesan kontak sampai M11 jalan, dan mulai sekarang CI akan **mengingat** itu
lewat file baseline, bukan melupakannya.

---

## 6. Yang butuh keputusanmu

| # | Butir | Kenapa tidak bisa kuputuskan sendiri |
|---|---|---|
| 1 | Izin P5 drill rollback di produksi, atau pakai service `portfolio-be-drill` | Yang pertama bisa mematikan situs beberapa menit; yang kedua membuat resource berbayar baru |
| 2 | Menambah/mengganti branch protection `main` (P3) | Mengubah jalur merge yang kamu pakai; PR #1 sebelumnya di-merge lewat REST karena `gh` tidak tersedia di mesin ini |
| 3 | Cabut kunci statis `github-cd` (P7) | Tidak ada cara dari sisi CI untuk membuktikan kunci itu tidak dipakai di tempat lain |
| 4 | Runtime SA: bikin dedicated SA tanpa `roles/editor` | Berpotensi memutus akses Cloud SQL/secret yang sekarang bergantung pada default compute SA |
| 5 | `watch.yml` membuat issue otomatis (P6) | Perlu scope `issues: write` dan izin bikin issue atas nama akunmu |
| 6 | `staging` dan `chore/bughunter-ci` dihapus/dinaikkan | Menghapus branch = aksi yang tidak bisa dibatalkan sendiri |

### Status butir §6 per 2026-10-04

| # | Butir | Status |
|---|---|---|
| 1 | Izin drill rollback | **Diberikan dan selesai.** Drill jalan di produksi (run #18), bukan di service baru; jendela rusak 63 detik, hanya `/api/cv`. Lihat §7 P5 |
| 2 | Branch protection `main` | **Diberikan dan terpasang.** `required_status_checks.contexts = ["go","web","api"]`, `strict` tetap `false` (kompensasinya: `ci.yml` ikut tersulut `push: main`) |
| 3 | Cabut kunci statis `github-cd` | **Sudah tidak relevan — dan bukan karena aku.** `gcloud iam service-accounts keys list` kini hanya mengembalikan 1 kunci `SYSTEM_MANAGED`; kunci `USER_MANAGED` (valid sampai 2028-09-22) yang tercatat di §1 sudah tidak ada saat diperiksa ulang 16:45 UTC. Aku tidak menghapusnya dan tidak bisa memastikan siapa yang menghapus — kalau itu kamu, bagus; kalau bukan, itu pertanyaan sendiri. |
| 4 | Runtime SA tanpa `roles/editor` | **Terbuka.** Diverifikasi: `486641216758-compute@developer.gserviceaccount.com` masih `roles/editor` + `roles/pubsub.publisher` se-proyek, dan kedua service publik (`allUsers → run.invoker`) jalan di SA itu. Sudah dicatat sebagai hutang di `DEPLOY.md` |
| 5 | `watch.yml` membuat issue otomatis | **Terpasang seperti rencana awalnya.** `issues: write` **tidak** diberi, jadi Watch hanya menulis satu baris per hari + membuat run merah; alarmnya notifikasi default GitHub untuk workflow terjadwal yang gagal. Terbukti di runner: run #2 `success` (`merah=0`), run #1 `failure` dengan satu MERAH |
| 6 | `staging`, `chore/bughunter-ci` | **Terbuka.** `origin` = 13 cabang (hitungan `GET /git/refs/heads`, 17:45 UTC). Angka lama di baris ini ("`chore/bughunter-ci` ahead 1 / behind 5") sudah basi: `git rev-list --left-right --count origin/main...origin/<b>` kini memberi **ahead 1 / behind 22** untuk `chore/bughunter-ci` (tip `bd38b93`, 97 jam) dan **ahead 0 / behind 30** untuk `staging` (tip `1f2486b`, 267 jam — satu-satunya yang dihitung *layu* oleh Watch). `deploy.yml` di kedua branch itu tetap regression. Branch yang kubuat untuk fase-fase di atas (`chore/gerbang-ci`, `chore/gerbang-ci-v2`, `chore/proteksi-main`, `chore/gerbang-deploy-p4`, `fix/traffic-alokasi-eksplisit`, `fix/watch-gh-token`, `drill/cv-response`, `revert/drill-cv`, `docs/rekonsiliasi-p7`, `chore/watch-p6`) juga belum dihapus — PR-nya sudah merged, jadi isinya aman di `main`. Watch tidak menghapus apa pun: langkah *Branch layu* hanya menghitung |

---

## 7. Hasil terukur per fase (2026-10-04)

Angka dari keluaran alat, bukan narasi. Sumber: `GET /repos/…/actions/runs`, `check-runs/{sha}`,
log job, `gcloud run services describe`, `tools/deploy/cloudrun.sh`.

### P1 — `ci.yml`

Tiga job (`go`, `web`, `api`), `permissions: contents: read` — **tidak ada `id-token`**, jadi E3
bukti struktural: PR tidak mungkin minta token WIF walaupun ada langkah yang mencoba. 12 run CI
hingga 16:45 UTC → 11 success, 1 failure (`9d0a3f1`, sengaja). `timeout-minutes` 15/20/15.

### P2 — tripwire kontrak

`tools/ci/api-contract-check.mjs` 293 baris; baseline `tools/ci/api-baseline.json` = **13 path mati
+ 1 stub** (lebih banyak dari 6 yang direncanakan, karena pemanggilan UI ikut dihitung). Ratchet
diuji dua arah:
- tambah stub marker palsu → `rc=1`;
- hilangkan stub yang ada di baseline tanpa mengecilkan baseline → `rc=1` dengan pesan
  "STUB sudah hilang, kecilkan baseline". Uji pertama sempat **tidak conclusive** (masih ada marker
  kedua yang cocok), diulang dengan menghapus kedua baris marker.
Jalur hidup/mati kini terlihat dari log: `rute backend 9 (protected 4)`, `rewrite 8`,
`handler lokal 4`, `pemanggilan UI 25 (19 unik)`.

### P3 — required status checks

`contexts: ["go","web","api"]` (nama context dibaca dari `check-runs/{sha}` dulu, bukan ditebak),
`strict: false`, `enforce_admins: true`, `approvals: 0`, `dismiss_stale_reviews: true`.
**E2 terbukti:** PR #4 `9d0a3f1` → `go: failure`, `web: failure`, `api: failure`, GitGuardian success,
`mergeable_state: "blocked"`, percobaan merge → **HTTP 405 "3 of 3 required status checks are
failing."** `main` tetap `b449a76`, dan SHA rusak itu tidak pernah punya run `deploy.yml` (hanya
`CI pull_request`).

### P4 — `deploy.yml` ditulis ulang

| Sebelum | Sesudah |
|---|---|
| job `test` = salinan gerbang yang lebih lemah | dihapus; gerbang tes hanya di `ci.yml`, dan `ci.yml` kini juga tersulut `push: main` |
| hanya `push: main`, dokumen ikut men-deploy | `paths-ignore: ['**.md','docs/**']` |
| `concurrency` per-workflow, `cancel-in-progress: true` | per-job di `deploy`, `cancel-in-progress: false` |
| `if: failure() && env.PREV_IMG != ''` (0× tereksekusi dari 15 run) | `if: always() && steps.prev.outcome == 'success' && (…outcome == 'failure')` — ikut jalan kalau *build/deploy* yang gagal |
| rollback re-deploy backend saja, tanpa pengecekan | `update-traffic` untuk **be + fe**, lalu diverifikasi ulang |
| deploy by tag + push `:latest` yang tidak dipakai | deploy by digest, `:latest` berhenti di-push |
| `curl -f` (200 + `null` lolos) | assertion isi: `.db=="ok"`, shape `certificates`/`experience`, `/` >5 KB tanpa `Application error`, rewrite fe→be, magic byte `%PDF-` |
| `/api/health` 404 | ada di `main.go` (`DB.DB()` + `Ping()`), plus rewrite di `next.config.ts` sehingga domain publik bisa diprobe |

**Temuan tak terencana yang mengubah desain.** Saat memvalidasi bentuk perintah rollback, aku
menjalankan `update-traffic --to-revisions=portfolio-be-00011-5z8=100`. Itu bukan no-op: traffic
ter-*pin* ke revisi bernama, dan deploy berikutnya tidak ikut berpindah. Run #16 membuktikannya —
`latestCreated: portfolio-be-00012-4zs` (Ready, image `sha256:f0fe00d3…` = artefak `b6ad3ce`)
sementara `traffic: 100% portfolio-be-00011-5z8` (image `sha256:2e56ee26…` = artefak `b449a76`).
Artefak baru ter-deploy tapi tidak pernah melayani request, dan smoke tetap hijau karena yang di-probe
adalah URL layanan. `_LATEST` ditolak API (`only lowercase, digits, and hyphens`), jadi
`tools/deploy/cloudrun.sh` mengalokasikan nama revisi secara eksplisit di setiap deploy, dan
verifikasi dimulai dari "revisi yang serve == revisi run ini". Produksi dipulihkan manual ke
`portfolio-be-00012-4zs`, lalu PR #6 (`4629fa2`) membawa perbaikannya; run **#17** hijau dengan
`portfolio-be-00013-s97=100` + `portfolio-fe-00012-947=100`.

### P5 — drill rollback (E5 + E6)

Run **#18** (`push: main` pada `a74e014`), kesimpulan **failure**:

```
16:28:07  titik rollback be-00013-s97 / fe-00012-947 (dibaca dari alokasi traffic)
16:28:54  backend digest sha256:ec5304fa… -> be-00014-c6c 100%
16:30:51  frontend digest sha256:31e32c19… -> fe-00013-c8l 100%
16:31:22  verify: serving==deployed ok, health {"db":"ok","status":"ok"}, certificates 3,
          experience 2, "/" 40699 byte, rewrite fe->be ok
16:31:39  "/api/cv tidak mengembalikan PDF"  -> Verifikasi pasca-deploy = failure
16:31:54  Rollback kedua service = success (traffic kembali ke be-00013-s97 + fe-00012-947)
16:32:00  Verifikasi pasca-rollback = success
```

Jendela rusak **≈ 63 detik** (16:30:51 → 16:31:54), hanya unduhan CV. Diperiksa mandiri:
`cloudrun.sh serving` → `be-00013-s97=100`, `fe-00012-947=100`. Revert PR #8 (`39eae21`) → run
**#19 success**, kini `portfolio-be-00015-xzs=100` + `portfolio-fe-00014-9v9=100`, dan
`https://arkfazone-portofolio.elarisnoir.my.id/api/cv` → `200`, 774 803 byte, magic `%PDF-`.
`main` == artefak yang melayani request.

Yang membuat drill ini berarti: **CI tidak melihat kegagalannya sama sekali** — `go`, `web`, `api`,
GitGuardian semuanya hijau untuk `6b56d38`, karena CI tidak pernah men-start server Next.js. Only
`curl -f` versi lama juga hijau (status 200). E6 terpenuhi karena assertion-nya pada **isi**.

### P6 — `watch.yml`: jendela observasi harian (bukan gerbang)

Satu file baru, `.github/workflows/watch.yml` (id workflow **374751227**, `cron: 37 2 * * *` UTC +
`workflow_dispatch`, `concurrency: watch-production` / `cancel-in-progress: false`,
`permissions: contents: read` + `actions: read`, `timeout-minutes: 20`, tanpa `id-token` dan tanpa
kredensial GCP). Isinya empat langkah yang menulis vonisnya ke `/tmp/hasil.tsv` + satu rangkuman +
satu gerbang.

Yang sudah terbukti dengan angka, berurutan waktu:

| Waktu UTC | Peristiwa | Angka |
|---|---|---|
| 17:22:13 | PR #10 merge → `f5fdcf1` | CI push run #17 `success`; deploy run #20 `success` (17:22:16→17:25:53); traffic `be-00016-p5q`/`fe-00015-22j` @100% |
| 17:27:14 | **Watch run #1 di runner** | `failure`, `merah=1`, satu-satunya MERAH = `drift` |
| 17:34:57 | PR #11 merge → `6b4ad9d`, deploy run #21 | `success` (17:35:00→17:38:55); traffic `be-00017-8c8`/`fe-00016-t28` @100% |
| 17:39:24 | **Watch run #2** | `success` — `expected 6b4ad9d`, `deploy push terakhir: run #21 @ 6b4ad9d = success`, `run belum selesai 0`, `merah=0`, `Semua probe hijau.` |
| ≈17:42 | produksi diukur dari luar | `{"db":"ok","status":"ok"}` di 3 origin; certs 3 / exp 2; `/` 200 40699 b 0.40 s (0 `Application error`); `/api/cv` 200 774803 b 6.31 s `%PDF-` |

Run #1 adalah bukti bahwa workflow-nya hidup **dan** bahwa reheksal lokal tidak setara runner:
`gh` ada di `ubuntu-latest` tapi menolak jalan tanpa `GH_TOKEN`, sehingga `gh api` keluar lebih awal
dan langkah drift menerima daftar run kosong. Guard per-titik-gagal (commit `bbb9f3f`) bekerja seperti
dirancang — vonis tertulis, langkah `exit 0`, sisa probe tetap tercetak, gerbang yang memutuskan
merah. Tanpa guard, run #1 akan menghasilkan baris harian terpotong tanpa alasan.

Cakap yang sengaja tidak dipasang, dan apa yang hilang karenanya:

- **`issues: write`** — §6 butir 5 masih keputusanmu; alarmnya run merah + notifikasi default GitHub.
- **`id-token`/WIF** — Watch tidak membaca `status.traffic`. Kalau seseorang mem-pin traffic dengan
  tangan (persis kegagalan run #16), produksi bisa melayani revisi lama sambil Watch hijau, karena
  commit yang dilayani *memang* punya run deploy hijau. Yang menutup celah itu hanya
  `cloudrun.sh serving` di dalam `deploy.yml`.
- **Batas drift yang diketahui**: drift menjawab "commit kode terakhir di `main` sudah punya run
  `deploy.yml` hijau?" — bukan "revisi yang sekarang melayani request cocok dengan `main`?".
  Yang kedua butuh akses cloud ke jalur tanpa ulasan PR.

`workflow_dispatch` **tidak mungkin sebelum merge**: `POST /actions/workflows/watch.yml/dispatches`
dengan `ref=chore/watch-p6` mengembalikan HTTP 404, karena GitHub hanya mendaftarkan file workflow
yang ada di default branch. Konsekuensinya dua: kalimat di deskripsi PR #10 ("di-dispatch manual dulu
dari branch ini") salah dan sudah dikoreksi, dan satu-satunya cara membuktikan sebuah workflow baru
di runner adalah me-*merge*-nya dulu — jadi workflow terjadwal yang belum diverifikasi selalu punya
satu run "pertama kali" yang berisiko merah.

**Sisa P6: 7 baris harian hijau berturut-turut (02:37 UTC), dihitung mulai run #2 = 2026-10-04
17:39:24 UTC.** Baru 1 baris. E8 tidak bisa ditutup dari laptop.

### P7 — dokumen

`README.md` sebelumnya salah total: backend disebut **.NET 9 di `MyPostgreApi`** (direktori itu tidak
ada; `git ls-files` tidak pernah mengenalnya), Next.js 15 (aktual `^16.1.6`, React `19.2.1`),
`tailwind.config` (aktual Tailwind v4 lewat `@tailwindcss/postcss`, tidak ada file config), struktur
pohon direktori tidak cocok realita, dan email `muhammadarkanfauzi0@…` berbeda dari tiga sumber lain
yang semuanya `muhammadarkanfauzi9@…` (`cv-layout/page.tsx:49`, `mailer/mailer.go:12`,
`main.go:246`). Diganti dengan stack + struktur + cara lokal yang terverifikasi, plus tabel
**Status fitur** yang jujur (kontak stub, admin mati, CV tanpa sertifikat).
`DEPLOY.md`: tabel IAM dikoreksi ke keluaran `gcloud projects get-iam-policy` (runtime SA memegang
`roles/editor` + `roles/pubsub.publisher` se-proyek, bukan hanya `secretAccessor`), plus mekanisme
gerbang deploy, arah traffic, hasil drill, dan inventaris operasional.

Pass kedua (16:52 UTC) justru menemukan tiga kesalahan **pada dokumen yang sedang kuperbaiki sendiri**
dan pada baseline, semuanya dari klaim yang tidak kuulang pengukurannya:

| Klaim | Sumber | Aktual |
|---|---|---|
| PITR aktif di Cloud SQL | `DEPLOY.md` lama + baseline §1 | `settings.pointInTimeRecoveryEnabled` **absen** di `gcloud sql instances describe --format=json` (juga di `instances list`) ⇒ PITR mati. `retainedBackups` juga absen; angka "7" hanya jumlah baris `backups list` |
| Backup terbaru `2026-10-04T03:00Z` | baseline §1 | itu epoch dari **id** backup; `startTime 04:50:41Z`, `endTime 04:52:13Z` |
| LinkedIn `muhammad-arkan-fauzi-5a6799380` | `README.md` lama | yang diklik di situs: `muhamad-arkan-fauzi-5a6799380` (`Navigation.tsx:8`); `cv-layout/page.tsx:53` menulis versi teks tanpa angka — jadi situs sendiri tidak konsisten |

Dua hal ikut terverifikasi dan sekarang tercatat di `DEPLOY.md`: `maxScale=3` +
`containerConcurrency=80` + `startup-cpu-boost` di kedua revision, dan connector VPC hanya ada di
backend (`run.googleapis.com/vpc-access-connector` ada di anotasi **revision**, bukan service —
pertanyaan "kok kosong" waktu cek pertama kali bukan karena connectornya hilang, tapi karena
`--flatten="bindings[].members"`/anotasi service memang tidak mencetaknya). Pelajarannya untuk E8:
klaim yang tidak disertai perintah pembuktinya adalah kandidat pertama untuk salah, termasuk klaim
yang kutulis 20 menit sebelumnya.

### Catatan jujur: yang tidak sama dengan rencana

1. **`errcheck` tidak dipasang** di job `go` (P1 merencanakannya). 13 call GORM yang mengabaikan
   error sekarang ditutup tidak langsung: job `api` membuktikan bentuk respons terhadap DB nyata, dan
   M11 menanggung perbaikannya. Kalau `errcheck` dipasang hari ini, gerbangnya merah sejak awal —
   sama seperti tripwire tanpa baseline.
2. **Job `image` di CI dihapus** dari rencana. `docker build` kedua Dockerfile tidak menambah bukti
   (yang diverifikasi adalah image yang di-deploy, di `deploy.yml`), hanya menambah 4–6 menit.
3. **Drill lewat PR ke `main`, bukan `workflow_dispatch` di branch lepas.** Rencananya merusak
   kontrak `/api/health`, tapi job `api` juga meng-assert `.db=="ok"` — kerusakan itu tidak bisa
   sampai ke produksi lewat jalur mana pun yang sah. Merusak `/api/cv` justru menguji batas yang
   benar: apa yang tidak bisa dilihat CI.
4. **Artefak CI ≠ artefak produksi** (build-arg `BACKEND_URL` beda) masih benar terjadi; yang berubah
   adalah `deploy.yml` tidak lagi pura-pura mengesahkan artefak CI. Yang disahkan adalah image hasil
   deploy itu sendiri.
5. **Digest tidak stabil untuk konten yang sama**: `go-backend/` yang identik menghasilkan
   `sha256:b4c46da3…` (run 17), `sha256:ec5304fa…` (run 18), `sha256:2b986e14…` (run 19). Build tidak
   reproducible, jadi digest mengikat revisi ke artefak milik satu run — bukan alat dedup. Itu memang
   fungsi yang dibutuhkan rollback, tapi jangan berharap "konten sama ⇒ revisi sama".
6. **Reheksal lokal tidak bisa membuktikan workflow di runner.** Watch run #1 merah karena `gh` di
   `ubuntu-latest` menolak jalan tanpa `GH_TOKEN` — shim `gh` di laptopku memanggil `curl` dengan
   kredensial git, jadi selalu "berhasil", dan `actionlint` tentu tidak memeriksa isi langkah.
   Satu-satunya alat yang bisa melihat kelas kegagalan ini adalah run sungguhan, dan run sungguhan
   hanya mungkin **setelah** merge (dispatch dari branch mengembalikan HTTP 404). Konsekuensinya
   untuk P6: workflow terjadwal baru selalu dibuka dengan satu run yang belum terverifikasi, jadi
   guard per-titik-gagal + `if: always()` di rangkuman bukan kemewahan — itulah yang membuat run #1
   menghasilkan satu vonis yang jelas alih-alih baris harian terpotong.

### Status exit criteria

| # | Kriteria | Status | Bukti |
|---|---|---|---|
| E1 | Workflow jalan di setiap PR | **hijau** | 19 run `ci.yml` = 12 `pull_request` + 7 `push` (18 `success`, 1 `failure` = run #4 untuk `9d0a3f1`, yang memang kerusakan percobaan di E2). `pull_request` untuk `98a7057`, `e3ce49d`, `f07fddb`, `b487c0f`, `9d0a3f1`, `6b56d38`, `14859ce`, `4bcce94`, `ef804fc`, `16c2cfa`, `bbb9f3f`, `697e3a0` |
| E2 | Kerusakan memblokir merge | **hijau** | PR #4 `blocked`, HTTP 405, 0 run `deploy.yml` untuk `9d0a3f1` |
| E3 | PR tidak mungkin menyentuh produksi | **hijau (struktural)** | `ci.yml`: `permissions: contents: read`, tidak ada `id-token` sama sekali |
| E4 | Cancel tidak meninggalkan deploy setengah jalan | **merah — belum diuji** | `cancel-in-progress: false` terpasang dan `actionlint` bersih, tapi belum ada dua push berjarak < 60 s yang membuktikan run kedua `queued` |
| E5 | Rollback pernah dieksekusi dan memulihkan | **hijau** | run #18 langkah 13 `success`, langkah 14 `success`, traffic terukur kembali ke `be-00013-s97`/`fe-00012-947` |
| E6 | Smoke bisa gagal | **hijau** | run #18 `"/api/cv tidak mengembalikan PDF"` pada HTTP 200 — `curl -f` tidak akan melihatnya |
| E7 | Dokumen tidak memicu deploy | **hijau** | merge PR #9 (`f218564`, hanya `README.md`/`DEPLOY.md`/`TODO.md`) → `deploy.yml` run count **0** untuk SHA itu, sementara `ci.yml` push run #14 `success`. Kontrasnya terukur di hari yang sama: PR #10/#11 yang menyentuh `.github/workflows/**` memicu deploy run #20 dan #21, keduanya `success`. `paths-ignore: ['**.md','docs/**']` + `actionlint` bersih |
| E8 | Dokumen tidak menyimpang dari realita | **sebagian — 1 dari 7 baris** | koreksi manual pass 1 (16:45) dan pass 2 (16:52) vs keluaran `gcloud`, perintah pembuktinya kini tertulis di `DEPLOY.md`; drift-check **otomatis** hidup di runner: Watch run #2 (17:39:24 UTC) `success`, `expected 6b4ad9d` = head, `merah=0`. Exit criterion-nya menuntut 7 baris hijau berturut-turut, jadi statusnya belum bisa ditutup sebelum 2026-10-11 |

