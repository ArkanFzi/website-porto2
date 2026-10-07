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
> **Update 2026-10-04 18:00 UTC:** E7 **terbukti** (merge PR #9 = `f218564`, 0 run `deploy.yml`
> untuk SHA itu, CI push run #14 hijau — lihat §7 P7). P7 selesai, termasuk tiga koreksi atas
> klaimku sendiri. P6 **hidup dan hijau di runner**: `watch.yml` merge lewat PR #10 (`f5fdcf1`), run
> manual pertamanya **merah** — bukan karena produksi, karena `gh` di `ubuntu-latest` menolak jalan
> tanpa `GH_TOKEN`; perbaikannya merge lewat PR #11 (`6b4ad9d`, deploy run #21 `success`), lalu
> PR #12 (`14fe90e`, deploy run #22) dan Watch run #3 menutup lubang buktinya: `rows=13 merah=0`.
> Angka, causa, dan tiga kalimatku yang harus kuhapus karena tidak terukur ada di §7 P6 + `DEPLOY.md`
> § "Run pertama di runner".
> Yang masih terbuka tinggal dua: **E4** (dua push berjarak < 60 s, sampai sekarang belum pernah
> terjadi) dan **7 hari baris `schedule` hijau berturut-turut untuk E8** — hari pertama yang sah
> baru 2026-10-05 02:37 UTC, jadi M10 belum bisa dinyatakan selesai sebelum 2026-10-11.
>
> **Update 2026-10-05 01:50 UTC:** keputusan §6 sudah jatuh dan **rencana M12 ada di §8** (F0–F10,
> tiap fase dengan angka "sebelum", exit criterion, dan jalan baliknya). Sebelum tulis baseline aku
> ukur ulang semuanya, dan **dua kalimatku sendiri gugur**: PITR ternyata **aktif** (sejak lama —
> salahku baca path JSON, bukan salah dunianya), dan `serviceAccountName` kedua service ternyata
> **diisi eksplisit**, bukan kosong. Keputusan 2a dengan begitu sudah jadi keadaan dunia, dan tagihan
> sebenarnya berpindah ke **drill pemulihan yang 0×**. Hitungan branch juga kukoreksi: bukan "10 cabang"
> tapi **13 ancestor + 2 unik**. Tidak ada yang dieksekusi di luar pengukuran read-only.
>
> **Update 2026-10-05 02:15 UTC:** F1, F2, F3, F4 **selesai dengan angka** (§8 "Hasil terukur F1–F4").
> Yang paling penting: **E4 jadi hijau**. Setelah `cancel-in-progress: false` cuma terpasang sejak
> kemarin, sekarang ada dua run (#23, #24) yang membuktikan run kedua `pending` 215 s lalu mulai
> **2 s** sesudah yang pertama selesai, tanpa satu pun dibatalkan. Cabang: `ls-remote --heads`
> **16 → 2**, dengan bundle tertanggal dan pemulihan yang **dites**, bukan dijanjikan. Proteksi:
> `strict: true`. SA runtime baru sudah dibuat tapi **belum dipakai apa pun** — F5 (pindah service)
> dan F6 (cabut `editor`) masih terbuka, dan justru itu yang berbahaya.
>
> **Update 2026-10-05 03:02 UTC:** **F5 hijau — E9a terbukti.** Kedua service sekarang berjalan di
> `portfolio-runtime@…`, dan itu dicetak oleh assertion baru di dalam `deploy.yml` (log run #26,
> baris 1058–1060) selain diukur ulang dari `gcloud`: `be-00022-w7f` @100 + `fe-00021-hmv` @100,
> connector utuh, `/api/cv` 774.803 byte `%PDF-`, `logWriter` terbukti. **F8 hijau mekanisme**:
> `watch.yml` sekarang memegang identitas yang **cuma** `roles/run.viewer` dan Watch #4 `rows=17
> merah=0` membacanya langsung dari runner; lima mutasi terhadap stub semuanya berbuah MERAH/KUNING
> (0 false-clean), dan bukti kandangnya terukur dua arah — `update-traffic` + `secrets describe`
> **403** dengan identitas itu, `rc=0` dengan identitasku. Yang **gugur**: `event=schedule` masih 0
> pada 02:59:50 UTC, 2 jam 23 menit lewat cron, `next_run_at=null` — E8 jadi masih 0 dari 7 hari, dan
> dua penyebab umum (repo private, plan tanpa scheduler) sudah kubuang dengan pengukuran. Yang
> **kutahan sendiri**: F6 — setelah F5, `roles/editor` tinggal menempel di dua VM yang berjalan, salah
> satunya ber-scope `cloud-platform`; itu keputusanmu, bukan langkah senyap (opsi A/B/C di §8).

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
| Call gorm tanpa penanganan error | 13 (`main.go:173,179,193,199,209,215,255-267`) — **[status 2026-10-05 08:36 UTC: jadi 0 lewat PR #29. Baris ini kukukur ulang dengan `cmd/audit-ignored` pada `230eff0`, tip `main` saat snapshot ini diambil: `silent_gorm=13` dengan daftar baris yang sama persis, plus `silent_listen=1` di `main.go:249` yang tidak tercatat di baseline — itu yang kemudian jadi rc=0 palsu, lihat §8 langkah (6)]** |
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
di env runtime `portfolio-be` maupun di Secret Manager. Lapis kedua inilah yang ternyata bukan sekadar "mati":
kodenya tetap menghubungi `smtp.gmail.com:587` dengan kredensial kosong dan dapat `530 5.7.0 Authentication
Required` **(jumlahnya terukur di blok langkah (2a)**; lapis pertama **sudah tidak benar sejak 2b** — hitungan
nama berawalan `EMAIL_` di env revisi produksi: **0** pada `portfolio-be-00028-8dc` dan semuanya yang sebelum,
**2** pada `portfolio-be-00029-wpx` yang sekarang melayani 100% traffic).

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
Selesai: E4, E6, E7 hijau dengan log run sebagai bukti. → **Realitanya sebagian:** E6 dan E7
terbukti (lihat §7 P4/P5/P7 + tabel status), **E4 belum** — `cancel-in-progress: false` terpasang dan
`actionlint` bersih, tapi tidak pernah ada dua push berjarak < 60 s yang membuktikan run kedua
`queued`. E4 tidak bisa dibuktikan dengan menulis ulang klaimnya; ia butuh kejadian.

### P5 — Drill rollback (butuh izinmu — menyentuh produksi)
Satu siklus nyata: PR sengaja merusak response health → merge → deploy gagal di smoke → rollback
jalan → verifikasi kedua service kembali ke SHA sebelumnya. Catat: run id, SHA sebelum/sesudah,
`Ready` timestamp, hasil health probe. Ini padanan P5 di Pickertime; tanpa ini E5 tetap merah.
Alternatif tanpa risiko produksi: buat service `portfolio-be-drill` sementara (biaya Cloud Run
mendekati nol, butuh izin bikin resource baru).

### P6 — Jendela observasi (padanan E8 Pickertime)
Workflow `watch.yml` terjadwal harian (`schedule`, jam fix supaya tidak menumpuk):
probe `/api/health`, `/api/certificates`, `/api/cv` via domain publik **dan** run.app, bandingkan
image live dengan SHA HEAD `main` (drift), jalankan tripwire API, hitung branch yang tip-nya layu. Keluaran
satu baris per hari. Kalau gagal → buat issue (butuh izin + scope `issues: write`).
Selesai: 1 baris tercatat per hari; minimal 7 hari berturut-turut sebelum M10 dinyatakan selesai.

**Status 2026-10-04 18:00 UTC:** `watch.yml` hidup di runner dan hijau — run #3 mencetak
`rows=13 merah=0`. Isinya lebih dari rencananya: tiga origin, assertion isi untuk `/` dan `/api/cv`,
vonis drift berbasis `git log --first-parent` + daftar run `deploy.yml`. **Issue otomatis tidak
dibuat** — `issues: write` sengaja tidak dipasang dan itu masih keputusanmu (§6 butir 5). Sisa exit
criterion: 7 hari `schedule` hijau berturut-turut, pertama 2026-10-05 02:37 UTC, tertutup paling
cepat 2026-10-11. Angka lengkap di §7 P6.

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
`AutoMigrate` (`main.go:105`) dengan migration yang berversi *(status: `seedData()` dan otomatisme start
hilang lewat PR #27, tapi "berversi" belum — `-migrate` masih memanggil `AutoMigrate`, bukan migration
file bernomor)*; mengembalikan error gorm yang diabaikan
di 13 titik *(status: **tertutup lewat PR #29** — `cmd/audit-ignored` mengukur 13 → 6 → 0 di `c78cb19` /
`0204b70` / `bf11c2d`, dan `rc=0`-nya sekarang alat, bukan ingatan)*. M10 sengaja dibuat **mendukung** M11:
baseline ratchet §1 menyusut tiap perbaikan.

Urutan yang kuambil: gerbang dulu (permintaanmu), produk setelah — dengan konsekuensi jujur bahwa
situs tetap kehilangan pesan kontak sampai M11 jalan, dan mulai sekarang CI akan **mengingat** itu
lewat file baseline, bukan melupakannya. Konsekuensi itu **berlaku sampai F9 langkah (1) mendarat**
(lihat bloknya di §8): sejak itu pesan pengunjung masuk ke `contact_messages`, dan sejak langkah (3) pesan itu
bisa **dibaca dan dihapus kembali** lewat `GET`/`DELETE /api/admin/contact` ber-JWT — 401 untuk siapa pun tanpa
token, terukur di produksi. Yang tadinya tiga di daftar ini, **tinggal dua**: butir "tidak ada satu pun yang
dikirim ke inbox email" **tertutup 2026-10-06 00:51 UTC** — **2a** (#31) menghentikan *dial buta*, **2b** (#33)
memasang kredensialnya, dan POST pertamamu menghasilkan `email terkirim` yang pertama (SMTP 3,171 s; lihat blok
penutup F9). Yang masih terbuka: **lima dead path admin**, dan **`AutoMigrate` yang belum jadi migration
berversi**. Satu hal ikut tercatat sebagai utang di jalur email dan tidak ikut tertutup: pola fire-and-forget-nya
sendiri (tanpa konteks, tanpa tunggakan, tanpa retry) — sekarang terukur 3,171 s di belakang `201` 28,75 ms.
Dua hal yang tadi di daftar ini sudah
tertutup dan tidak perlu ditebak lagi: **skema tidak lagi dibuat saat start** (PR #27) dan **tidak ada lagi
error gorm atau `r.Run` yang dibuang** (PR #29).

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
| 4 | Runtime SA tanpa `roles/editor` | **Selesai (F4 + F5 + F6).** F5: `spec.template.spec.serviceAccountName` kedua service = `portfolio-runtime@…`, terukur 02:46 UTC lewat assertion `deploy.yml` (log run #26) dan lewat `gcloud`. F6 (opsi B, 04:04 – 04:13 UTC): dua SA khusus VM dipasang (`agentic-watchdog@`, `hermes-openclaw@`) dengan 12 binding — 21 pasangan (SA, binding) — yang semuanya datang dari pengukuran — termasuk satu yang menyelamatkan pipa alert: `agentic-alerts-sub` **tidak punya binding apa pun** dan `consume` hari itu hanya datang dari `editor`. `roles/editor` se-proyek kini **1 pemegang**: `486641216758@cloudservices.gserviceaccount.com`. Downtime swap terukur 79 s dan 40 s (audit `instances.stop`→`start` selesai), cabut `editor` 04:07:56.5 UTC; sesudahnya `/api/health` 200 `{"db":"ok","status":"ok"}`, beranda 40.699 byte (0 `Application error`), `/api/cv` 774.803 byte `%PDF-1.4`, Watch run #6 `success` `rows=17 merah=0`, heartbeat watchdog `pubsubSubscriber=True` 30 s setelah `start` selesai. Yang tersisa di SA compute: `roles/pubsub.publisher` project-level, **dua binding storage tingkat resource** (`objectAdmin` pada `gs://pickertime-pb-backups`, `objectViewer` pada `gs://pickertime-pb-deploys`) dan **`roles/secretmanager.secretAccessor` pada 6 secret** — temuan terakhir ini justru keluar *setelah* cabut, dan itu salahku yang ketahuan (vestigial juga: 0 kunci `USER_MANAGED` di ke-6 SA) — angka lengkap + tiga pembacaan salah yang kukoreksi di §8 bagian F6 |
| 5 | `watch.yml` membuat issue otomatis | **Hold atas keputusanmu (4a), sampai 8 hari baris `schedule` terkumpul.** `issues: write` tetap tidak diberi. Perubahan 2026-10-05: Watch sekarang **bisa** membaca state cloud lewat identitas `github-watch@…` yang cuma memegang `roles/run.viewer` (F8) dan sudah membuktikannya dari runner — Watch #4 `rows=17 merah=0`, Watch #5 `rows=19 merah=0`. Status terukur 02:59:50 UTC: `state=active`, **`next_run_at=null`**, `event=schedule` di repo masih **0**, 2 jam 23 menit lewat cron. Dua penyebab umum kubuang dengan pengukuran: repo `public` dan plan `pro`. Re-check paling cepat 2026-10-12. **KOREKSI 2026-10-07 09:12 UTC — `event=schedule` sudah 3 baris dan `next_run_at=null` tetap null:** #7 `3e0265a` 2026-10-05 09:35:08Z, #8 `03b2876` 2026-10-06 09:23:21Z, #9 `ad767c6` 2026-10-07 09:12:39Z, ketiganya `success`, #9 `rows=17 merah=0` (log run 37599025116, langkah selesai 09:13:22). Jadi kalimat "kemungkinan besar ini yang membuatnya tidak tersulut" di atas adalah **kesalahanku membaca `next_run_at`**, bukan temuan tentang cron: field itu null pada workflow yang terbukti tetap tersulut tiga hari berturut-turut. **KOREKSI ATAS KOREKSINYA (jam yang sama, hari yang sama):** kalimat lanjutanku "cron-nya sekitar 09:xx" juga salah. Cron `watch.yml` adalah `37 2 * * *` (02:37 UTC) di ketiga SHA, dan 09:1x itu adalah **waktu run dibuat** — jadi `schedule` di repo ini tersulut **±6,6 jam setelah cronnya** (6 j 58 m / 6 j 46 m / 6 j 35 m, mengecil ±11 menit per hari). Pengukuranku 02:59:50 UTC itu 22 m 50 s **sesudah** cron dan 6 j 35 m **sebelum** run-nya muncul. Tabel, cara mengukur dan prediksi yang bisa difalsifikasi: §14. **Dan keterlambatan ini bukan sesuatu yang baru kunyatakan: F10 (§8) + A0 (§9.0) sudah menuliskannya 2026-10-06** — jadi kalimat "2 jam 23 menit lewat cron" di atas salah dua kali (salah jam, dan mengabaikan catatan yang sudah ada). Tanggal baca yang sah: **2026-10-13 03:00 UTC** (angka F10), bukan 2026-10-12 yang kutulis di baris ini sebelumnya. Jendela tunggunya tinggal 5 baris `schedule` hijau lagi |
| 6 | `staging`, `chore/bughunter-ci` | **Selesai (F1).** `git ls-remote --heads origin` **16 → 2**: 13 branch yang sudah jadi ancestor `main` (termasuk `staging` `1f2486b`) dihapus bersama `chore/bughunter-ci` `bd38b93` yang isinya dibuang. Sebelum hapus: `porto2-branch-backup-2026-10-05.bundle` (6.768.151 byte, `sha256:85677cee…`) dan pemulihan dites di repo sementara — `staging` kembali ke `1f2486b`, `chore/bughunter-ci` ke `bd38b93`. Yang **kutahan** atas nama keputusanmu: `chore/gerbang-ci` `e3ce49d`, ahead 2 commit (PR #1, isinya sudah tersuperseded oleh PR #2 — 7 file yang disentuhnya semua ADA di `main`, `ci.yml` beda 20 baris). Hitungan "10 cabang" yang kupakai kemarin salah, angka yang benar 13 + 2 |

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
| 17:50:12→17:54:26 | PR #12 merge → `14fe90e`, deploy run #22 | `success`; traffic `be-00018-fsc`/`fe-00017-wqb` @100% |
| 17:55:04 | **Watch run #3** (setelah baris harian ikut dicetak ke stdout) | `success`, **`rows=13 merah=0`** — 12 HIJAU + 1 INFO. `drift\|HIJAU\|run #22 hijau untuk 14fe90e, tidak ada deploy lain di atasnya`, `branch-layu\|INFO\|1 branch layu dari 14 cabang`. Ketiga belas barisnya ada di `DEPLOY.md` |

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

**Sisa P6 — dan ini bukan sesuatu yang bisa diselesaikan dari laptop:** 7 **hari** baris hijau
berturut-turut. Hitungannya per hari kalender, dan yang dihitung hanya baris `schedule` 02:37 UTC;
run #2 dan #3 adalah `workflow_dispatch` di hari yang sama (2026-10-04), jadi keduanya membuktikan
workflow-nya hidup, bukan mengisi jendela. Hari pertama yang sah = **2026-10-05**, jendela tertutup
paling cepat **2026-10-11** kalau tidak ada satu hari pun yang merah. Run merah di tengah jalan
memulai hitungan dari nol — itu memang gunanya kriteria ini.

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
   **Perluasannya terukur 2026-10-06, dan kasus frontend lebih kuat daripada catatan di atas:** merge
   `29757ca` (PR #37) mengubah **nol** file frontend — diff-nya 3 file, semuanya `go-backend/` — tapi
   Deploy #35 tetap melahirkan revisi frontend baru `portfolio-fe-00030-phn` dengan image
   `sha256:ec59a79e…`, berbeda dari `portfolio-fe-00029-zqv` = `sha256:12bd7e2b…` yang dilahirkan Deploy
   #34 dari sumber frontend yang sama persis. Jadi ini bukan cache yang kelewatan satu direktori: setiap
   run deploy membangun ulang **kedua** service dan menghasilkan digest baru untuk konten yang tidak
   berubah. Akibat yang harus diterima: **revisi ≠ versi konten**. Rollback P5 memilih revisi — dan itu
   memang yang dibutuhkannya — tapi tidak ada digest di registry yang bisa dipakai sebagai "versi" yang
   bisa dibandingkan antar-run.
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
| E4 | Cancel tidak meninggalkan deploy setengah jalan | **hijau (mekanisme: `workflow_dispatch` ×2, bukan `push` ×2 — lihat §8 F3)** | 02:00 UTC: dua dispatch berjarak **27 s** pada `main` `b45c298`. Run #23 job `02:00:28→02:04:24` `success`; run #24 `created 02:00:51` tapi **`pending` 215 s** lalu job `02:04:26→02:07:41` `success` — mulai **2 s** sesudah #23 selesai, `cancelled=false` pada keduanya. Artefak live sesudahnya `portfolio-be-00020-vqd=100` / `portfolio-fe-00019-npr=100`, satu revisi baru per run per service, health `{"db":"ok","status":"ok"}` dari domain publik dan `run.app`, `/` 40.699 byte tanpa `Application error`. Varian "dua push dengan konten berbeda" masih belum ter-exercise (kedua run sama SHA) |
| E5 | Rollback pernah dieksekusi dan memulihkan | **hijau** | run #18 langkah 13 `success`, langkah 14 `success`, traffic terukur kembali ke `be-00013-s97`/`fe-00012-947` |
| E6 | Smoke bisa gagal | **hijau** | run #18 `"/api/cv tidak mengembalikan PDF"` pada HTTP 200 — `curl -f` tidak akan melihatnya |
| E7 | Dokumen tidak memicu deploy | **hijau — dua pengukuran** | (1) merge PR #9 (`f218564`, hanya `README.md`/`DEPLOY.md`/`TODO.md`) → `deploy.yml` run count **0** untuk SHA itu, `ci.yml` push run #14 `success`. (2) merge PR #13 (`7d7217b`, juga dokumen saja) → `deploy.yml` **0 run**, `watch.yml` 0 run, `ci.yml` push run #23 `success`, dan `gcloud run services describe` tetap `portfolio-be-00018-fsc` / `portfolio-fe-00017-wqb` @100% — merge dokumen tidak mengubah apa pun yang melayani request. Kontrasnya terukur di hari yang sama: PR #10/#11/#12 yang menyentuh `.github/workflows/**` memicu deploy run #20, #21, #22 — ketiganya `success`. `paths-ignore: ['**.md','docs/**']` + `actionlint` bersih. **(3)–(6) diukur hari ini bersama F6:** merge PR #15 (`b45c298`), #16 (`dfb9147`), #19 (`75b2f3f`) dan #20 (`6281b7f`) — keempatnya dokumen saja — **0 run `Deploy to Cloud Run`** masing-masing (yang jalan hanya `CI`, dan di #19/#18 ada `Watch`). Kontrasnya diukur pada jendela yang sama: `382f0e4` (PR #17) dan `3a88e25` (PR #18) masing-masing **1 run deploy**. Query-nya, supaya bisa diulang: `actions/runs?per_page=100` lalu `select(.head_sha==<SHA merge>) \| select(.name\|test("deploy";"i")) \| length`. **(7)–(10) diukur 2026-10-06:** merge PR #34 (`52fc2e90`, dokumen saja) → **0 run deploy**; merge PR #35 (`9a5d7eda`, dokumen saja) → **1 run = `CI`, 0 deploy**, dan revisi yang melayani tidak berubah (`portfolio-be-00029-wpx` / `portfolio-fe-00028-jlz`). Kontrasnya pada hari yang sama: merge PR #38 (`e99cf67`, `.github/workflows/ci.yml`) → **1 run `Deploy to Cloud Run` (#34)** → revisi baru `portfolio-be-00030-7wc` / `portfolio-fe-00029-zqv`; merge PR #37 (`29757ca`, `go-backend/`) → **1 run deploy (#35)**. Jadi filter jalurnya bekerja dua arah, bukan hanya "dokumen diam". **(11) diukur 2026-10-06 02:40 UTC:** merge PR #39 (`b68183d`, `README.md`+`TODO.md` saja) → **1 run = `CI` #78 `success`, 0 run `Deploy to Cloud Run`**, dan yang melayani tidak berubah (`portfolio-be-00031-xtr` / `portfolio-fe-00030-phn` @100%). Kontrasnya pada jam yang sama: `e99cf67` (ci.yml) dan `29757ca` (go-backend) masing-masing tetap punya 1 run deploy (#34, #35) |
| E8 | Dokumen tidak menyimpang dari realita | **sebagian — 0 dari 7 hari** | koreksi manual pass 1 (16:45) dan pass 2 (16:52) vs keluaran `gcloud`, perintah pembuktinya kini tertulis di `DEPLOY.md`; drift-check **otomatis** hidup di runner dan hijau: Watch #2 `merah=0`, Watch #3 `rows=13 merah=0` dengan `expected 14fe90e` = head. Tapi kedua run itu `workflow_dispatch` di tanggal yang sama — exit criterion-nya 7 **hari** `schedule` hijau berturut-turut, hari pertama sah 2026-10-05, jadi statusnya belum bisa ditutup sebelum 2026-10-11 |

---

## 8. M12 — realisasi keputusan §6 (rencana, ditulis 2026-10-05 01:47 UTC)

Keputusan yang sudah jatuh: **1a** SA runtime khusus · **2a** PITR · **3a** kredensial cloud read-only
untuk Watch · **4a** *hold* `issues: write` sampai 8 hari · **5** hapus branch layu + `staging`,
`chore/bughunter-ci` dibuang · **6b** kontak masuk DB **dan** dikirim email · **7** urutan M11 ikut
rekomendasiku · **8** `strict: true` · **9a** provokasi E4.

Aturan mainnya tidak berubah dari M10: setiap fase ditutup dengan **angka keluaran alat**, setiap
perubahan cloud masuk lewat **PR ke `main`** (bukan push langsung, bukan `workflow_dispatch` di branch
lepas), dan tidak ada nilai secret yang kubaca atau kucetak.

### F0 — Baseline (semuanya terukur 2026-10-05 01:47 UTC, read-only)

| Aspek | Angka |
|---|---|
| `origin/main` | `c78c8ae`; PR terbuka = **0** |
| Yang melayani request | `portfolio-be-00018-fsc=100%`, `portfolio-fe-00017-wqb=100%`, `Ready=True` keduanya; image be digest `sha256:074584ae0a96…` |
| SA runtime | `486641216758-compute@developer.gserviceaccount.com` — **di-set eksplisit** di kedua service (lihat K2) |
| Binding principal itu | `roles/editor` se-proyek (satu binding bersama `486641216758@cloudservices.gserviceaccount.com`), `roles/pubsub.publisher` se-proyek |
| Env backend | `ADMIN_USER` literal; `DATABASE_URL`→`portfolio-database-url`, `JWT_SECRET`→`portfolio-jwt-secret`, `ADMIN_PASS`→`portfolio-admin-pass`, `ADMIN_EMAIL`→`portfolio-admin-email`, `CORS_ORIGINS`→`portfolio-cors-origins` = **5 secret** |
| Env frontend | `BACKEND_URL` literal = **0 secret** |
| Jalur ke DB | `ipAddresses: PRIVATE 10.112.0.2`, **tidak ada** volume `cloudsql`, anotasi `vpc-access-connector=portfolio-connector` + `vpc-access-egress=all-traffic` → **`roles/cloudsql.client` tidak dibutuhkan SA runtime** |
| VPC connector | `portfolio-connector`: `e2-micro`, min 2 / max 3, `state=READY`, `10.10.0.0/28`, network `default`, `scheduler.serviceAccountEmail` **kosong** → VM connector jalan sebagai default compute SA = principal yang sama yang mau dicabut `editor`-nya. Ini blast radius F6, bukan tebakanku |
| PITR | **AKTIF** (lihat K1): `pointInTimeRecoveryEnabled=true`, `replicationLogArchivingEnabled=true`, `transactionLogRetentionDays=7`, `retainedBackups=7`, jendela backup `03:00`, `ENTERPRISE`, tier `db-f1-micro`, `state=RUNNABLE` |
| Branch | `git ls-remote --heads origin` = **16 heads**; non-main **15**; yang murni ancestor `main` (ahead 0) = **13**; yang punya commit unik = **2** |
| Branch protection `main` | `contexts=["go","web","api"]`, **`strict=false`**, `enforce_admins=true`, `allow_force_pushes=false`, `allow_deletions=false` |
| WIF | pool `github-pool` (nomor projek `486641216758`), provider `github-provider` + `pickertime-provider`, keduanya `ACTIVE`. `attributeMapping` = `actor`, `ref`, `repository`, `google.subject=assertion.sub` → **tidak ada `attribute.sub` maupun `attribute.environment`**, jadi binding baru hanya bisa sehalus `attribute.repository/ArkanFzi/website-porto2` (lihat konsekuensi F8) |
| Binding WIF `github-cd` | `roles/iam.workloadIdentityUser` di-level **SA**, member `principalSet://…/attribute.repository/ArkanFzi/website-porto2`; `roles/secretmanager.secretAccessor` + `run.admin` + `artifactregistry.writer` + `cloudsql.client` + `iam.serviceAccountUser` di-level projek |
| Environment GHA | **0** (`GET /repos/…/environments` mengembalikan list kosong) — `deploy.yml` tidak pakai `environment:` |
| Watch | workflow id `374751227`, 3 run: `#1 failure`, `#2 success`, `#3 success` — semuanya `workflow_dispatch`. Run `event=schedule` di repo = **0**. Jam pengukuran 01:47 UTC, cron `37 2 * * *` → hari pertama E8 **belum jatuh tempo** (±50 menit lagi), bukan rusak |
| Deploy | run #19–#22 `success`, semua `event=push` |

### K — Tiga klaimku sendiri yang gagal diukur ulang

| # | Klaim lama | Realita 2026-10-05 | Sebab |
|---|---|---|---|
| **K1** | "PITR **mati**; `pointInTimeRecoveryEnabled` absent" (dicatat 2026-10-04, jadi bahan keputusan 2a) | PITR **aktif penuh** | Aku membaca path JSON yang salah: `.settings.backupConfiguration.settings.pointInTimeRecoveryEnabled` (tidak ada) → keluaran `"absent"`. Path benar `.settings.backupConfiguration.pointInTimeRecoveryEnabled` → `true`. Bukti dua-duanya dijalankan berdampingan hari ini dan hanya bedanya `settings` di tengah. Kesalahan klasnya sama dengan yang kutulis di §7 "Catatan jujur" #6: **alat yang kupakai bukan verifikasi** |
| **K2** | "`spec.template.spec.serviceAccountName` **kosong** → default compute SA" (`DEPLOY.md` §Postur IAM) | Field itu **diisi eksplisit** dengan `486641216758-compute@developer.gserviceaccount.com` di kedua service | Kalimat itu kutulis sendiri kemarin tanpa `jq` pada field tersebut. Kabar baiknya: F5 tinggal mengganti satu field bernama, bukan menambang default |
| **K3** | "(1) tabel `contact_messages` … **sekaligus menutup `main.go:173` yang membuang error gorm**" (baris F9, ditulis 01:47 UTC) | Di `c78cb19` baris 173 adalah `DB.Order("created_at desc").Find(&certs)` — punyanya `/api/certificates`. Stub kontak lama (`main.go:233-248`) tidak punya satu panggilan DB pun: bind, lalu `go func()` pengirim email. Yang ditutup (1) dari 13 titik itu: **0**; yang di 173 baru tertutup di (6) lewat #29 | Kutulis angka baris dari berkas yang sudah bergerak, tanpa `git show` ke commit baseline. Sekarang `cmd/audit-ignored` yang memegang hitungan, dan dia tidak bisa salah tempel karena dia membaca AST pada commit yang kusebut — angka 13 itu keluar dari `git archive c78cb19` hari ini, bukan dari ingatanku |

Konsekuensi keputusan: **2a sudah jadi keadaan dunia**, jadi yang benar-benar tertagih bukan "aktifkan
PITR" tapi **"pemulihan belum pernah terbukti"** — 0× restore drill. Itu pindah menjadi F7.

### Fase

Urutannya punya satu sebab: F1–F3 murah dan tidak menyentuh cloud; F3 sengaja dikerjakan **sebelum**
fase SA supaya serialisasi terbukti saat tidak ada hal lain yang berubah; F4→F5→F6 wajib berurutan
karena F6 satu-satunya yang efeknya bisa melebar; F7 dan F8 berdiri sendiri; F9 paling besar dan
memakai alat yang baru valid setelah F8.

| Fase | Isi | Exit criterion (angka, bukan narasi) | Risiko & jalan balik |
|---|---|---|---|
| **F1** (keputusan 5) | Simpan `git bundle` semua branch non-main + catat 15 tip SHA. Lalu `git push origin --delete` untuk **13** ancestor + `chore/bughunter-ci` (buang). Koreksi hitunganku yang lama: "10 cabang" salah, yang benar **13 ancestor + 2 unik** | `git ls-remote --heads origin \| wc -l` turun dari **16 → 2**; `sha256sum` bundle tercatat; 0 branch layu di baris Watch berikutnya | Tidak bisa dibatalkan sendiri → karena itu bundle **sebelum** delete; isi `chore/bughunter-ci` = 48 baris `ci.yml` untuk `bugfix/*`, tidak ada file lain yang tersentuh, jadi jalan balik = `git push` dari bundle |
| **F1b** | **Masih butuh satu kata darimu:** `chore/gerbang-ci` (tip `e3ce49d`, ahead **2**) | — | Kutebus bukan diam-diam. Ukurannya: 7 file yang disentuh kedua commit itu **semuanya ADA di `main`**, dan `ci.yml` cabangnya beda **20 baris** dengan `ci.yml` main — artinya isinya sudah tersuperseded oleh PR #2, yang hilang cuma riwayat commit-nya. Kalau kamu bilang hapus → ikut F1; kalau bilang simpan → tetap tinggal dan Watch menghitungnya sebagai unik |
| **F2** (keputusan 8) | `PUT /repos/…/branches/main/protection` dengan body yang sama, `strict: true`. Simpan JSON proteksi sebelum/sesudah | `GET …/branches/main/protection` → `"strict": true`, `contexts` tetap `["go","web","api"]`, `enforce_admins` tetap `true`. Efeknya dites di F3: merge tetap mungkin | 1 API call, balik dengan 1 API call. Konsekuensi yang harus diterima: PR wajib di-rebase ke head `main` sebelum merge (itu memang tujuannya) |
| **F3** (keputusan 9a) | Dua PR **non-dokumen** yang digabung berjarak < 60 s. Isinya sengaja inert: `tools/ci/probe-e4-a.txt` dan `tools/ci/probe-e4-b.txt` (`.md` tidak boleh — `paths-ignore` akan membuat keduanya 0 run) | **E4**: poll langsung sesudah merge kedua → run deploy #N+1 berstatus `queued`/`in_progress` **saat** #N masih `in_progress`; #N **tidak** `cancelled` (conclusion `success`); sesudah keduanya selesai, digest image live == digest hasil build HEAD, kedua service `Ready`; 2 deploy × ±4 menit tercatat di log. File probe dihapus di PR F5 | Kalau `cancel-in-progress` ternyata salah, kerusakannya = deploy yang terpotong, dan F5 punya rollback teruji untuk itu. Tidak ada perubahan kode aplikasi |
| **F4** (1a langkah 1) | Bikin `portfolio-runtime@config-agentic-ubuntu.iam.gserviceaccount.com`; grant `roles/artifactregistry.reader`, `roles/logging.logWriter`, `roles/monitoring.metricWriter` (projek) + `roles/secretmanager.secretAccessor` **per-secret** pada 5 `portfolio-*` (bukan se-proyek). **Tidak menyentuh service** | `gcloud iam service-accounts list --filter portfolio-runtime` → 1 baris; `gcloud secrets get-iam-policy portfolio-<5 nama>` → SA di member `secretAccessor` untuk **5/5**; binding projek menunjukkan 3 role itu. Efek produksi: **0** | Reversible per-binding (`remove-iam-policy-binding`), dan belum ada yang memakainya |
| **F5** (1a langkah 2) | Ubah `deploy.yml`: `--service-account=portfolio-runtime@…` untuk kedua service (FE hanya butuh reader+logWriter — gemuk tapi aman kalau role sama dipakai dua-duanya). Masuk sebagai PR, lewat gerbang + deploy + verifikasi smoke | **E9a**: `gcloud run services describe … --format=value(spec.template.spec.serviceAccountName)` = `portfolio-runtime@…` untuk **be dan fe**; `/api/health` `.db=="ok"` lewat domain publik **dan** lewat URL `run.app`; `connector state=READY`; `gcloud logging read` menampilkan entri **baru** dari kedua service (bukti `logWriter`, karena ini yang gagal secara senyap) | Kalau role kurang, revisi tidak pernah `Ready` → deploy `failure` → rollback otomatis `update-traffic` ke revisi lama yang masih di SA lama → service pulih. Jalan balik manual: revert PR. File probe F3 dibersihkan di PR yang sama |
| **F6** (1a langkah 3) | Cabut `roles/editor` dari `486641216758-compute@developer.gserviceaccount.com`. **`pubsub.publisher` dibiarkan** (belum terukur siapa penerbitnya — dicatat sebagai hutang, bukan dihapus diam-diam) | **E9b**: `get-iam-policy` → member `roles/editor` hanya `…@cloudservices.gserviceaccount.com` (milik Google); 0 service Cloud Run di projek yang masih memakai SA compute (diukur `run services list --format=value(name,spec.template.spec.serviceAccountName)`); `connector state=READY`; `/api/health` tetap `.db=="ok"`; baris Watch besok hijau | Yang paling lebar di M12. Reversible dalam 1 perintah (`add-iam-policy-binding`), dan itu memang rencananya kalau connector atau logging merah. Jangan digabung dengan F5 dalam satu PR — kalau keduanya merah, tidak terbaca mana yang bersalah |
| **F7** (2a, hasil K1) | **Drill pemulihan**: clone `portfolio-pg` ke titik waktu (`gcloud sql instances clone --restore-from-timestamp=…`, nama flag dikukuhkan dari `--help` dulu, tidak ditebak), ukur, lalu hapus clone-nya | **E10**: clone `state=RUNNABLE` + tier + `ipAddresses` tercatat; **RTO** = delta menit antara perintah dan `RUNNABLE` diukur; clone dihapus (`instances list` kembali 1 baris). Yang **tidak** dibuktikan, kutulis apa adanya: isi row tidak bisa dibaca dari laptop (DB hanya `PRIVATE 10.112.0.2`), jadi "data-nya kembali benar" masih 0× sampai ada jalur baca sementara di dalam VPC | Resource berbayar baru (±`db-f1-micro`) yang hidup beberapa menit lalu kuhapus. **Butuh "ya" terakhirmu** karena create + delete resource, meski 2a sudah kamu setujui dalam bentuk lain |
| **F8** (keputusan 3a) | Bikin `github-watch@…`, grant **hanya** `roles/run.viewer`; binding `iam.workloadIdentityUser` di SA itu dengan `principalSet://…/attribute.repository/ArkanFzi/website-porto2` (satu-satunya granularitas yang tersedia — provider tidak memetakan `sub`/`environment`). Di `watch.yml`: `id-token: write`, `auth@v2` ke SA itu, lalu invariant traffic: **100% pada revisi `Ready` terbaru; kalau tidak → MERAH dengan nama revisi yang ter-pin; kalau kredensial/cloud tidak terbaca → KUNING** (bukan diam-diam bersih) | **E11**: satu run ber-`event=schedule` yang baris hariannya memuat `traffic\|HIJAU\|be-00018-fsc=100 / fe-00017-wqb=100` dan **log-nya membuktikan ia membaca state cloud** (bukan hanya repo). Negatifnya (opsional, lihat daftar butuh-izin): pin traffic ke revisi lama ±2 menit → Watch harus MERAH sendiri keesokan harinya, lalu lepas | Yang bocor kalau salah: **read-only** (`run.viewer`) — dan granularitasnya persis sama dengan binding `github-cd` yang sudah ada hari ini, jadi permukaan baru yang ditambahkan nyaris nol: menambah identitas *lebih kecil* di bentuk yang sudah dipakai identitas *lebih besar*. Hutang yang sengaja ditinggalkan: memperketat ke `attribute.environment` menuntut edit `attributeMapping` pada provider yang dipakai CD produksi — tidak kulakukan di fase ini |
| **F9** (6b + 7) | M11 urutanku: (1) tabel `contact_messages` + POST `/api/contact` menulis (sekaligus menutup `main.go:173` yang membuang error gorm); (2) email via gomail; (3) rute admin `POST /api/auth/login`, `GET/DELETE /api/admin/contact` ber-JWT; (4) buang hardcode `http://localhost:8080` di `cv-layout`; (5) hapus `seedData()` + `AutoMigrate` saat start; (6) tutup 13 error gorm yang diabaikan. Satu sub-langkah = satu PR *(catatan (6): yang kucocok di jalur itu 6 `Find`/`Create`/`Delete` + 1 `r.Run`; tujuh lainnya sudah lenyap di (5) — dan lenyapnya karena `seedData()` dihapus, bukan karena errornya ditutup)* | **E13**: jumlah path mati di `tools/ci/api-baseline.json` **turun dari 13** dan `api-contract-check.mjs` tetap `rc=0`; 1 POST dari situs publik → **terhitung** lewat `GET /api/admin/contact` (count +1, dan **401 tanpa JWT**); email: 1 log run membuktikan SMTP menerima (hanya setelah kredensial ada); `go vet`+gofmt bersih; endpoint admin tidak menambah secret yang terbaca CI | Semua lewat gerbang yang sudah terbukti. (2) **terblokir padamu** (lihat di bawah) *(tidak lagi sejak 2b: kredensial ada, tinggal satu POST — lihat status 15:20 UTC di sel ini)*. Rute admin = permukaan baru di internet: tanpa JWT tidak ada satu pun rute admin yang boleh 200, dan itu kukunci di job `api`, bukan di narasi. **Status 2026-10-05, 08:36 UTC:** (1) #22, (3) #24, (4) #25, (5) #27, (6) #29 sudah mendarat — path mati tetap **9** (`(5)` dan `(6)` tidak menyentuh frontend), error gorm yang dibuang **13 → 6 → 0** dan `r.Run` **1 → 0** diukur `cmd/audit-ignored` di `c78cb19`/`0204b70`/`bf11c2d`; job `api` 12 → **14** langkah; (2) masih terblokir kredensial. **Status 2026-10-05, 14:12 UTC:** (2a) mendarat
lewat #31 → merge `89adbfb` → CI #60 + Deploy #32 hijau → revisi `portfolio-be-00028-8dc`. Yang terblokir
kredensial tinggal (2b): **tanpa** `EMAIL_*` jalur email sekarang berhenti sebelum socket SMTP dibuka, dan CI
menuntut hal itu dengan angka (lihat blok (2a) di bawah). **Status 2026-10-05, 15:20 UTC:** (2b) mendarat —
kedua secret ada versi 1 `enabled` + `secretAccessor` untuk `portfolio-runtime@`, `deploy.yml:117` menerima
dua pasangan, `1850577c` → PR **#33** → `go`/`api`/`web`/GitGuardian `success` → merge `95f91647` → **CI #64** +
**Deploy #33** hijau (4 m 24 s) → **`portfolio-be-00029-wpx`** @100% dengan **8** entri env, 2 di antaranya
`EMAIL_`. Klausa email E13 **masih terbuka**: kredensial sudah sampai ke proses, tapi satu-satunya pemicu jalur
kirim adalah POST dari situs publik, dan itu aksi yang tersisa di tanganmu (blok (2b) + batasnya di bawah).
**Status 2026-10-06, 00:51 UTC:** POST pertamamu menutup klausa email — `terkirim`=**1**, `dilewati`=0,
`gagal kirim`=0, SMTP **3,171 s** berjalan di belakang `201` 28,75 ms. Dari tujuh klausa E13, enam hijau;
yang tinggal satu adalah **count +1** di `GET /api/admin/contact`, dan itu hanya bisa diukur dari login-mu. **Koreksi pada rencanaku sendiri di baris ini:** yang kutulis "(1) sekaligus menutup `main.go:173` yang membuang error gorm" itu salah tempel. Di `c78cb19` baris 173 adalah `DB.Order("created_at desc").Find(&certs)` milik `/api/certificates`, sedangkan stub kontak lama (`main.go:233-248`) sama sekali tidak menyentuh DB — bind, lalu `go func()` pengirim email. Jadi (1) tidak menutup apa pun dari 13 itu, dan `Find` di 173 baru tertutup di (6) lewat #29. **Status 2026-10-06, 01:48 UTC:** dua turunan rekap sudah mendarat dengan PR sendiri — opsi 1 GitGuardian (#38 → `e99cf67`, `go`/`api`/`web`/GitGuardian **success**, Deploy #34) dan `Reply-To` (#37 → `29757ca`, 4 test mailer PASS, Deploy #35). Klausa E13 tidak bergerak oleh keduanya: tetap **enam hijau**, dan yang tersisa tetap **count +1** yang cuma bisa diukur dari login-mu |
| **F10** (4a) | *Hold* — `issues: write` **tidak** dipasang. Tidak ada kerja; hanya dicatat supaya tidak membusuk jadi keputusan yang tidak pernah diambil | Re-check paling cepat **2026-10-13 03:00 UTC** — **tanggal ini dikoreksi dari 2026-10-12 02:37 UTC karena satu pengukuran**: `cron: "37 2 * * *"` di `watch.yml` menghasilkan **1** baris `event=schedule` dari **7** run seluruhnya, dan yang satu itu (`#7`, `created_at=2026-10-05T09:35:08Z`) datang **6 jam 58 menit** setelah menit cron-nya. Jendela "8 fire" yang dihitung dari jam cron akan meleset sebesar keterlambatan yang sudah terbukti itu; 13-10 03:00 UTC memberi margin satu hari penuh. Syarat tidak berubah: ≥8 baris `event=schedule` dan 0 MERAH. Kalau ada MERAH sebelumnya, hold menang dan alarm tetap run merah. **Dan kalau jumlahnya tetap ≤2 sampai 2026-10-13, kesimpulannya bukan "tunda" lagi:** cron-nya memang tidak dapat diandalkan, F10 dihapus dari daftar, alarm tetap merah | nol |

### Yang masih butuh darimu

1. **Email: SUDAH HIDUP, dan sudah terbukti sampai.** kredensial terpasang lewat #33, dan POST pertamamu
   (2026-10-06 00:51 UTC) menghasilkan `contact 4e8d174a-…: email terkirim ke muhammadarkanfauzi9@gmail.com`
   — klausa email E13 hijau. Yang tersisa dari butir ini tinggal dua, dan keduanya butuh login-mu:
   **(a)** buka `/admin/dashboard`, pastikan pesan itu **terhitung** di `GET /api/admin/contact` (klausa
   count +1 E13 — satu-satunya klausa F9 yang belum punya angka), dan **(b)** hapus baris probe
   `b693e544-3001-…` plus 5 baris seed warisan (§8 butir a dan d). Aku tidak bisa melakukan keduanya:
   `DELETE /api/admin/contact/:id` butuh JWT, JWT butuh `ADMIN_PASS`, dan itu secret yang tidak kubaca.
   **Satu keputusan baru yang keluar dari pesan yang sampai — sudah dikerjakan.** Notifikasi tidak punya
   `Reply-To`, jadi tombol Balas di Gmail membalas ke dirimu sendiri, bukan ke pengunjung. #37
   (`29757ca`) memasangnya, dengan gerbang `mail.ParseAddress` di dalam paket. Yang belum terbukti:
   header itu pada pesan yang benar-benar datang, dan itu butuh satu POST lagi ke form publik — lihat
   blok "Reply-To" di §M12.
2. **`chore/gerbang-ci`** — hapus atau simpan (ukurannya sudah di F1b).
3. **"ya" terakhir untuk F7** (create + delete clone berbayar) dan, kalau kau mau bukti negatif E11,
   **untuk drill pin-traffic** di F8 — itu menyentuh traffic produksi kelasnya dengan P5 yang sudah kamu izinkan.
4. **F6 — sudah jalan (opsi B), tinggal tiga keputusan yang bukan aku yang harus ambil.**
   **(a)** Prune: grant pubsub kupasang ke kedua SA VM karena konsumennya tidak terattribusi; salah
   satunya hampir pasti mati. Melepas yang inert butuh seminggu pengamatan (audit + heartbeat), dan
   melepas yang salah = mematikan jalur alert — jadi aku perlu katamu: tunggu seminggu, atau kamu tahu
   VM mana yang menyedot `agentic-alerts-sub` dan aku prune sekarang? **(b)** `roles/pubsub.publisher`
   project-level pada SA compute sekarang vestigial (0 kunci `USER_MANAGED`, tidak ada VM yang memakainya);
   cabut sekalian, atau biarkan sebagai jaring VM baru yang lupa `--service-account`?
   **(c)** Yang paling berat dan baru keluar setelah cabut: SA compute itu masih memegang
   **`roles/secretmanager.secretAccessor` pada 6 secret** (di antaranya `portfolio-database-url`,
   `portfolio-admin-pass`, `gog-keyring-password`) **plus 2 binding storage**. Aku sengaja **tidak**
   memindahkan dan **tidak** mencabutnya: tidak dipindahkan karena tidak ada bukti ada skrip VM yang
   masih membacanya, tidak dicabut karena kegagalannya senyap (Data Access logging mati). Kalau kamu
   bilang cabut, aku jalankan dan ukur; kalau kamu bilang amankan dulu, satu-satunya jalan yang jujur
   adalah menghidupkan logging pembacaan secret selama seminggu.

5. **GitGuardian: satu keputusan kebijakan, bukan satu bug.** Dua insiden lama ternyata nyata dan punya commit
   (`98a7057` 15:32:39 UTC, `4c5e6d0` 06:02:28 UTC), keduanya `failure`, dan **merge tetap jalan** karena
   required contexts cuma `["go","web","api"]`. Tidak ada kredensial sungguhan yang bocor (rinciannya di blok
   investigasi), tapi bentuk keputusannya: **(1)** buat string tes di `ci.yml:336` berhenti berbentuk kredensial
   — kecil, lokal, bisa kuerjakan sekarang; atau **(2)** masukkan `GitGuardian Security Checks` ke required
   contexts — merah benar-benar memblokir, tapi false positive ikut memblokir semua PR. Aku tidak memilih
   sendiri karena (2) mengubah kebijakan merge semua orang.

   **Status 2026-10-06 01:48 UTC: (1) sudah dikerjakan dan terbukti** (`20c16ea` → PR #38 → `e99cf67`,
   GitGuardian `success`; dua baris `ci.yml` yang berbentuk kredensial sudah hilang, `grep` = 0).
   **(2) masih keputusanmu, tapi sekarang berangka:** dari rangkaian itu terukur bahwa temuan GitGuardian
   menempel pada **riwayat commit PR**, bukan isi akhir — komentar yang salah bentuk tidak bisa dibersihkan
   oleh commit susulan (`ed0aee6` tetap merah karena `9e49a14`). Kalau (2) dipasang, PR seperti #36 hanya
   bisa keluar dengan branch baru, karena rewrite history + force-push tidak ada di daftar yang boleh kulakukan.

**Butiran baru yang keluar setelah F9 langkah (1) mendarat — rate limit `POST /api/contact`.** Endpoint ini
sekarang adalah **tulis DB tanpa autentikasi** yang terbuka di internet. Tiga pilihan yang kubaca: **(i)**
batas per IP di middleware gin — murah dan nyata, tapi in-memory jadi hilang saat scale-to-zero; **(ii)**
honeypot di form — nol infra, tapi tidak menolak bot yang serius; **(iii)** terima dulu dan pantau jumlah baris
seminggu — nol kode, tagihannya Cloud SQL. Aku sengaja tidak memilih sendiri, dan ini bukan kekurangan ide:
sebelumnya endpoint ini *tidak bisa* ditumpahi spam karena dia tidak menulis apa pun, dan sejak pagi itu bisa.
Nomor ini kutaruh di sini, bukan di dalam daftar di atas, karena tidak ada satu pun butir 1–4 yang berubah
olehnya.

**Lima butir yang keluar setelah F9 langkah (3), (4), (5) dan (6) mendarat.** **(a)** Klausa E13 "count +1 lewat
`GET /api/admin/contact`" sudah hijau di CI dengan Postgres nyata tapi belum kukur di produksi, dan satu-satunya
yang menghalangi adalah kredensial admin produksi: nilainya ada di Secret Manager, yang tidak pernah kubaca, dan
Cloud SQL-nya `PRIVATE` tanpa IP publik (`portfolio-pg`, `10.112.0.2`) sehingga tidak ada jalur sah dari laptop.
Kamu bisa menutupnya dua cara: login ke dashboard sendiri (dan sekaligus menghapus baris probe
`b693e544-3001-…` yang kutinggalkan), atau memutuskan bahwa angka produksi memang tidak perlu diukur dari
laptop. **(b)** Cangkang halaman `/admin/dashboard` menjawab **200** publik — tanpa isi, karena datanya datang
dari API yang sudah 401 — dan token admin disimpan di `localStorage`, yang terbaca oleh XSS. Aku tidak
mengubahnya (di luar F9), tapi ini bukan berarti "sudah aman": ini keputusan yang belum diambil. **(c)** CV
yang diunduh publik ternyata ikut berubah oleh langkah (4) (+9.093 byte, tiga sertifikasi masuk); kalau itu
perubahan yang kamu tidak inginkan muncul sekarang, jalan paling murah bukan menghapus kode — cukup
`update-traffic` ke revisi `portfolio-fe-00023-g7s`, yang masih utuh. **(d)** Produksi hari ini menyajikan
lima baris fiktif warisan `seedData()` — tiga sertifikat ("AWS Solutions Architect", "Advanced React
Patterns", "Full-Stack Design") dan dua pengalaman ("TechNova Solutions", "Digital Artisan"), semuanya
ber-`createdAt` pada detik yang sama dengan sebaran **41 ms**. Langkah (5) menutup jalan masuknya, tidak
menghapus isinya; yang menghapus tinggal kamu, lewat dua `DELETE` admin (butuh token login-mu) atau lewat
Cloud SQL. **(e)** Keluar dari (6), dan ini keputusan bentuk jawaban, bukan bentuk bug: `GET
/api/certificates` dan `/api/experience` sekarang **boleh** menjawab 500, dan frontend menerjemahkannya jadi
daftar kosong (`r.ok ? r.json() : []`, terukur 5 dari 5 rantai fetch di tiga berkas pemakai). Sebelum (6) yang
dapat pengunjung adalah 200 dengan `null` — jadi pilihan hari ini bukan "rusak vs utuh", tapi **kosong tanpa
petunjuk vs kosong dengan petunjuk**. Menambah banner "data sedang tidak tersedia" itu pekerjaan frontend dan
bukan bagian F9; yang kuperlukan darimu cuma keputusannya: biarkan diam, atau minta tandai. Aku tidak akan
mengetahuinya lewat uji — satu-satunya cara memicunya adalah mematikan DB produksi, dan itu tidak kulakukan.

### Hasil terukur F1–F4 (2026-10-05, 01:55 – 02:12 UTC)

Urutan yang jalan: F1 → F2 → F3 → F4. F3 didahulukan dari F4 karena butuh `deploy.yml` kosong
perubahan lain supaya serialisasinya terbaca bersih.

**F1 — branch.** Bundle dibuat **lebih dulu**: `porto2-branch-backup-2026-10-05.bundle`, 6.768.151
byte, `sha256:85677cee…f9be28a`, `git bundle verify` → *"The bundle records a complete history"*,
16 ref. Jalan baliknya tidak diklaim, dites: di repo bare sementara, `staging` pulih ke `1f2486b`
dan `chore/bughunter-ci` ke `bd38b93` — persis SHA yang dicatat sebelum hapus.
`git push origin --delete` untuk **14** ref (13 ancestor `main` + `chore/bughunter-ci` yang dibuang).
`git ls-remote --heads origin`: **16 → 2** (`main` `b45c298` + `chore/gerbang-ci` yang kutahan
karena ahead 2). Koreksi hitungan lama: yang aman dihapus **13 ancestor**, bukan "10 cabang".

Satu kesalahan urutan yang kuperbaiki di tengah jalan: perintah bundle pertama **tidak pernah
selesai** — `git checkout main` menolak karena `TODO.md` masih ada perubahan belum ter-commit, dan
seluruh rantai `&&` berhenti di situ. Aku sempat menulis "14 ref terhapus, heads = 2" sebelum
mengukurnya; realitanya saat itu heads masih 17 dan bundle belum ada. Angka di atas semua hasil
pengukuran ulang setelahnya, dan kalimatku yang mendahului pengukuran itu kutandai di sini supaya
tidak menyamar sebagai bukti.

**F2 — `strict: true` (E14 hijau).** Sebelum/sesudah, satu field yang berubah:

| | `strict` | `contexts` | `enforce_admins` | `approvals` | force-push | delete |
|---|---|---|---|---|---|---|
| sebelum | `false` | `["go","web","api"]` | `true` | `0` | `false` | `false` |
| sesudah | **`true`** | `["go","web","api"]` | `true` | `0` | `false` | `false` |

Dua hal yang saya tidak duga dan sekarang tercatat di `DEPLOY.md`: `PUT /branches/main/protection`
pada repo personal menuntut key `restrictions` tapi menolak isi `users`/`teams` (jalan buntu), dan
penyebab 422 sebenarnya `dismissal_restrictions` yang kutempel sendiri; sementara endpoint sempit
`PUT …/protection/required_status_checks` **404** walau `GET` pada path yang sama **200**.

**F3 — E4 hijau, dengan mekanisme yang berbeda dari rencana.** Rencananya "dua push berjarak < 60 s".
Yang kukerjakan: **dua `workflow_dispatch` pada `main` berjarak 27 s** — karena `strict: true` baru
saja dipasang, dua PR beruntun akan memaksa PR kedua rebase + menunggu CI (~4 menit) sebelum boleh
di-merge, dan celah 4 menit itu justru keluar dari jendela yang diuji. `deploy.yml` sudah punya
`workflow_dispatch` dan trigger itu membaca file dari branch yang dipilih, jadi serialisasi yang
diuji kelompok `concurrency` -nya identik.

| | run #23 | run #24 |
|---|---|---|
| `created_at` | 02:00:24 | **02:00:51 (+27 s)** |
| job `deploy` mulai | 02:00:28 | **02:04:26** |
| job selesai | 02:04:24 | 02:07:41 |
| conclusion | `success` | `success` |
| `cancelled` | **`false`** | **`false`** |
| langkah dijalankan | 17 | 17 |

Run #24 tercatat `pending` selama **215 s** (02:00:51 → 02:04:26) dan mulai **2 s** setelah job #23
selesai: tepat perilaku `cancel-in-progress: false` yang dijanjikan. #23 tidak pernah `cancelled` —
dan ini yang membedakan dari run #13 (diduga dibatalkan di batas deploy) yang jadi alasan E4 ditulis.
Rantai artefak ikut terukur, bukan disimpulkan: sebelum `be-00018-fsc`/`fe-00017-wqb`; sesudah
**`portfolio-be-00020-vqd=100`** (digest `sha256:9af65fd…`) dan **`portfolio-fe-00019-npr=100`**
(digest `sha256:ee8c019…`). Setiap service menambah **satu** revisi per run (be: 00019 `sha256:255d7d4…`
lalu 00020 `sha256:9af65fd…`) — dua run, dua revisi, tidak ada yang setengah jalan. Digest berbeda
untuk tree yang sama (kedua run memakai SHA `b45c298`) mengonfirmasi ulang catatan "build tidak
reproducible" di §7: digest mengikat revisi ke satu run, bukan ke konten.
Verifikasi pasca-deploy: `{"db":"ok","status":"ok"}` dari domain publik **dan** dari URL `run.app`,
halaman `/` 40.699 byte, `Application error` muncul **0** kali.

Yang **tidak** terbukti oleh bentuk tes ini, kutulis supaya tidak menyesatkan: kedua run punya
`head_sha` sama, jadi kasus "run kedua queue padahal membawa konten yang lebih baru" tidak
ter exercised. Invarian yang diuji (serialisasi + tidak ada pembatalan + artefak live = hasil run
terakhir) sudah terbukti; varian push-dua-konten akan tercatat sendiri kalau terjadi.

Bonus E7 pengukuran keempat: merge PR #15 (dokumen saja) → `main = b45c298` → **0 run `deploy.yml`**
untuk SHA itu, `ci.yml` `push` jalan.

**F4 — SA runtime (E9-pre hijau, efek produksi 0).** `portfolio-runtime@config-agentic-ubuntu.iam.gserviceaccount.com`
(`uniqueId 115631008968905750981`, tidak disabled). Yang terpasang, dibaca ulang satu per satu:

| Grant | Cakupan | Terbukti |
|---|---|---|
| `roles/artifactregistry.reader` | **repo AR `portfolio-app` saja**, bukan se-proyek | `artifacts repositories get-iam-policy` → 1 member |
| `roles/logging.logWriter` | project | ada di `projects get-iam-policy` |
| `roles/monitoring.metricWriter` | project | ada di `projects get-iam-policy` |
| `roles/secretmanager.secretAccessor` | **per-secret**, 5 secret `portfolio-*` | 5 / 5 |

Yang **tidak** dimilikinya, diukur sebagai peniadaan (bukan diasumsikan): `editor`, `cloudsql.client`,
`run.admin`, `iam.serviceAccountUser`, `secretAccessor` project-level → keluaran pemeriksaan:
`kosong (benar)`. `cloudsql.client` memang tidak dibutuhkan: backend mencapai Cloud SQL lewat
**private IP `10.112.0.2`** via connector `portfolio-connector` dengan `vpc-access-egress=all-traffic`
dan **tanpa** volume `cloudsql` — terukur dari `run services describe`.

### Hasil terukur F5 + F8, dan satu fase yang kublokir sendiri (2026-10-05, 02:26 – 03:00 UTC)

("Fase yang kublokir sendiri" = F6. Fase itu akhirnya jalan 04:04 – 04:13 UTC sebagai opsi B; angkanya
di bagian F6 di bawah, bukan di sini.)

**F5 — E9a hijau.** PR #17 (`2731cd2`) → `ci.yml` `pull_request` run #30 `success` (go/web/api di
bawah `strict: true`) → merge `382f0e4` → **deploy run #25 `success`**. Lalu merge F8 (`3a88e25`)
menyulut deploy run #26 `success`, dan log run #26 adalah bukti bahwa assertion yang kutambah di F5
benar-benar dieksekusi, bukan hanya ada di file:

```text
1058  portfolio-be serviceAccountName=portfolio-runtime@config-agentic-ubuntu.iam.gserviceaccount.com
1059  portfolio-fe serviceAccountName=portfolio-runtime@config-agentic-ubuntu.iam.gserviceaccount.com
1060  portfolio-be vpc-access-connector=portfolio-connector
```

Keadaan live sesudahnya, diukur 02:46 UTC langsung dari `gcloud` (bukan dari log workflow):

| service | traffic | `serviceAccountName` | connector |
|---|---|---|---|
| `portfolio-be` | `portfolio-be-00022-w7f` @100, `latestCreated == latestReady`, `Ready=True` | `portfolio-runtime@…` | `portfolio-connector` |
| `portfolio-fe` | `portfolio-fe-00021-hmv` @100, sama | `portfolio-runtime@…` | tidak dipakai oleh FE |

Konten utuh di bawah SA baru: `/api/health` `{"db":"ok","status":"ok"}` dari domain publik (02:42
UTC), `/api/cv` HTTP 200 **774.803 byte** diawali `%PDF-`. `logging.logWriter` terbukti — entri
`run.googleapis.com/stdout` baru muncul setelah deploy. `monitoring.metricWriter` **belum terukur**:
grant-nya ada, buktinya tidak; itu hutang, bukan keberhasilan.

Dua jebakan yang hampir jadi kesimpulan palsu, dan dua-duanya gugur oleh pengukuran ulang:
`/api/cv` sempat terlihat 404 di URL `run.app` **backend** (jalur yang benar memang `$FE/api/cv`;
domain publik 200), dan `gcloud logging read` sempat menampilkan **0 baris** karena filter
`timestampMin>=` yang kubentuk tidak terparse — bukan karena lognya hilang.

**F8 — E11 hijau mekanisme, merah muda untuk `schedule`.** Identitas `github-watch@…` memegang
**hanya** `roles/run.viewer` (project-level) + `iam.workloadIdentityUser` pada dirinya sendiri dengan
member `principalSet://…/github-pool/attribute.repository/ArkanFzi/website-porto2`; pemeriksaan
peniadaan menghasilkan `tulis/secret: kosong (benar)`. PR #18 (`ee52c1e`) → CI run #32 `success` →
merge `3a88e25` → **Watch run #4 `success`** (id 37256510503), baris `cloud-*` pertama yang dibaca
dari *runner*:

```text
02:43:37  access_token_scopes: https://www.googleapis.com/auth/cloud-platform   ← langkah auth@v3
02:43:51  portfolio-be: sa=portfolio-runtime@… traffic=portfolio-be-00021-kmb=100
02:43:55  cloud-traffic/portfolio-be|HIJAU|100% di portfolio-be-00021-kmb
          baris harian: rows=17 merah=0
```

Sisi negatifnya lima mutasi terhadap `gcloud` stub (skrip langkah diekstrak apa adanya dari YAML):
traffic di revisi lama → MERAH ×2; traffic 50/50 → MERAH ×2; SA kembali ke compute → `cloud-sa`
MERAH ×2; revisi belum `Ready` → KUNING ×2; `describe` rc=3 → `cloud-drift` KUNING ×2 dan tidak ada
vonis lain. **0 false-clean.** Tabel lengkap ada di `DEPLOY.md` § "F8 — drift cloud".

**Bukti kandang** (02:48 UTC, branch buangan `chore/bukti-kandang-watch`, commit `9824e86`, dispatch
→ Watch run #5 `success`): `update-traffic` → **403 PERMISSION_DENIED** (`run.service…`),
`secrets describe portfolio-database-url` → **403** (`secretmanager.secrets.get`). Kontrol negatif
biar 403 tidak berarti "metodenya mati": `update-traffic` yang sama dengan identitasku sendiri →
**`rc=0`**. Karena kontrol itu menyentuh produksi, keadaan sesudahnya kuukur: traffic tetap
`portfolio-be-00022-w7f`=100, `latestCreated == latestReady`, 0 revisi baru; yang berubah hanya
`metadata.generation=35` dan `lastModifier`. Branch dibuang **setelah** backup:
`porto2-probe-leashed-2026-10-05.patch`, 3.319 byte, `sha256:a6de7287…8b83f`. Dua cabang PR yang
sudah ter-merge (`2731cd2`, `ee52c1e`) kuhapus dari remote sesudah dipastikan **ancer `main`** →
`git ls-remote --heads origin` **3 → 2**.

Yang **tidak** terpenuhi oleh ini: `event=schedule`. Pada 02:59:50 UTC — 2 jam 23 menit sesudah cron
`37 2 * * *` — `watch.yml` `state=active`, `next_run_at=null`, jumlah run `schedule` di repo **0**.
Dua penyebab umum dibuang dengan pengukuran, bukan asumsi: `visibility=public` dan plan pemilik
`pro`. E8 (7 baris `schedule` hijau berturut) jadi masih 0 dari 7, dan Watch #1–#5 tidak dihitung —
persis disiplin yang sama dengan E4.

### F6 — opsi B dieksekusi: SA khusus per VM, lalu `editor` dicabut (2026-10-05, 03:55 – 04:13 UTC)

Keputusanmu: **(B)** — SA khusus per VM lebih dulu, `editor` belakangan. Fase ini sempat kutahan
karena belum ada katamu; angkanya sudah ada di bawah, dan satu di antaranya mengubah rencana
sebelum satu VM pun kusentuh.

**Temuan yang mengubah rencana.** Sebelum mencabut apa pun, kuukur dulu apa yang *sebenarnya*
diizinkan `editor` kepada kedua VM:

| Yang diukur | Angka |
|---|---|
| Binding pada `agentic-alerts-sub` sebelum F6 | **0** (policy-nya kosong) |
| `pubsub.subscriptions.consume` di `roles/editor` | **ada** (salah satu dari 12.154 permission) |
| `pubsub.subscriptions.consume` di `roles/pubsub.subscriber` | **ada** (jadi penggantinya setara, bukan lebih longgar) |
| `secretmanager.versions.access` di `roles/editor` | **0** — `editor` bisa `secrets.get/list/update/delete` dan `versions.add/destroy/disable` (18 permission secretmanager), tapi **tidak bisa membaca nilai secret** |
| Entri audit SA compute 14 hari terakhir (termasuk yang ditolak) | **0** |
| Project lain dengan Compute API aktif | **0** dari 5 project lain yang terlihat |
| Instance template / MIG | **0** / **0** |

Konsekuensinya: konsumen `agentic-alerts-sub` — rantai `agentic-alerts-sink` (`severity>=ERROR`) →
topic `agentic-alerts` → langganan → bot — berdiri **hanya** di atas `editor` project-level. Cabut
`editor` tanpa pengganti membunuh jalur alert itu, dan kegagalan itu **tidak akan pernah muncul di
audit log**: `consume` itu data-plane, dan Data Access logging projek ini mati (sudah terukur di F8).
Jadi temuan ini bukan dari log, tapi dari `get-iam-policy` langganan + isi heartbeat VM. Catatan
koreksi sekalian: kalimat lama di §5/DEPLOY.md yang menyiratkan `editor` membuka **nilai** secret
itu terlalu jauh — angkanya `0` untuk `versions.access`; yang nyata ada di tangan `editor` adalah
metadata dan kemampuan merusak (`secrets.delete`, `versions.destroy`), bukan membaca.

**Grant yang dipasang, dan dari angka mana dia datang.** Jumlahnya **12 binding berbeda**, yang bersama-sama
menutupi **21 pasangan (SA, binding)** — bedanya penting, karena satu binding bisa memegang kedua SA sekaligus,
jadi angka "20" yang pertama kutulis di sini sebenarnya **entri mutasi IAM** di activity log
(jendela 04:02:58.5 – 04:03:59.0, ditambah satu `storage.setIamPermissions` 04:22:58.3), bukan jumlah grant.
Angka yang kubaca sekarang datang dari policy-nya sendiri (`/tmp/f6-count.out`), bukan dari hitungan perintahku,
dan semuanya hasil pengukuran — bukan tebakan defensif:

| Grant | Ke siapa | Alasannya terukur |
|---|---|---|
| `roles/logging.logWriter` (project) | `agentic-watchdog@`, `hermes-openclaw@` | kedua VM menulis log lewat token metadata: `watchdog-heartbeat` 794 baris/7 hari, `GCEGuestAgent` 04:07:17 (watchdog) & 04:06:27 (openclaw) |
| `roles/monitoring.metricWriter` (project) | kedua SA | editor memegang `monitoring.timeSeries.create`; filter `agent.googleapis.com*` pada kedua instance mengembalikan **lebih dari satu metrik** → ada agen yang menulis metrik |
| `roles/pubsub.subscriber` | kedua SA pada `agentic-alerts-sub`, `pickertime-pb-deploy-to-vm`, `pickertime-pb-backups-to-gcs` | dua yang terakhir **sudah** ber-binding ke SA compute; `agentic-alerts-sub` tidak punya binding sama sekali (jalur editor di atas) |
| `roles/pubsub.publisher` | kedua SA pada `pickertime-pb-deploy-results`, `pickertime-pb-backups` | binding topic-level ke SA compute memang ada di sana (terukur 04:00 UTC) |
| `roles/storage.objectAdmin` + `roles/storage.objectViewer` | `agentic-watchdog@` pada `gs://config-agentic-ubuntu-backups`, `gs://pickertime-pb-backups` | akses tulis hari ini datang dari `projectEditor:config-agentic-ubuntu` di policy bucket; objek terbaru 2026-10-02T09:32:56Z → pipa ini hidup |
| `roles/storage.objectViewer` | `hermes-openclaw@` pada `gs://pickertime-pb-deploys`, `gs://config-agentic-ubuntu-backups` | 7 scope-nya **tidak** memuat `devstorage.read_write`, jadi memberi objectAdmin ke VM itu hanya akan jadi privilege mati; dia hanya butuh baca |
| `roles/storage.objectViewer` (terakhir, 04:22:58.3) | `agentic-watchdog@` pada `gs://pickertime-pb-deploys` | **bukan** dari rencana awal — ini keluar dari sweep ulang setelah cabut: SA compute ternyata sudah memegang `objectViewer` di bucket itu, dan grant itu tidak kupindahkan bersamanya. Penyebabnya ada di blok "Temuan terbesar justru keluar *setelah* cabut" di bawah |

**Satu kompromi yang kubiarkan terbuka, sengaja.** Aku tidak bisa membuktikan **VM mana** menyedot
langganan mana: `bot.elarisnoir.my.id` ada di belakang Cloudflare, `hermes-openclaw-vm` tidak punya
IP eksternal, openclaw tidak menulis log aplikasi apa pun, dan Data Access logging mati. Jadi grant
pubsub kupasang ke **kedua** SA, bukan dikarang satu alamat. Harganya: satu binding inert di suatu
tempat. Yang membuktikan bahwa keduanya benar-benar masih hidup bukan ujiku, tapi mesinnya sendiri:
04:07:21.3 watchdog menulis heartbeat dengan token identitas barunya (`uptimeSec=17`,
`pubsubSubscriber=True`, `queueLength=0`) — 30 s setelah `start` selesai — dan 04:06:27 openclaw menulis
`GCEGuestAgent` juga dari token baru. Prune binding yang inert butuh seminggu pengamatan, dan itu
pekerjaan sendiri — bukan bagian keputusan B.

**Mekanikanya, dikukuhkan dulu sebelum menyentuh VM yang jalan.** `gcloud compute instances
set-service-account --help` tidak bilang apa-apa soal stop/start, jadi kutanya ke API-nya dengan
menjawab `n`: keluarannya `The instance must be stopped before the service account can be changed.`
(rc=1, instance tidak tersentuh, status tetap `RUNNING`). Artinya ada downtime nyata; ini yang kamu
setujui bersama opsi B. Angka jamnya dari `cloudaudit/activity`, bukan dari ingatanku — tiap operasi tercatat **dua kali**
(dimulai & selesai), dan justru itu yang membuat hitungan pertamaku terlalu optimis:

| VM | `instances.stop` mulai | `setServiceAccount` | `start` selesai | **mati selama** | scope sesudah |
|---|---|---|---|---|---|
| `hermes-openclaw-vm` | 04:04:38.6 | 04:05:28.9 | 04:05:58.0 | **79 s** | 7 scope lama, utuh |
| `agentic-watchdog-vm` | 04:06:11.6 | 04:06:36.5 | 04:06:51.7 | **40 s** | `cloud-platform`, utuh |

Yang pertama kutulis di tabel ini (34 s dan 45 s) adalah selisih *setelah* `stop` returns sampai `start`
returns — ukuran yang lebih sempit dan lebih kecil dari downtime yang dirasakan, karena penghentian guest
agent dan flush filesystem sudah termasuk mati. SA-nya sendiri dibuat 04:02:38.2 (`agentic-watchdog@`) dan
04:02:40.5 (`hermes-openclaw@`), grant-nya 04:02:58.5 – 04:03:41.8, semuanya tercatat di activity log.

IP eksternal watchdog (`34.30.105.255`) tidak berubah; `gog-gmail-watch-push` backlog `0` di **setiap**
menit 04:03–04:12, jadi tidak ada pesan yang menggantung selama kedua VM mati.

**Cabut `editor` dan E9b.** Cabutnya satu perintah, dan sebelum eksekusi kuukur bahwa anggota
`roles/editor` masih persis dua seperti snapshot `/tmp/iam-sebelum-f6.json` (`etag BwZdDrGa6uI=`) —
tidak ada perubahan pihak ketiga di tengah. Setelah cabut:

| Kriteria E9b | Angka (cabut 04:07:56.5 UTC, diukur sampai 04:13 UTC) |
|---|---|
| Pemegang `roles/editor` se-proyek | **1**: `486641216758@cloudservices.gserviceaccount.com` (SA milik Google) |
| Sisa peran project-level pada `…-compute@developer` | **`roles/pubsub.publisher` saja** — dan itu *hanya* project-level; binding di tingkat resource masih menempel padanya, angkanya di bawah |
| `spec.template.spec.serviceAccountName` kedua service | tetap `portfolio-runtime@…`, traffic `00022-w7f`=100 dan `00021-hmv`=100 |
| `/api/health` | `http=200` `{"db":"ok","status":"ok"}` (1,007 s) |
| Beranda | `http=200` **40.699 byte**, `Application error` **0** |
| `/api/cv` | `http=200` **774.803 byte**, `%PDF-1.4` |
| Konektor | `portfolio-connector` `READY`, `10.10.0.0/28` |
| Watch run #6 (`workflow_dispatch`, `main` `75b2f3f`) | `success`, `rows=17 merah=0`, `cloud-sa/portfolio-be\|HIJAU`, `cloud-sa/portfolio-fe\|HIJAU`, `cloud-traffic/*\|HIJAU\|100% di …` |
| Heartbeat watchdog pasca-identitas baru | 04:07:21.3 `pubsubSubscriber=True` `uptimeSec=17` (**30 s** setelah `start` selesai 04:06:51.7), lalu 04:12:21 `whatsappConnected=True` `queueLength=0` |

Rollback kalau ini salah: `gcloud projects add-iam-policy-binding config-agentic-ubuntu
--member=serviceAccount:486641216758-compute@developer.gserviceaccount.com --role=roles/editor`
satu baris; mengembalikan identitas VM menuntut stop/start lagi.

**Temuan terbesar justru keluar *setelah* cabut — dan itu salahku yang ketahuan.** Setelah `editor`
dicabut aku jalankan blok verifikasi yang kubebereskan di DEPLOY.md apa adanya (`bash /tmp/f6repro.sh`,
diekstrak verbatim dari file itu). Keluarannya berkata hal yang tidak bisa kuklaim di §6: SA compute
yang "sudah tidak dipakai" itu **masih memegang binding di tingkat resource**, dan salah satunya
bukan sekadar metadata — **`roles/secretmanager.secretAccessor` pada 6 secret**, termasuk
`portfolio-database-url`, `portfolio-admin-pass` dan `gog-keyring-password`. Ini jauh lebih besar dari
sisa `pubsub.publisher` yang kutulis sebagai "yang tersisa". Hasil sweep penuh, tiap kelas resource diukur
dengan `get-iam-policy`-nya sendiri (nama secret saja, **tidak ada nilai** yang kubaca — `versions access`
tidak pernah kujalankan):

| Kelas resource yang kunumerasi | Binding yang masih menempel pada `486641216758-compute@developer` |
|---|---|
| Project-level | **1**: `roles/pubsub.publisher` |
| Bucket — 4 ditelusuri | **2**: `roles/storage.objectAdmin` pada `gs://pickertime-pb-backups`, `roles/storage.objectViewer` pada `gs://pickertime-pb-deploys`; `gs://config-agentic-ubuntu-backups` dan `gs://ai-agent-triage-batch-1790307337`: **0** |
| Topic — 6 ditelusuri | **2**: `roles/pubsub.publisher` pada `pickertime-pb-deploy-results` dan `pickertime-pb-backups`; `agentic-alerts`, `gog-gmail-watch`, `gog-gmail-dead-letter`, `pickertime-pb-deploy`: **0** |
| Langganan — 6 ditelusuri | **2**: `roles/pubsub.subscriber` pada `pickertime-pb-deploy-to-vm` dan `pickertime-pb-backups-to-gcs`; `agentic-alerts-sub`, `gog-gmail-watch-push`, `gog-gmail-dead-letter-sub`, `pickertime-pb-deploy-results-to-gha`: **0** |
| Cloud Run — 2 service | **0** — `spec.template.spec.serviceAccountName` keduanya `portfolio-runtime@…` |
| Secret — 7 ditelusuri | **6**: `roles/secretmanager.secretAccessor` — `gog-keyring-password`, `portfolio-admin-email`, `portfolio-admin-pass`, `portfolio-cors-origins`, `portfolio-database-url`, `portfolio-jwt-secret`; `agentic-laptop-backup-passphrase`: **0**. Lima dari enam itu **juga** dipegang `portfolio-runtime@` (itu grant F4 yang memang dibutuhkan service), jadi yang *khusus* SA compute hanyalah `gog-keyring-password` + salinan lima lainnya |
| Cloud SQL | **tidak terukur** — `gcloud sql instances get-iam-policy` tidak ada di versi gcloud ini (`Invalid choice: 'get-iam-policy'`), jadi kelas ini **di luar** daftar yang bisa kujamin, bukan "bersih" |

Penyebabnya sepele dan pantas dicatat, karena dia hampir lolos ke dokumen: dump bucket pertamaku
kupotong dengan `cut -c1-400` supaya muat di terminal — dan binding yang terpotong itu **tidak muncul
sama sekali**, jadi bacaanku "tidak ada apa-apa lagi di luar editor". Hari ini ada kegagalan kedua yang
sekerabat: `gcloud storage buckets list --format='value(url)'` mengembalikan **4 baris kosong** (rc=0,
field `url` tidak ada), sehingga `for b in $(...)` **nol iterasi** dan setiap bucket tercetak `(kosong)`.
Loop yang tidak pernah jalan tidak bisa dibedakan dari policy yang kosong — dan keduanya menghasilkan
kalimat yang sama salahnya. Sejak itu jumlah grant F6 kukutip dari policy yang dibaca ulang
(`/tmp/f6-count.out`), bukan dari apa yang kuperintahkan. Blok DEPLOY.md yang sudah kukoreksi hari ini
kuulang apa adanya (`bash /tmp/deployblock.sh`, 53 baris, **rc=0**): keluarannya sekarang cocok dengan
tabel ini, dan itu yang membuat klaim "bisa diulang orang lain" di file itu masih layak ditulis — termasuk
satu koreksi lagi di dalamnya, `keys list` pada SA compute yang di gcloud rc=1 dan baru terjawab lewat REST.

**Yang kulakukan dengan temuan ini, dan yang tidak.** Storage: `objectViewer` pada
`gs://pickertime-pb-deploys` untuk `agentic-watchdog@` kutambahkan (04:22:58.3) karena itu satu-satunya
kuasa yang hilang tanpa pengganti dan pipa deploy memakainya. Secret: **tidak kuklaim, tidak kupindahkan,
tidak kucabut.** `secretAccessor` itu hari ini **inert** — 0 kunci `USER_MANAGED` di ke-6 SA dan tidak ada
beban kerja yang memegang token itu, jadi tidak ada yang bisa menukarnya; tapi mencabutnya adalah keputusan
sendiri, karena sebuah skrip di dalam VM bisa saja membaca `gog-keyring-password` dan kegagalannya akan
senyap (Data Access logging mati — `versions.access` tidak meninggalkan jejak). Itu **di luar** yang kamu izinkan
untuk opsi B, jadi dia masuk daftar keputusan, bukan kubereskan diam-diam. Yang nyata-nyata perlu kamu
jawab: cabut 6 binding `secretAccessor` itu, atau biarkan sampai ada bukti pemakaian?
Sesudah grant 04:22:58 itu situs kuprobe ulang (04:48 UTC): `/api/health` `http=200` 25 byte
`{"db":"ok","status":"ok"}` (1,08 s), beranda `http=200` **40.699 byte** `Application error` **0**,
`/api/cv` `http=200` **774.803 byte** `%PDF-1.4` — angka yang sama seperti tabel E9b di atas, jadi satu
binding tambahan itu tidak menggerakkan apa pun di sisi pengguna.

**Enam pembacaan yang salah dan sudah kukoreksi di tengah fase ini.** (1) Aku sempat menulis "kedua VM
internal-only": projection-ku memakai `accessConfig[0].natIP` padahal field-nya `accessConfigs[0]` —
watchdog punya IP eksternal, dan itu kulihat baru setelah start. (2) `gcloud logging read --limit=0`
**mengembalikan nol baris**, bukan "semua baris"; dari situlah pembacaan "SA compute tidak menulis log
apa pun" yang pertama kali muncul. (3) Percobaan bukti kandang lewat `--impersonate-service-account`
gagal di langkah **token** (`iam.serviceAccounts.getAccessToken` denied for me), bukan di otorisasi —
dan kegagalan itu tidak meninggalkan entri `code=7` sama sekali (terukur 0 pada jendela 04:04–04:12).
Jadi kandang F6 tidak kubuktikan dengan uji sintetis seperti F8, tapi struktural: identitas kedua VM
sudah bukan SA itu lagi, dan pipeline-nya sendiri yang menulis bahwa dia masih hidup. (4) dan (5) baru
keluar **setelah** cabut dan keduanya satu keluarga dengan (2): `cut -c1-400` pada dump bucket (binding yang
terpotong hilang tanpa suara) dan `--format='value(url)'` yang tidak punya field itu, jadi loop-nya nol
iterasi dan tiap bucket tercetak `(kosong)`. (6) juga satu keluarga: `--format='json(keys[])'` pada
`iam service-accounts keys list` mengembalikan `[null]` (keluaran perintah itu **sudah** array, jadi
selector-nya tidak menemukan apa-apa), dan itulah yang membuat loop kunci di blok DEPLOY.md tercetak
kosong sebelum kutukar jadi `--format=json`. Lima dari enam kesalahanku di fase ini bentuknya sama:
**keluaran kosong yang kubaca sebagai fakta kosong.** Yang (4)+(5) itu yang hampir lolos ke dokumen sebagai
klaim "SA compute sudah bersih", dan tabel sweep di atas adalah harganya.

**Sisa yang tidak kubebereskan.** `gs://ai-agent-triage-batch-1790307337` (terakhir ditulis
2026-09-25T03:42:38Z) **tidak** kuberi grant ke SA mana pun — kalau pipa triage itu bangun, dia akan
`PERMISSION_DENIED`, dan tambalannya satu baris
(`gcloud storage buckets add-iam-policy-binding gs://ai-agent-triage-batch-1790307337 --member=serviceAccount:agentic-watchdog@config-agentic-ubuntu.iam.gserviceaccount.com --role=roles/storage.objectAdmin`).
`metricWriter` kupasang karena `editor` memegang `monitoring.timeSeries.create` tapi **belum terbukti
berfungsi**: empat nama metrik kukira (`agent.googleapis.com/cpu/time` dkk) semuanya `no-series`, dan
`metricDescriptors` 404 di kedua jalur URL — sama jujurnya dengan catatan `metricWriter` di F5.
`roles/pubsub.publisher` project-level pada SA compute kubiarkan (di luar yang kamu izinkan), meski
sekarang jelas **vestigial**: tidak ada beban kerja yang memakai identitas itu, dan itu bukan asumsi —
`keys list` pada ke-6 SA (`…-compute@developer`, `agentic-watchdog@`, `hermes-openclaw@`,
`portfolio-runtime@`, `github-watch@`, `github-cd@`) mengembalikan **hanya** `SYSTEM_MANAGED`,
**0** `USER_MANAGED` — dengan satu catatan yang sempat bikin klaim ini kelihatan lebih kuat dari
buktinya: untuk `…-compute@developer` perintah gcloud-nya **rc=1** (`INVALID_ARGUMENT: Unknown error`)
meskipun `service-accounts describe` atas email yang sama berhasil, jadi angka SA itu datang dari REST
(`iam.googleapis.com/v1/projects/…/serviceAccounts/…/keys` → 1 kunci, `SYSTEM_MANAGED`), bukan dari gcloud.
Yang 5 lagi terukur langsung. Jadi tidak ada skrip di luar GCP yang bisa menukarnya dengan token. Yang tinggal
adalah kemungkinan masa depan: VM baru tanpa `--service-account` akan mendapatkan SA default ini lagi.
Mencabutnya tinggal satu perintah atas katamu. Dan **yang paling berat di sisa ini bukan `publisher`**,
melainkan **6 binding `roles/secretmanager.secretAccessor`** yang masih menempel pada SA compute itu
(rinciannya di tabel sweep di atas) — inert hari ini karena tidak ada yang memegang token itu, tapi
dia menguasakan **nilai** secret, bukan cuma metadata, dan akan ikut aktif lagi begitu ada VM baru tanpa
`--service-account`. Cloud SQL **tidak** kunumerasi: `gcloud sql instances get-iam-policy` tidak ada
di gcloud versi ini (`Invalid choice`), jadi klaim "bersih" untuk kelas itu belum bisa kubuat — yang bisa
kulakukan hanya menyebutnya "belum diukur".

**Cara fase ini mendarat.** PR #20 (`6ee9a3b`, dokumen saja) → CI run #36 `pull_request` `success`
(`go`/`web`/`api` + GitGuardian, selesai 04:50 UTC) → merge `6281b7f` 04:51 UTC → CI run #37 `push`
`success`, dan **0 run `Deploy to Cloud Run`** untuk SHA merge itu. Tidak ada satu pun langkah F6 yang
menyentuh repositori aplikasi: seluruhnya IAM + Compute, dan memang begitu seharusnya — gerbang CI tidak
punya alasan untuk deploy ulang situs karena angkanya berubah di `TODO.md`.

### F9 langkah (1) — form kontak berhenti berbohong dan mulai menulis (2026-10-05, 05:36 – 05:44 UTC)

**Klaim "form kontak rusak" kubuktikan lebih dulu, bukan diasumsikan.** Di produksi, sebelum perubahan ini,
dengan dua bentuk body yang berbeda:

| body yang dikirim | http | byte | waktu |
|---|---|---|---|
| name + email + subject + body — persis yang dikirim `Contact.tsx:29` | **400** | 35 | 0,35 s |
| name + email + message — satu-satunya bentuk yang diterima handler stub | **200** | 54 | **1,36 s** |

Baris kedua yang mengubah fase ini dari "fitur baru" menjadi "bug fix yang sedang berjalan di internet":
situs menjawab `{"success":true,"message":"Message sent successfully"}` sambil mengerjakan satu-satunya
statement di dalamnya, yaitu `await new Promise(resolve => setTimeout(resolve, 1000))`. Selisih 1,36 − 0,35
≈ sleep 1000 ms-nya, dan tidak ada satu pun pesan pengunjung yang pernah mendarat di tempat yang bisa dibuka.

**Yang berubah.** Model `ContactMessage` (uuid PK `gen_random_uuid()`, pola sama dengan `Certificate` dan
`Experience`), satu entri di `AutoMigrate`, handler `POST /api/contact` ditulis ulang: validasi →
`DB.Create` dengan `if err :=` → **hanya setelah insert sukses** email dilempar ke goroutine. Handler
`src/app/api/contact/route.ts` dihapus — dialah yang selama ini memotong rewrite lebih dulu, karena route
handler menang atas `rewrites()`; `next.config.ts` konsekuensinya dapat `source: "/api/contact"`.

**Angka lokal.** postgres:15 + backend di container, host port 55432 dan 8099, karena 5432 dan 8080 di host
sudah ditempati `local_postgres` dan `local_adminer` — keduanya tidak kusentuh:

| uji | hasil |
|---|---|
| payload persis situs | **201**, `id=162802bb-27fb-…`, `count(*) contact_messages` **0 → 1** |
| normalisasi | input `" ARKAN@Example.COM "` tersimpan `arkan@example.com` |
| bentuk message (yang dulu 200 palsu) | **400** |
| name kosong, email cacat, body kosong, JSON tanpa body | **400** untuk keempatnya |
| body 20001 rune | **400**; name 200 rune beraksen → **201** (batas dihitung rune, bukan byte, supaya cocok dengan `varchar(200)` Postgres) |
| **Postgres dimatikan lalu POST** | **500** dan di log: `contact: gagal menyimpan pesan: failed to connect to user=postgres database=portfolio_db: hostname resolving error`. Jumlah baris tetap 2 — tidak ada tulis hantu, tidak ada 200 |

**Tripwire bergerak, tapi bukan pada sumbu yang diramal E13.** `api-contract-check.mjs` menolak dua kali
sebelum aku sadar: pertama karena stub-nya memang hilang (`STUB sudah hilang, kecilkan baseline`), dan itu
kubawa lewat `--emit-baseline` secara sadar. Hitungannya sekarang **13 path mati (tetap 13) dan 0 stub
(turun dari 1)** dengan `rc=0`. E13 baru terpenuhi separuh: "turun dari 13" terjadi di sub-langkah (3),
karena `GET /api/contact`, `DELETE /api/contact/:p` dan `POST /api/auth/login` masih menunggu rute admin —
yang berubah cuma alasannya (`rewrite ada, tapi backend tidak punya GET /api/contact`, sebelumnya "tidak ada
handler lokal, tidak ada rewrite, tidak ada rute backend"). Aku tulis ini supaya "13" tidak kelihatan sudah
turun padahal belum.

**Koreksi rencana F9: langkah (2) bukan "email via gomail".** `mailer/mailer.go` sudah gomail dan sudah
membaca `EMAIL_USER`/`EMAIL_PASS` dari env sejak lama. Yang keluar di log backend tadi:
`gomail: could not send email 1: 530 "5.7.0 Authentication Required" … gsmtp`. Jalurnya jadi terbukti sampai
ke server Google dan yang kurang cuma kredensial. (2) menyusut jadi satu baris di sisi kamu: app password
Gmail masuk Secret Manager; tidak ada kode yang perlu kutulis untuk itu, dan aku tetap tidak menulis nilainya.

**Yang sengaja tidak kututup di PR ini.** `POST /api/contact` sekarang adalah **tulis DB tanpa autentikasi
dan tanpa rate limit** — permukaan baru untuk spam yang membayangi Cloud SQL. Itu bukan kelalaian senyap:
ia tercatat di bawah, dan kuncinya harus dibikin sadar (batasan per IP di middleware, atau honeypot di form),
bukan diterima sebagai harga yang harus dibayar tanpa dihitung.

**Cara langkah ini mendarat.** PR #22 (`21f8b7d`) → CI run #40 `pull_request` **`success`** (`go` + `web` +
`api`, 05:46 – 05:48 UTC). Yang membedakan fase ini dari F1–F6: langkah baruku bukan satu-satunya bukti —
`Kontrak kontak (form publik benar-benar menulis)` tercatat `success` di job `api`, dan log-nya mencetak
`POST /api/contact => id=d536d996-0649-4870-ad58-d6207cfa5179`, `jumlah baris: 0 -> 1`,
`email tersimpan: 'kontrak-ci@example.test'`, lalu penolakan bentuk message dengan `400`. Jadi kontraknya
dipegang Postgres nyata di runner, bukan oleh salinan yang kuputar di laptop. Merge 05:48 UTC → `005d5ea`;
CI #41 `success` dan **Deploy to Cloud Run #27 `success`** (selesai 05:52:07 UTC).

Ini menutup arah E7 yang sebaliknya: empat merge dokumen sebelumnya menghasilkan **0** run deploy, merge kode
ini menghasilkan **1**. Gerbang `paths` bekerja dua arah, dan angka "0 run" yang kubanggakan di F6 tidak
berarti gerbangnya mati — cuma tidak sedang dipanggil.

**Produksi, sesudah deploy (05:53 UTC).** `portfolio-be` generation 35 → 37 dengan revisi aktif
`portfolio-be-00023-xsf`; `portfolio-fe` 32 → 34 dengan `portfolio-fe-00022-s9h`. Generasi naik dua, revisi
baru cuma satu per service, karena `deploy.yml` melakukan `set-secrets` lalu `set-image`; revisi lama
berstatus `Retired` tapi tetap ada — 21 revisi `portfolio-be` tidak dipangkas, jadi target rollback F6 utuh.

| probe produksi | sebelum PR ini | sesudah PR ini |
|---|---|---|
| POST payload persis dari situs | 400, 35 byte, 0,35 s | **201**, 93 byte, 0,40 s, `id=b693e544-3001-…` |
| POST bentuk message | 200 palsu, 54 byte, **1,36 s** | **400**, 46 byte, 0,38 s |
| GET `/api/contact` | 405 dari handler stub | **404** `404 page not found` — dari gin, artinya rewrite benar-benar meneruskan |
| GET `/api/admin/contact` | 404 | **404** — belum ada satu pun permukaan admin |
| GET `/api/health` | 200, 25 byte | 200, 25 byte, identik |
| GET `/` | 40.699 byte | **40.699 byte**, jejak `Application error` = **0** |
| GET `/api/cv` | 774.803 byte `%PDF-1.4` | **774.803 byte**, 5,63 s |

**Satu hal yang kutinggalkan di DB produksi dan harus kamu tahu:** baris `b693e544-3001-4ea2-ac75-04909dbe3c92`
dari probe di atas masih ada, dan **belum ada jalan menghapusnya dari aplikasi** — rute hapus ber-JWT datang di
langkah (3); sementara ini hanya bisa dibersihkan lewat Cloud SQL. Aku juga tidak mengklaim "count di produksi
naik": tidak ada jalur yang diizinkan dari laptop ke Cloud SQL, dan itu bukan sesuatu yang kubuka diam-diam.
Bukti bahwa barisnya nyata adalah `id` yang dikembalikan `gen_random_uuid()` bersama `201` — insert yang gagal
tidak bisa menghasilkan uuid sisi DB — dan `select count(*)` yang sebenarnya sudah kubuktikan di CI.

### F9 langkah (3) — inbox admin ber-JWT, dan middleware gin yang tidak pernah jalan (2026-10-05, 06:04 – 07:01 UTC)

**Yang dibangun.** `admin := api.Group("/admin")` + `AuthMiddleware`, berisi `GET /api/admin/contact`
(urut terbaru, cap 500 baris) dan `DELETE /api/admin/contact/:id`. `handleLogin` dijadikan satu fungsi dan
didaftarkan pada dua path: `POST /api/login` (yang selama ini dipakai `admin/page.tsx`) dan
`POST /api/auth/login` (yang dipakai `admin/login/page.tsx` dan selama ini mati). Satu handler, tidak ada
duplikasi logika kredensial. `admin/dashboard/page.tsx` pindah ke `/api/admin/contact`, dan tipe `ContactMsg`
disesuaikan ke kunci yang benar-benar dikirim backend: `id` string (bukan `number`), `body` (bukan `message`),
`createdAt` (bukan `submittedDate`). Baseline: **13 → 10 path mati**, `rc=0`.

**Bug yang tidak akan ketahuan kalau step CI-nya tidak kujalankan verbatim.** Assertion pertamaku —
`DELETE /api/admin/contact` tanpa token harus 401 — **gagal di run lokal: malah 404**. Penyebabnya perilaku
gin: `group.Use(mw)` tidak berjalan untuk path yang tidak pernah didaftarkan group itu. Jadi `DELETE
/api/admin/contact` (tanpa `:id`) lolos tanpa menyentuh JWT dan dijawab 404 oleh router. Tidak ada data yang
bocor, tapi itu adalah oracle "rute ini ada / tidak ada", dan kalimat E13-ku ("tanpa JWT tidak ada satu pun
rute admin yang boleh 200") jadi **tidak benar** untuk seluruh subtree admin. Kuberes dengan `r.NoRoute`:
path berawalan `/api/admin/` yang tidak terdaftar dijawab 401. Aku memilih memperkuat guarded-nya, bukan
melonggarkan assertion-nya.

**Efek samping yang harus diketahui:** 404 untuk path tak dikenal di backend sekarang berbadan JSON.
Terukur di produksi: `GET /api/contact` → `404`, body `{"error":"Not found"}`, **21 byte di jalur**
(20 byte JSON + newline penutup gin). Statusnya tetap 404; hanya bentuknya yang berubah.

**Angka CI.** Run #44 (`pull_request`) `success` 06:04 UTC — `go` + `web` + `api`, 0 step gagal, step 11 dari
13 bernama `Kontrak inbox admin (401 tanpa JWT, terhitung dengan JWT)` `success`. Log-nya mencetak:

| yang tercetak | hasil |
|---|---|
| `GET /api/admin/contact tanpa token` | **401** |
| `DELETE /api/admin/contact tanpa token` | **401** |
| `GET dengan token rusak` | **401** |
| `login: /api/auth/login …, /api/login …` | **144 char** keduanya |
| `sandi salah` | **401** |
| `POST publik` | **201**, `id=b6c8f6fd-ed96-469e-8b43-9e8a550cd841`, sebelumnya `count 1` |
| `inbox panjang=…, psql count=…, memuat id baru` | **2, 2, true** |
| `DELETE` | `{"deleted":1}` |
| `DELETE lagi` | **404** |
| `DELETE id cacat` | **400** |

Yang tidak tercetak tapi di-assert langkah yang sama: `rowcount == before + 1` (naik **persis satu**),
panjang inbox **sama dengan** `select count(*)`, baris hilang lagi setelah hapus, email tersimpan
`kontrak-admin@example.test` (trim + lower), `.deleted == 1`. Inilah bentuk E13 yang diminta: 1 POST →
terhitung lewat `GET /api/admin/contact`, 401 tanpa JWT, hapus idempoten. `DELETE /api/admin/contact/:id`
menolak id non-uuid dengan **400 sebelum** menyentuh DB, karena kalau tidak Postgres menjawab
`invalid input syntax for type uuid` dan handler-ku akan berubah jadi `500` untuk sampah.

**Cara langkah ini mendarat, dan satu fakta operasional baru dari keputusan 8.** PR #24 (`4c5e6d0`) → CI #44
`success`. Merge pertama **ditolak**: `PUT /pulls/24/merge` → **HTTP 405**, pesan `3 of 3 required status
checks are expected.` Ini konsekuensi nyata pertama dari `strict: true` yang kupasang di F2/keputusan 8 — branch
yang tertinggal satu merge dokumen (`25d4e5f`) tidak boleh masuk meski delta-nya cuma `TODO.md`. Jalan keluarnya
bukan mematikan strict: `git merge origin/main` ke branch (`8b9ad41`) → CI #45 `success` 06:56:03 → merge lolos
06:56:28 → `1ef9e0b`. Harganya **satu run CI tambahan** (±50 detik) dan itu harga yang memang kubayar di muka
saat memilih strict. CI #46 `success` (push, 06:57:34), **Deploy to Cloud Run #28 `success`** 07:01:22.

**Produksi, sesudah deploy (07:0x UTC).** `portfolio-be` generation 37 → 39 (`portfolio-be-00024-h5m`),
`portfolio-fe` 34 → 36 (`portfolio-fe-00023-g7s`). Semua probe lewat **URL situs publik** (`portfolio-fe-…`)
dan sebagian langsung ke backend:

| probe produksi (tanpa JWT) | hasil |
|---|---|
| `GET` / `DELETE` `/api/admin/contact` | **401** `{"error":"Unauthorized"}` (lewat FE, dan lewat BE langsung) |
| `GET` / `DELETE` / `POST` `/api/admin/projects` | **401** untuk ketiganya — rute yang tidak ada pun tidak lagi jadi oracle |
| `GET /api/admin/contact/bukan-uuid` | **401** |
| `GET /api/admin/` | **401** |
| `GET /api/admin/contact` dengan `Bearer abc.def.ghi` | **401** |
| `POST /api/auth/login` kredensial salah | **401** `Invalid username or password` — **bukan 404**, jadi path yang dulu mati sudah hidup di produksi |
| `POST /api/login` kredensial salah | **401** (yang lama tetap hidup) |
| `POST /api/contact` empat body cacat (`{}`, tanpa email, email non-koheren, name spasi) | **400** keempatnya, tanpa menulis baris |
| `GET /` | **40.699 byte**, jejak `Application error` = 0 — identik dengan sebelum |
| `GET /api/health` | `{"db":"ok","status":"ok"}` |

**Yang masih belum bisa kubuktikan di produksi, dan alasannya konkret.** Klausa "count +1 lewat
`GET /api/admin/contact`" sudah hijau di CI dengan Postgres nyata, tapi belum kukur di produksi karena
membaca inbox butuh JWT produksi, dan JWT produksi butuh `ADMIN_USER`/`ADMIN_PASS` — nilainya ada di Secret
Manager dan aku tidak pernah membaca nilai secret. Jalan lain (psql langsung) juga tertutup, dan sekarang
terukur: `portfolio-pg` **us-central1, Postgres 15.19, satu-satunya IP `10.112.0.2` bertipe `PRIVATE`** —
tidak ada interface publik, jadi tidak ada jalur sah dari laptop. Tidak kupaksakan dengan mengubah
produksi (menambah tag revisi / IP publik / secret baru) hanya demi sebuah angka. Konsekuensinya: baris probe
`b693e544-3001-…` dari langkah (1) **masih ada** di DB produksi dan sekarang *bisa* dihapus — tapi oleh tangan
yang punya login, lewat dashboard, bukan olehku.

**Satu fakta yang perlu nampan, bukan kubungkus.** `GET /admin/dashboard` (halaman, bukan API) menjawab
**200** untuk siapa pun — 10.275 byte HTML cangkang. Tidak ada isinya: `grep` untuk `kontrak-admin`,
`b693e544`, `Inbox`, `Pesan` = **0** kemunculan, karena datanya datang dari `authFetch` yang dijawab 401.
Jadi klausa E13 ("tidak ada satu pun rute admin yang boleh 200") berlaku untuk **rute API**, dan halaman
admin adalah cangkang client-side (`localStorage.admin_token`, 401 → hapus token → `window.location.href =
/admin/login`). Gerbang sungguhnya ada di server, tapi dua hal ini tercatat sebagai utang, bukan sebagai
"bersih": cangkang `/admin/*` publik, dan token di `localStorage` yang terbaca oleh XSS. Keduanya di luar
scope F9 dan tidak kusentuh diam-diam di sini.

### F9 langkah (4) — cv-layout, localhost pengunjung, dan CV yang ternyata ikut berubah (2026-10-05, 07:02 – 07:14 UTC)

**Bug-nya terbukti dari artefak yang di-deliver, tanpa browser.** Produksi sebelum PR ini:

| ukur | hasil |
|---|---|
| `GET /cv-layout` | **200**, 16.167 byte |
| chunk JS yang direferensikan halaman | 9 buah |
| kemunculan `localhost:8080` di kesembilannya | **1**, di `/_next/static/chunks/4884843434ac0d06.js` |
| chunk yang sama memuat | `"http://localhost:8080/api/certificates"` **dan** `"No professional certifications loaded"` — jadi ini memang chunk milik cv-layout |

Bundle produksi menyuruh **browser pengunjung** menghubungi komputernya sendiri. Yang dilihat pengunjung
selalu fallback-nya. Perbaikan: satu baris, `fetch("/api/certificates")` — rewrite `/api/certificates` sudah
ada di `next.config.ts` dan rutenya publik. Baseline lewat `--emit-baseline`: **10 → 9**. Sebelum kucetak, `api-contract-check.mjs` rc=1 dengan
**tepat satu** baris temuan: `Sudah diperbaiki, kecilkan baseline (1): - GET http://localhost:8080/api/certificates`.

**Sisa 9 path mati, dan kenapa tidak kutuntaskan di PR ini:** 5 milik
`GET/POST/PUT/DELETE /api/admin/projects` + `POST /api/admin/sync-github` (rutenya memang tidak ada di
backend — memperbaikinya = fitur baru), 4 milik `POST/DELETE /api/certificates` dan `/api/experience` dari
`admin/page.tsx` (rutenya ada dan protected, tapi dipanggil `fetch()` polos tanpa header `Authorization`).
Kelas yang kedua ini bug yang berbeda dari yang kubersihkan di sini, dan aku tidak mencampurnya supaya
satu sub-langkah tetap satu PR.

**Yang membuat langkah ini bukan sekadar bersih-bersih tripwire.** `src/app/api/cv/route.ts:21` membuka
`http://127.0.0.1:$PORT/cv-layout` dengan puppeteer **di dalam container FE** lalu mencetaknya ke PDF. Di
dalam container itu, `localhost:8080` adalah container FE sendiri — tidak ada yang mendengar di 8080. Artinya
sejak awal, **CV yang bisa diunduh publik** dirender dari halaman yang sertifikasinya kosong. Terukur:

|ukur|sebelum (diukur di langkah 1)|sesudah|
|---|---|---|
| `GET /api/cv` | 774.803 byte `%PDF-1.4` | **783.896 byte**, `%PDF-1.4`, 2 halaman A4 — **+9.093 byte** |
| teks PDF (`pdftotext -layout`) | tidak kuukur waktu itu | `VALIDATIONS / CERTIFICATES` + **FULL-STACK DESIGN / Educative \| 2023**, **ADVANCED REACT PATTERNS / Frontend Masters \| 2023**, **AWS SOLUTIONS ARCHITECT / Amazon Web Services \| 2024** |
| `GET /api/certificates` produksi | 200, 607 byte, **3 baris** | identik |
| `GET /cv-layout` | 200, 16.167 byte | 200, **16.167 byte** (identik — perubahan ada di chunk JS, bukan di HTML) |
| kemunculan `localhost:8080` di 9 chunk halaman | **1** | **0** |
| chunk lama `4884843434ac0d06.js` | dilayani | **404** — bukti revisi baru yang menjawab, bukan cache |

Tiga judul itu muncul dengan `issuer` dan tahun yang cocok dengan `GET /api/certificates`. `pdftotext`
menyusun ulang teks dua-kolom secara berselang-seling, jadi `"advanced react patterns"` tidak lulus sebagai
satu string utuh (`hit=0`) sementara kata-katanya ada; kalau teks dinormalkan jadi satu baris, potongan
`full-stack design`, `aws solutions architect`, `educative`, `frontend masters` semuanya lulus. Atribusi
"delta ini dari langkah (4), bukan (3)" kunyimpulkan lewat eliminasi: di antara dua pengukuran itu yang mendarat
adalah (3) dan (4), dan (3) tidak menyentuh jalur render `/cv-layout`; **aku tidak membandingkan dengan berkas
PDF lama** — URL khas per-revisi tidak tersedia (`gcloud run revisions describe --format='value(status.url)'`
mengembalikan kosong untuk kedua revisi), jadi klaim "sebelumnya sertifikasinya kosong" berdiri di atas
pengukuran byte + pembacaan kode, bukan di atas dua PDF.

**Cara langkah ini mendarat.** PR #25 (`27103d0`, branch sudah sejajar main sehingga tidak kena 405) → CI #47
`success` 07:08:47; job `web` mencetak `Kontrak sesuai baseline: 9 path mati, 0 stub, tidak ada regresi`
dengan hitungan `rute backend 12 (protected: 6)`, `rewrite 9`, `handler lokal 3`, `pemanggilan UI 25 (18 unik)`.
Merge 07:09:17 → `93686e0`; CI #48 `success` 07:10:31; **Deploy #29 `success`** 07:13:36. `portfolio-fe`
36 → 38 (`portfolio-fe-00024-m5v`), `portfolio-be` 39 → 41 (`portfolio-be-00025-s6z`) — backend ikut naik
revisi meskipun **tidak ada berkas Go yang berubah**, pola lama `set-secrets` lalu `set-image`. Revisi
bertumpuk dan tidak dipangkas: **23 revisi `portfolio-be`**, 24 `portfolio-fe`, target rollback F6 tetap utuh.
Gerbang `paths` sekarang punya delapan percobaan dua arah: **lima merge dokumen → 0 run deploy** (empat diukur
di F6, satu di PR #23) dan **tiga merge kode → 1 run** (#27, #28, #29).

**Gerbang lokal untuk (4):** `npm run lint` rc=0 (0 error, 11 warning lama), `npm run build` **rc=0** dan
`npx tsc --noEmit` **rc=0** di dalam container `node:20-alpine` dengan proyek disalin ke layer container.
Di host `tsc` masih menjawab **rc=2** dengan `Cannot find module '../../src/app/api/contact/route.js'` —
itu `.next/types/validator.ts` **milik root dari build docker 2 Oktober** yang basi, bukan typoku; bukti
lengkapnya: di container, types digenerate ulang dan `grep api/contact/route .next/types/validator.ts` = 0.
`.next/` milik root itu bukan typoku dan tidak kuhapus (butuh sudo); ia dicatat di sini sebagai
kondisi lingkungan yang membuat `tsc` host tidak bisa dipercaya, bukan sebagai hasil pekerjaan.

**E13 setelah (1)+(3)+(4).** "turun dari 13" → **ya, 9**. `rc=0` → **ya**. "1 POST dari situs publik terhitung
lewat inbox admin" → **ya di CI** (1→2, inbox == `select count(*)`), **belum di produksi** (butuh JWT-mu).
"401 tanpa JWT" → **ya, dan sudah di produksi** (10 probe, termasuk subtree yang tidak terdaftar).
"go vet + gofmt bersih" → **ya**. "endpoint admin tidak menambah secret yang terbaca CI" → **ya**, `deploy.yml`
tidak pernah berubah di (3) maupun (4); `secretNames` tetap. Tinggal **(2)** email — terblokir kredensial —
dan **(5)** `seedData()`/`AutoMigrate`, **(6)** 13 error gorm. *(Paragraf ini snapshot saat (4) mendarat;
(5) sudah menyusul di PR #27 — bagiannya di bawah.)*

### F9 langkah (5) — skema jadi perintah, dan `psql` yang menolak `TimeZone` (2026-10-05, 07:37 – 08:02 UTC)

**Yang hilang:** `AutoMigrate` dari `initDB()` dan `seedData()` dari jalur start. **Yang masuk:** `-migrate`
dan `verifySchema()` di jalur serve. Bedanya bukan kosmetik: sebelum ini, container yang naik dengan tabel
kosong **menulis baris** — dan ia melakukannya bahkan sebelum `requireEnv("JWT_SECRET")` sempat bertanya,
karena migrasi ada di dalam `initDB()`.

Kupotret perilaku lama itu sebelum menyentuh kode, di DB kosong, dengan biner pra-(5):

```
Seeded Certificates.
Seeded Experiences.
cert=3 exp=2      (dan rc=0 walaupun bind :8080 gagal — itu bahan langkah (6))
```

**Langkah CI baruku sendiri yang merah lebih dulu.** Kupakai `yaml` untuk menarik body langkah dari
`ci.yml` supaya yang kurunkan benar-benar yang akan dijalankan runner, lalu kukirim `bash -e` ke Postgres
15 kosong. Output pertama:

```
psql: error: invalid connection option "TimeZone"
DB uji tidak kosong:  tabel sudah ada
STEP5_RC=1
```

Ini bukan salah DB-nya — DB memang kosong; `T()` mengembalikan string kosong karena `psql` mati, dan
`[ "" = "0" ]` gagal. Penyebabnya dua parser yang tidak sama untuk satu berkas `DATABASE_URL` yang sama:
**pgx (gorm) menerima `TimeZone`, libpq (psql) menolaknya.** Kubuktikan dua-duanya di DB yang sama, supaya
ini tidak jadi tebakan:

| yang dipanggil | conninfo | hasil |
|---|---|---|
| `psql` | `… sslmode=disable TimeZone=UTC` | `invalid connection option "TimeZone"` |
| `psql` | `… sslmode=disable` | `1` |
| biner Go | `… sslmode=disable TimeZone=UTC` | `db: 0/3 tabel belum ada (…)` — koneksi DB sukses, sampai cek skema |

Kuberes: `psql` dapat conninfo sendiri (`PSQL=…`, tanpa `TimeZone`), biner tetap memakai `DATABASE_URL`.
Langkah kontak/inbox yang lama tidak tersentuh bug ini karena mereka sudah menulis conninfo literal tanpa
`TimeZone`. Tanpa kebiasaan menjalankan langkah verbatim, merah ini baru ketahuan di runner.

**Angka langkah (5) di lokal, sesudah perbaikan** (satu-satunya yang kuganti: port DB 5432 → 5435, dan
biner `CGO_ENABLED=0` supaya bisa kuboot di container — host 5432/8080 ditempati `local_postgres` dan
`local_adminer`, keduanya tidak kusentuh):

```
tabel sebelum apa pun: 0/3
boot di DB kosong => rc=1
2026-10-05 14:41:12 db: 0/3 tabel belum ada ([certificates experiences contact_messages]); jalankan `/tmp/portfolio-be -migrate` dulu
2026-10-05 14:41:12 migrate: skema siap
2026-10-05 14:41:12 migrate: skema siap
tabel setelah -migrate dua kali: 3/3
baris setelah -migrate: certificates=0 experiences=0
fixture ditanam: certificates=1 experiences=1
STEP5_RC=0
```

Enam properti terkunci di situ: DB uji benar-benar kosong sebelum apa pun; boot **gagal** dengan `rc!=0`;
pesan sebabnya menyebut tabel; boot yang gagal tidak membuat satu tabel pun; `-migrate` berjalan **tanpa**
`JWT_SECRET`/`ADMIN_PASS` dan idempoten (dijalankan dua kali → tetap 3/3); dan tidak menanam baris.

**Lalu rantainya kuputar penuh**, karena menghapus seed mengubah lebih dari satu langkah — `Kontrak publik`
menuntut `certificates`/`experience` `length>0` dan selama ini yang memenuhinya adalah seed. Langkah 7–10
kuambil dari YAML, hanya `127.0.0.1:8080` → `127.0.0.1:8099`:

| langkah CI | hasil |
|---|---|
| 5 `Skema dibuat eksplisit…` | **rc=0** |
| 6 `Jalankan backend terhadap Postgres nyata` | siap dalam **1** percobaan, melawan skema hasil `-migrate` |
| 7 `Kontrak publik` | **rc=0** — `health={"db":"ok","status":"ok"}`, `length>0` kini dipenuhi **fixture uji** |
| 8 `Kontrak admin (login lalu tulis)` | **rc=0** — `login dengan sandi salah => 401`, cert dibuat `id=d7a80d72-…` |
| 9 `Kontrak kontak` | **rc=0** — `id=aa452c22-…`, `jumlah baris: 0 -> 1`, `email tersimpan: 'kontrak-ci@example.test'`, bentuk `{message}` → `400` |
| 10 `Kontrak inbox admin` | **rc=0** — `GET`/`DELETE` tanpa token `401`/`401`, token rusak `401`, `login: /api/auth/login 144 char, /api/login 144 char`, `sandi salah => 401`, `inbox panjang=2 == psql count=2`, `{"deleted":1}`, `404` idempoten, `400` id cacat |

**Jebakan yang kuraih sendiri di tengah jalan, dan penting untuk tidak kusenyapkan.** Pada percobaan
pertama kukirim berkas langkah yang **belum** kuedit portnya, jadi langkah 7–10 menghantam Adminer di 8080.
Hasilnya `RC=5` dan — yang harus kubaca dengan kepala dingin — `GET /api/admin/contact tanpa token => 200`
diikuti `rute admin bocor tanpa JWT`. **Itu bukan temuan keamanan**: 200 itu halaman login Adminer
(`<title>Login - Adminer</title>` ada di output), bukan backend. Kutulis di sini supaya angka 200 itu tidak
berubah jadi klaim di kemudian hari. Setelah berkas yang benar dijalankan, langkah 10 memberi 401.

Gerbang lain: `gofmt -l` kosong, `go vet ./...` rc=0, `go build` rc=0, `api-contract-check.mjs` **rc=0 dengan
9 path mati / 0 stub** (baseline tidak bergerak — langkah ini tidak menyentuh frontend; hitungan yang tercetak:
`rute backend 12 (protected: 6)`, `rewrite 9`, `handler lokal 3`, `pemanggilan UI 25 (18 unik)`).

**Cara langkah ini mendarat.** PR #27 (`c08fb67`) → CI #51 (`pull_request`, id 37279448013) `success`
(go + web + api); log runner mencetak **persis** angka lokal di atas (`tabel sebelum apa pun: 0/3` …
`fixture ditanam: certificates=1 experiences=1`) — kontraknya dipegang Postgres nyata di runner, bukan
salinan di laptopku. Merge 07:55:46 UTC → `0204b70`; CI **#52** (`push`, id 37280514758) `success` dan
**Deploy to Cloud Run #30 `success`** (07:55:50 → 07:59:47). Gerbang `paths` jadi sembilan percobaan dua
arah: **lima merge dokumen → 0 run deploy** dan **empat merge kode → 1 run** (#27, #28, #29, #30).

Yang diukur `deploy.yml` sendiri di langkah 12 (bukan probeku):

```
portfolio-be traffic: portfolio-be-00026-wl5=100
portfolio-fe traffic: portfolio-fe-00025-dm4=100
backend /api/health => {"db":"ok","status":"ok"}
backend /api/certificates => 3 baris
backend /api/experience => 2 baris
frontend / => 40699 byte
/api/cv => 783896 byte PDF
Verifikasi lulus: kedua layanan serve artefak SHA 0204b70… dengan isi yang benar.
```

Generasi `portfolio-be` 41 → **43** (`portfolio-be-00026-wl5`), `portfolio-fe` 38 → **40**
(`portfolio-fe-00025-dm4`); titik rollback yang dicatat langkah 5 `deploy.yml`: `portfolio-be-00025-s6z` +
`portfolio-fe-00024-m5v`, dan **24**/**25** revisi bertumpuk tidak dipangkas. Backend ikut naik revisi walau
tidak ada berkas Go yang berubah — pola lama `set-secrets` lalu `set-image`.

**Probe produksi sesudah deploy (08:00 UTC).** `health` 200 / 25 byte / 0,357 s; `GET /api/certificates` dan
`/api/experience` tetap 3 dan 2; `GET`+`DELETE /api/admin/contact` tanpa token → **401 / 401**; `POST
/api/contact` bentuk `{message}` → **400**; `/api/cv` **783896 byte** — identik dengan hasil langkah (4), tidak
berubah oleh langkah ini; `/` **40699 byte**, jejak `Application error` = **0**. Yang paling relevan dari
semua itu: revisi baru **boot terhadap skema yang sudah ada** dan melayani traffic 100 %, artinya
`verifySchema()` tidak mengunci siapa pun keluar.

### Baris fiktif yang ternyata sudah hidup di produksi — dan (5) tidak menghapusnya

Ini keluar dari probe, bukan dari rencana. `GET /api/certificates` di produksi hari ini mengembalikan:

| yang disajikan publik | nilai |
|---|---|
| sertifikat | "AWS Solutions Architect" / Amazon Web Services / 2024; "Advanced React Patterns" / Frontend Masters / 2023; "Full-Stack Design" / Educative / 2023 |
| pengalaman | "Senior Software Engineer" / TechNova Solutions / 2023 - Pres; "Fullstack Developer" / Digital Artisan / 2021 - 2023 |

Kelima string itu persis literal `seedData()` yang kuhapus barusan. Bekas mesinnya ada pada cap waktu:
`createdAt` kelima baris jatuh pada **2026-09-23T15:09:36** dan tersebar hanya **41 ms**
(`.063079` → `.104474`) — satu proses, lima insert, bukan lima kali seseorang mengetuk form.

Dua hal yang harus dibedakan dengan jujur:

- **(5) menghentikan penanaman, bukan menghapus yang ditanam.** Langkah ini benar-benar menutup jalan masuk
  (dan `deploy.yml` memang tidak pernah memanggilnya), tapi `seedData()` dulu hanya bertindak kalau tabel
  kosong — jadi **count produksi yang tetap 3 dan 2 di atas bukan bukti bahwa seed berhenti**; itu juga
  akan terjadi oleh biner lama. Bukti yang benar untuk "seed berhenti" adalah angka lokal di dua arah
  (biner lama di DB kosong → `cert=3 exp=2`; biner baru → `certificates=0 experiences=0`) dan langkah 5 di
  runner. Aku menulis pembedaan ini supaya angka "3 baris" tidak terbaca sebagai kesimpulan yang tidak
  mendukungnya.
- **Menghapus kelima baris itu bukan pekerjaanku hari ini.** Jalurnya dua: API admin (`DELETE
  /api/certificates/:id` dan `/api/experience/:id`, butuh token login-mu — nilainya di Secret Manager dan
  tidak pernah kubaca) atau Cloud SQL langsung (private IP, tidak ada jalur sah dari laptop). Yang mana pun
  kamu pilih, itu keputusanmu, bukan otomatisasi yang kugulirkan diam-diam. Kontennya sendiri ada di halaman
  publik situsmu, jadi ini bukan pembersihan kosmetik.

**Batas yang sengaja kubiarkan.** `deploy.yml` **tidak** menjalankan `-migrate`: perubahan model sekarang
menuntut satu langkah manual (`image yang sama` + `DATABASE_URL` produksi) sebelum traffic dipindah, dan
kalau itu terlewat revisi baru **menolak boot** — kegagalan di deploy, bukan di request pengunjung. Ini
kupindah ke README, tidak kupasang sebagai langkah otomatis, karena otomatisasi itu butuh jalur kredensial
DB di `deploy.yml` yang hari ini tidak kuanggap pantas untuk workflow itu. Dan **TODO.md:248 belum selesai
sepenuhnya**: yang dijanjikan di sana "mengganti `AutoMigrate` dengan migration yang berversi" — yang
terhapus adalah *otomatisme saat start*, isinya masih `AutoMigrate`, belum migration file bernomor. Aku
tidak menyebut butir itu beres cuma karena separuhnya sudah.

### F9 langkah (6) — enam yang tersisa, dan satu `rc=0` yang paling berbahaya (2026-10-05, 08:05 – 08:36 UTC)

**Klaim §5 "error gorm yang diabaikan di 13 titik" sekarang punya alat, bukan cuma angka yang dikutip.**
`go-backend/cmd/audit-ignored` (146 baris, `go/parser` AST, hanya berkas top-level modul) menandai setiap
`ExprStmt` yang rantai pemanggilannya berakar ke `DB`/`sqlDB` atau ke `r.Run`/`r.RunTLS` tanpa mengambil
hasilnya. Alat yang sama kukuhkan ke tiga titik riwayat — sumber lama lewat `git archive`, alatnya selalu dari
HEAD, supaya yang berbeda cuma kodenya:

| commit | keadaan | `silent_gorm` | `silent_listen` | rc alat |
|---|---|---|---|---|
| `230eff0` | tip `main` waktu baseline §1 diambil (2026-10-04 15:10 UTC) | **13** | 1 (`main.go:249`) | 1 |
| `c78cb19` | sebelum F9 sama sekali | **13** | 1 | 1 |
| `0204b70` | sesudah (1)(3)(4)(5) | **6** | 1 | 1 |
| `bf11c2d` | sesudah (6) | **0** | **0** | 0 |

Baris pertama itu bukan hiasan: dia mengukuhkan angka baseline §1 — 13 gorm dengan daftar baris yang sama
persis (`173,179,193,199,209,215` + tujuh `seedData()` 255-267) — sekaligus mencatat apa yang **lewat** dari
baseline itu: satu `r.Run` di `main.go:249`. Angka 13 yang kutulis pada 2026-10-04 dapat direproduksi dari
commit-nya sendiri, dan satu error yang berbahaya justru tidak termasuk di dalamnya.

Rincian yang tidak boleh kabur oleh angka bulat: **13 → 6 seluruhnya kerja langkah (5)**, dan tujuh baris itu
(`main.go:268,270-272,277,279-280` di `c78cb19`) hilang karena `seedData()` dihapus, bukan karena errornya
ditutup. Yang kututup di (6) cuma **6** — dua `Find`, dua `Create`, dua `Delete` — ditambah satu `r.Run`.
Kedua `DELETE` sekaligus berubah bentuk mengikuti pola langkah (3): `uuidRe` → 400, `res.Error` → 500,
`RowsAffected == 0` → 404, sukses → `{"deleted":N}`. Sebelum ini keduanya selalu menjawab
`{"message":"deleted"}` dengan 200, termasuk untuk id yang tidak ada dan untuk id yang gagal dihapus.

**Dua kontrol, satu per klaim — karena aku tidak mau memasang gerbang yang belum terbukti bisa merah.**

*Kontrol 1: biner lama dan biner baru di DB yang sama, sepuluh probe identik.* Kubangun `0204b70` dan
`bf11c2d` sebagai biner `CGO_ENABLED=0` di container (`Postgres 15` di network khusus, backend dipublik ke
`127.0.0.1:8099` karena host 5432/8080 masih ditempati `local_postgres`/`local_adminer`), skema dibuat oleh
`-migrate`, lalu kontainer DB kurematikan sementara prosesnya masih hidup:

| probe saat DB mati | biner lama `0204b70` | biner baru `bf11c2d` |
|---|---|---|
| `GET /api/certificates` | **200** `null` | 500 `Gagal membaca sertifikat` |
| `GET /api/experience` | **200** `null` | 500 `Gagal membaca pengalaman` |
| `POST /api/certificates` | **201** `{"id":"", "createdAt":"0001-01-01T00:00:00Z", …}` | 500 `Gagal menyimpan sertifikat` |
| `POST /api/experience` | **201** `{"id":"", …}` | 500 `Gagal menyimpan pengalaman` |
| `DELETE /api/certificates/:id` | **200** `{"message":"deleted"}` | 500 `Gagal menghapus sertifikat` |
| `DELETE /api/experience/:id` | **200** `{"message":"deleted"}` | 500 `Gagal menghapus pengalaman` |
| `POST /api/contact` | 500 `Pesan gagal tersimpan, coba lagi` | 500 (sama) |
| `GET /api/admin/contact` | 500 `Gagal membaca pesan` | 500 (sama) |
| `GET /api/health` | 503 `{"db":"error","status":"unavailable"}` | 503 (sama) |
| `DELETE /api/certificates/bukan-uuid` | 400 `Format id tidak valid` | 400 (sama) |
| **jumlah klaim yang SALAH** | **6** | **0** |

Angka **6** di kolom kiri bukan kebetulan: dia persis sebanyak `silent_gorm` yang dilaporkan alat pada commit
yang sama — jadi alat itu dan gerbangnya mengukur hal yang nyata. Empat baris "sama" juga penting untuk
kejujuran arah sebaliknya: `contact`, inbox admin, `health` dan validasi id **sudah** jujur sejak (1)/(3), jadi
(6) tidak mengklaim apa pun di sana. Bentuk paling jahat dari yang lama adalah `POST` → **201** dengan
`id=""` dan `createdAt 0001-01-01`: klien melihat objek yang tersimpan, padahal tidak ada satu baris pun yang
masuk DB.

*Kontrol 2: `r.Run` yang dibuang ternyata keluar dengan rc=0.* `gin` **mengembalikan** error bind —
`r.Run(":8080")` sendirian berarti "port sudah dipakai" diselesaikan sebagai shutdown normal. Kuhidupkan dua
proses di namespace jaringan yang sama supaya 8080 benar-benar sudah ditempati:

```
biner LAMA (0204b70) => EXIT=0            (tanpa satu pun pesan sebab)
biner BARU (bf11c2d) => EXIT=1
  2026-10-05 08:36:14 Server running on port 8080
  2026-10-05 08:36:14 server: gagal listen di :8080: listen tcp :8080: bind: address already in use
```

Batas dampak yang kutarik dengan jujur: di Cloud Run proses yang mati tetap ketahuan (container tidak pernah
siap), jadi `rc=0` ini **tidak** pernah membocorkan revisi cacat ke produksi. Bahayanya di gerbang dan
supervisor lokal, tempat "keluar dengan 0" dibaca sebagai berhasil — dan di CI lama memang tidak ada satu pun
langkah yang menyentuh bind.

**Satu jebakan mekanis yang baru keluar saat mengulang kontrol ini.** Percobaan pertamaku mati untuk sebab yang
salah: `failed to connect … lookup f9-pg2 … server misbehaving`, `rc=1` sebelum sempat menyentuh `r.Run`.
`openDB()`+`verifySchema()` jalan **lebih dulu** daripada listen, jadi kontrol bind menuntut DB yang hidup.
Runner tidak kena masalah ini karena langkah 12 menjalankan instance kedua sebelum `docker stop` — urutannya
sudah benar, dan itu ketahuan justru karena kukontrol ulang di luar CI.

**Dua langkah masuk `ci.yml`; job `api` 12 → 14 langkah.** `Audit — tidak ada error gorm atau listen yang
dibuang` jadi langkah 5 (sesudah Build, sebelum apa pun menyentuh DB) dan `DB mati menjawab 500, bind gagal
tidak keluar nol` jadi langkah 12 (sesudah keempat langkah kontrak, supaya yang dimatikan adalah DB yang sudah
dipakai). Runner mencetak angka yang sama denganku; kutipan di bawah dari log **`37283637314`** (CI #56, `push` ke `main`) supaya yang dikutip adalah run yang artefaknya memang melayani produksi:

```
silent_gorm=0 silent_listen=0
audit rc=0: nol panggilan yang membuangnya *gorm.DB / r.Run
instance kedua, port 8080 sudah dipakai => rc=1
2026-10-05 08:27:22 server: gagal listen di :8080: listen tcp :8080: bind: address already in use
postgres dimatikan (2f4cd85388c6)
GET /api/certificates => 500 :: {"error":"Gagal membaca sertifikat"}
…
semua jalur menjawab kegagalan DB dengan 500/503, tidak ada 200 palsu
```

Langkah itu memakai `JWT_SECRET`/`ADMIN_PASS` yang sama dengan langkah lain di run yang sama: **random
per-run** dari langkah 3 (`openssl rand -hex 16` / `-hex 12`), bukan kredensial produksi — dan memang itu yang
membuat nilainya boleh muncul di log. Klausa E13 "endpoint admin tidak menambah secret yang terbaca CI" tetap
utuh: `git diff --numstat 5ffdd44 b85ab09` = **3 berkas**: `ci.yml` +74/−0, `go-backend/main.go` +55/−9, alat baru +146/−0. Tanpa
`deploy.yml`, tanpa frontend.

**Cara langkah ini mendarat.** PR #29 (`b85ab09`, commit 08:23:46 UTC) → CI #55 (`pull_request`, id
37283447338) `success` 08:24:36 → 08:25:50; merge 08:26:21 → **`bf11c2d`**; CI #56 (`push`, id 37283637314)
`success` 08:27:33 dan **Deploy #31 (id 37283637204) `success`** 08:30:21. Titik rollback yang dicatat
`deploy.yml` sebelum menyalakan traffic: `portfolio-be-00026-wl5` + `portfolio-fe-00025-dm4`; yang melayani
sesudahnya: **`portfolio-be-00027-wb2`** + **`portfolio-fe-00026-rc2`**. Verifikasinya sendiri: `health
{"db":"ok","status":"ok"}`, `certificates 3 baris`, `experience 2 baris`, `/ 40699 byte`, `/api/cv 783896
byte PDF`, `Verifikasi lulus … artefak SHA bf11c2dac9e759…`. Revisi bertumpuk naik satu: be 24 → **25**, fe
25 → **26** (tetap tidak dipangkas — itu memang target rollback).

**Probeku sendiri di produksi, 08:33 UTC, terpisah dari verifikasi workflow.** `health` 200;
`GET /api/certificates` → 200 **3 baris**; `GET /api/experience` → 200 **2 baris**; **enam rute tulis/hapus
tanpa JWT → 401** (`POST`/`DELETE /api/certificates/:id`, `POST`/`DELETE /api/experience/:id`,
`GET`/`DELETE /api/admin/contact`); `/` 200 **40699 byte** dengan jejak `Application error` **0**; `/api/cv`
**783896 byte** — identik dengan langkah (4) dan (5), dan memang seharusnya: (6) tidak menyentuh frontend,
baseline tripwire tidak bergerak di **9 path mati / 0 stub** (`rc=0`).

Satu angka yang tidak mau kubiarkan jadi klaim di kemudian hari: probe `GET /api/admin/contact` **pertama**
keluar sebagai `curl: (92) HTTP/2 stream 1 was not closed cleanly: INTERNAL_ERROR` dengan kode `000`. Kucoba pemantikannya lagi dan dia
**tidak keluar ulang** — 8 request berikutnya ke rute yang sama semuanya menjawab normal: **5/5 percobaan HTTP/2 dan 3/3 HTTP/1.1 memberi
`401 {"error":"Unauthorized"}`** (24 byte). Jadi: reset stream pada request pertama ke kontainer dingin, bukan
rute yang bocor dan bukan 200 palsu — `000` berarti "tidak ada respons yang terbaca", dan itu sebabnya
persediaanku untuk menyebutnya apa adanya adalah lima pengulangan, bukan satu.

**Yang berubah untuk pengunjung, dan yang tidak.** Aku membaca ketiga pemakai publik sebelum menulis klaim ini:
`dossier/certificates/page.tsx:28`, `components/Dossier/DataCards.tsx:240`, `cv-layout/page.tsx:18`. Di tiga
berkas itu terukur **5 rantai `fetch`, 5 di antaranya bergerbang `r.ok ? r.json() : []`, dan 5 punya `.catch`**
(`grep -c` per berkas: 1/1/1, 3/3/3, 1/1/1). Artinya untuk pertama kali mereka bisa menerima non-2xx dari
backend, dan jawabannya **daftar kosong** — bukan render yang pecah oleh `null`. Aku **tidak** mengukurnya di
browser: satu-satunya cara memicunya adalah mematikan DB produksi, dan itu bukan sesuatu yang kulakukan untuk
melihat tampilan. Rute tulis/hapus tidak berubah bagi siapa pun yang bukan admin, karena mereka 401 sebelum
sempat menyentuh DB.

**`npx tsc --noEmit` merah di laptop, hijau di runner — dan sebabnya artifact, bukan regresi.** Satu-satunya
error: `.next/types/validator.ts:143 → Cannot find module '../../src/app/api/contact/route.js'`, yaitu berkas
stub yang kuhapus di langkah (1). `.next/` di-gitignore (`nextjs-frontend/.gitignore:17` = `/.next/`;
`git ls-files nextjs-frontend/.next` = **0** berkas) dan hari ini dimiliki `root`, bekas build docker
2026-10-02 09:17 — **tidak kuhapus**, karena itu direktori kerja punya siapa pun yang menjalankan `next build`
di mesin ini, dan menghapusnya bukan bagian tugas. Pembedanya kukunci dua arah: (a) `tsc --noEmit` dengan
`include` yang sama **minus** dua entri `.next/**` → `rc=0`, `0 error TS` (konfig sementara, kubuang lagi);
(b) job `web` pada run 37283637314: `Install deps`, `Lint`, `Type-check`, `Build` = **success** semuanya, dan
di runner langkah 5 (`Type-check`) memang jalan **sebelum** langkah 6 (`Build`), jadi tidak ada `.next/types`
yang bisa ikut diperiksa. Artefak lama yang menunjuk berkas mati — itu saja, dan aku menulisnya supaya angka
`rc=1` lokal tidak berubah jadi klaim "tipe rusak".

**Gerbang lain, terukur di `bf11c2d`:** `gofmt -l .` kosong, `go vet ./...` rc=0, `go run ./cmd/audit-ignored .`
rc=0 (`silent_gorm=0 silent_listen=0`), `api-contract-check.mjs` rc=0.

**Dua dokumen yang masih menulis 13 itu sebagai keadaan sekarang, dikoreksi di PR ini.** `README.md` (baris sisa
M11) dan `DEPLOY.md` §Verifikasi pasca-deploy (alasan cek isi: "karena `main.go` mengabaikan error GORM di 13
titik"). Yang pertama sekarang menunjuk alatnya; yang kedua tetap mempertahankan ceknya dengan alasan yang
berbeda — `cmd/audit-ignored` menjaga **kode**, bukan menjaga Postgres produksi, jadi kegagalan DB setelah
image dibangun tetap hanya kelihatan di respons. README §"Cek yang sama dengan CI" dapat satu baris
(`go run ./cmd/audit-ignored .`), dan **kelima baris blok itu kukerjakan apa adanya** di mesin ini:
`npm run lint rc=0`, `npx tsc --noEmit rc=1` (artifact di atas), `api-contract-check rc=0`, `gofmt -l` kosong +
`go vet rc=0`, `audit rc=0`.

### Batas langkah (6) — sisa §5 yang belum tertutup

Dari empat butir §5, (6) menutup satu secara penuh. Yang masih terbuka, dengan nama aslinya: **`EMAIL_USER`/
`EMAIL_PASS`** (langkah 2, terblokir padamu) dan pola fire-and-forget yang menyertainya — *(catatan setelah
(2a) mendarat: yang terblokir kredensial tinggal **mengirim**; bagian "menyapa Gmail dengan kredensial kosong"
sudah ditutup lebih dulu lewat #31, lihat bloknya di bawah, dan fire-and-forget memang belum disentuh)*;
*(catatan setelah **2b** mendarat: `EMAIL_USER`/`EMAIL_PASS` tidak lagi terblokir padamu — keduanya sudah jadi
secret berversi dan sudah sampai ke proses `portfolio-be-00029-wpx`. Yang menahan klausa E13 sekarang cuma satu
POST dari situs publik, dan itu juga satu-satunya aksi yang belum bisa kukerjakan sendiri karena barisnya tidak
bisa kuhapus lagi)*;
**5 dead path admin**
di `admin/projects/page.tsx` (+ 4 yang menuntut token); dan **"migration yang berversi"** — `-migrate` masih
berisi `AutoMigrate`, bukan migration file bernomor. Yang terakhir ini tetap kutulis ulang di setiap blok
supaya "langkah 5 sudah mendarat" tidak pernah terbaca sebagai "skema sudah berversi".

### F9 langkah (2a) — email berhenti menyapa Gmail sebelum ada yang bisa disapa (2026-10-05, 13:47 – 14:12 UTC)

Yang bisa dikerjakan dari langkah (2) **tanpa** kredensial, dikerjakan; sisanya (2b) memang tidak bisa.

**Apa yang berubah (empat berkas, +102/−15).** `SendEmail` sekarang mengembalikan `ErrNotConfigured` lebih dulu
kalau `EMAIL_USER`/`EMAIL_PASS` kosong — sebelum `gomail.NewDialer` sempat membuka apa pun. `From` tidak lagi
dibakar sebagai literal alamat pribadi (`mailer.go:12` yang lama), sekarang = akun yang diautentikasi, karena
Gmail menolak `From` yang bukan pengirimnya. `main.go` memecah satu cabang `if err != nil` jadi tiga nasib yang
semuanya membawa id pesan: `email terkirim ke …` / `email dilewati, …` / `gagal kirim email: …`.

**Kenapa ini bukan kosmetik — produksi sudah membayarnya.** `gcloud logging read` pada `portfolio-be`,
`--freshness 168h`, memisahkan **3** baris kegagalan kirim, dan ketiganya adalah jawaban SMTP sungguhan:

```
2026-10-05T05:52:27Z  contact: gagal kirim email: gomail: could not send email 1: 530 "5.7.0 Authentication Required …
2026-10-04T15:08:40Z  Gagal kirim email: gomail: could not send email 1: 530 "5.7.0 Authentication Required …
2026-10-02T14:30:22Z  Gagal kirim email: gomail: could not send email 1: 530 "5.7.0 Authentication Required …
```

`530` berarti socket-nya **sampai** ke Gmail dan ditolak di sana — bukan koneksi yang gagal. Dan karena
`gcloud logging read` juga menyimpan `revision_name`, ketiga baris itu bisa dikunci ke kode mana yang
berjalan: `portfolio-be-00010-5x9` (revisi yang mengudara pada 2 dan 4 Okt, sebelum semua deploy hari ini)
untuk dua baris `Gagal kirim email` berhuruf besar — string yang lahir di `25787ec` (2026-03-08), yaitu era
**stub yang menjawab sukses tanpa menyimpan apa pun** — dan `portfolio-be-00023-xsf` (dibuat `05:49:48Z`,
deploy langkah (1)) untuk yang `05:52:27Z`. Jadi klaim §1 "mail mati dua lapis" itu kurang tepat: lapis
keduanya bukan mati, tapi *berjalan lalu dipermalukan* — bahkan ketika jalur itu belum menyimpan pesan
samasekali. Revisi yang melayani sekarang: `portfolio-be-00028-8dc`. Yang **tidak** bisa kubaca dari log:
penyebutnya. Dari 17 baris `[GIN]` yang menyebut `/api/contact` dalam 7 hari, cuma **1** yang berstatus `201`,
sementara kegagalan email ada 3 — jadi angka "setiap pesan membuka socket" kusandarkan pada kode dan pada tes,
bukan pada hitungan log akses.

**Gerbangnya punya gigi — diukur dua arah.** Step `Kontrak kontak` kuambil **apa adanya** dari `ci.yml`
(`yaml.safe_load`, 60 baris) lalu kujalankan terhadap harness docker (Postgres nyata + binary statis); yang
berbeda hanya 4 baris mekanis: `psql` lewat `docker exec`, dan `127.0.0.1:8080` → `8099`/`8098`. Tabel
`contact_messages` direset ke keadaan CI (`0` baris) **sebelum masing-masing run**, supaya kedua run mulai dari
state yang sama:

| binary yang melayani | rc | waktu | baris penutup |
|---|---|---|---|
| `3e0265a` (pra-2a) | **1** | 15s | `SMTP tetap disapa padahal EMAIL_USER/EMAIL_PASS tidak ada:` → `gagal kirim email: dial tcp 142.251.12.108:587: i/o timeout` |
| commit `1f9c70f` (ini) | **0** | <1s | `email tanpa kredensial => dilewati, tercatat dengan id pesan, socket SMTP tidak dibuka` |

Keduanya tetap menjawab `400` untuk `POST` bentuk `{message}` (yang dulu dijawab 200 palsu) dan `email
tersimpan: 'kontrak-ci@example.test'` untuk payload persis `Contact.tsx`.

**Tiga koreksi pada drafku sendiri, semuanya keluar dari angka.** **(i)** Draf pertama menulis `sleep 1`
sebelum men-*grep* log. Kuukur latensi kegagalan `DialAndSend` di mesin ini: **10s** (timeout bawaan
`gomail`, `smtp.go:61` — `Dialer`-nya tidak punya field timeout sendiri). Dengan 1s, CI akan menjawab
"jalur email tidak tercatat sebagai dilewati" untuk kegagalan yang sebenarnya bernama lain; batas tunggunya
kunaikkan jadi 15s, dan jalur bahagia tidak menunggu (lihat angka CI di bawah). **(ii)** Kontrol pertama mati di
assertion yang salah — bukan assertion email — karena tabelnya masih berisi baris dari run sebelumnya:
`select email … where body='pesan uji kontrak'` mengembalikan **2** baris dan lolos ke perbandingan string.
Itu artefak harness-ku, bukan gerbangnya; CI memulai dengan DB per-kerja yang kosong. Karena itu kedua run
di atas kureset dulu. **(iii)** `grep 'email' /tmp/be.log` pada cabang gagal mencetak `binary file matches`,
bukan buktinya (berkas log hasil `docker logs -f` yang kutruncate berisi NUL). Jadi `grep` di cabang kegagalan
kubeikan `-a`: kalau gerbang ini gagal suatu hari, yang terbaca harus baris SMTP-nya, bukan nama berkasnya.

**Angka di CI (run `37321435827`, PR #31).** `go`/`api`/`web` = `success`; GitGuardian `success`. Dari log job
`api`: `POST /api/contact => id=57871bac-12f8-4fe2-91bf-0c1d7523986a` → `jumlah baris: 0 -> 1` →
`POST /api/contact bentuk {message} => 400` → `email tanpa kredensial => dilewati, …` pada `14:03:00.605`,
yaitu **75 ms** setelah POST (`14:03:00.529`) — jadi loop 15s itu keluar pada iterasi pertama, seperti
didesain. Job `go` mencetak `ok github.com/arkanFzi/website-porto2/go-backend/mailer 0.003s`: **untuk pertama
kali** ada paket Go yang mengembalikan `ok` di CI, sebelumnya modul itu hanya `[no test files]`.

**Tes yang mendarat bersamanya (yang pertama di `go-backend`).** `TestSendEmailTanpaKredensialBerhentiSebelumSMTP`
(3 subtest: keduanya kosong / `pass` belum / `user` belum — semuanya wajib `errors.Is(err, ErrNotConfigured)`)
dan `TestPengirimAdalahAkunYangDiautentikasi` (`GetHeader` From/To/Subject). Negatif kontrolnya: `From` literal
dikembalikan → `header From = ["muhammadarkanfauzi9@gmail.com"], seharusnya ["pengirim@example.test"]`. Di
mesin ini: `gofmt -l` kosong · `go vet ./...` rc=0 · `go build ./...` rc=0 · `go test -count=1 ./...` ok ·
`go run ./cmd/audit-ignored .` → `silent_gorm=0 silent_listen=0` · `npx tsc --noEmit` rc=1 dengan **satu**
error yang sama seperti di (6) (`.next/types/validator.ts` menunjuk `src/app/api/contact/route.ts` yang memang
sudah tidak ada; berkas itu ter-gitignore dan bukan bagian perubahan ini) — sumber yang terlacak kucek ulang
dengan config terpisah: rc=0, 0 galat.

**Mendarat.** `1f9c70f` → PR **#31** (base `3e0265a`) → CI run `37321435827` hijau → merge **`89adbfb`** →
**CI #60** + **Deploy #32** hijau → revisi **`portfolio-be-00028-8dc`**, gambar
`sha256:4c44507278aaf90a…a566`. Sekali catatan API: percobaan merge pertamaku `422` karena kuirim `sha` pendek
(`1f9c70f`); `sha` untuk endpoint merge harus penuh.

**Probe produksi setelah deploy.** `GET /api/health` → `{"db":"ok","status":"ok"}`. `GET /api/admin/contact`
tanpa JWT → **401** pada 5/5 percobaan HTTP/2 dan 3/3 HTTP/1.1, body `{"error":"Unauthorized"}`; `Bearer`
palsu → **401** juga (jadi ini bukan sekadar "tidak ada header"). Env revisi produksi berisi
`ADMIN_USER, DATABASE_URL, JWT_SECRET, ADMIN_PASS, ADMIN_EMAIL, CORS_ORIGINS` dan hitungan nama yang berawalan
`EMAIL_` = **0** — artinya (2a) sedang aktif di produksi sebagai *skip* yang jujur, bukan sebagai `530`.
Probe kali ini **tidak menulis baris baru**: satu-satunya cara memicu jalur email produksi adalah POST sungguhan,
dan baris itu nanti tidak bisa kuhapus sendiri (token admin ada di tanganmu) — jadi satu POST publik itu sengaja
kusisakan untukmu, sekaligus penutup §8(a).

### Batas langkah (2a) — apa yang justru tidak dibuktikan

Bahwa Gmail **menerima** satu pesan: belum, dan itu memang klausa E13 yang tunggu kredensial (2b). Cabang
`gagal kirim email` masih **nol** eksekusi di tes mana pun — satu-satunya cara mengujinya adalah SMTP yang
menyapa balik, dan yang terdekat dengannya adalah `530` produksi di atas. `EMAIL_HOST`/port tetap tidak
kubuat parameter (tidak ada yang memintanya, dan tidak ada yang bisa mengujinya). Pola fire-and-forget
(`go func()` tanpa konteks, tanpa tunggakan, tanpa retry) **masih utuh** — (2a) cuma membuat kegagalannya jujur,
bukan membuatnya bisa dipercaya; itu §5 "melanjutkan pola fire-and-forget" dan ia bukan bagian urutan F9.
Dan yang paling penting untuk tidak terbalik baca: sejak hari ini, **tanpa kredensial, tidak ada satu pun
notifikasi email yang keluar dari produksi** — sama seperti kemarin-kemarin, hanya sekarang itu tertulis
`dilewati` alih-alih menyamar sebagai kegagalan Gmail.

### F9 langkah (2b) — kredensialnya masuk, dan itu masih belum membuktikan apa pun soal Gmail (2026-10-05, 14:50 – 15:20 UTC)

Kedua secret kamu buat di browser. Nilai tidak pernah lewat tanganku dan tidak pernah kubaca — yang kupakai
hanya `describe`, `versions list`, `get-iam-policy`:

```
portfolio-email-user  dibuat 2026-10-05T14:50:21.034420Z  versi 1: enabled  secretAccessor → portfolio-runtime@
portfolio-email-pass  dibuat 2026-10-05T14:54:32.720621Z  versi 1: enabled  secretAccessor → portfolio-runtime@
```

Yang tersisa cuma wiring, dan hanya satu baris: `deploy.yml:117` menerima dua pasangan tambahan
(`EMAIL_USER=portfolio-email-user:latest`, `EMAIL_PASS=portfolio-email-pass:latest`), komentar header di
baris 31 ikut dibenarkan **5 → 7** secret `portfolio-*`. Diff PR-nya `1 file changed, 2 insertions(+),
2 deletions(-)`; nol baris Go dan nol baris TS bergerak. `mailer.SendEmail` sudah membaca kedua env itu dari
prosesnya sejak sebelum #31 — #31 yang membuat jalur itu berhenti sebelum socket dibuka kalau keduanya kosong.

**Kenapa `deploy.yml` memang baru kusentuh sekarang, dan bukan di (2a).** `--set-secrets` menolak nama secret
yang belum punya versi, dan menolak itu bukan menggagalkan email saja tapi **seluruh deploy**. Menulis baris
ini sebelum secret-nya ada = menjamin setiap deploy merah sejak itu. Urutannya karena itu bukan birokrasi:
secret dulu (1 versi + binding), baru baris ini.

**Gerbang lokal pada `1850577c`.** `gofmt -l` kosong · `go vet ./...` rc=0 · `go build ./...` rc=0 ·
`go test -count=1 ./...` → `ok github.com/arkanFzi/website-porto2/go-backend/mailer 0.005s` ·
`cmd/audit-ignored` → `silent_gorm=0 silent_listen=0` · `npx tsc --noEmit -p /tmp/tsconfig.check.json` rc=0 ·
`deploy.yml` dimuat `yaml.safe_load`: ok, `jobs=[deploy]`. Yang terakhir itu satu-satunya pemeriksaan yang benar-benar
menyentuh berkas yang kuubah — tidak ada `actionlint` di repo ini (ia disebut di §7 hanya sebagai catatan bahwa
ia bersih di mesin lain), dan `ci.yml` tidak membaca `deploy.yml` sama sekali.

**Kenapa job `api` tetap hijau justru karena CI tidak ikut dapat kredensial.** Backend di job `api` dijalankan
tanpa `EMAIL_USER`/`EMAIL_PASS`; `ci.yml` tidak punya satu pun referensi `secrets.` (`grep -c 'secrets\.'` = **0**)
dan tidak punya langkah `google-github-actions/auth` (**0** juga). Yang dieksekusi CI tetap cabang (2a), jadi gate
`email dilewati` masih menuntut hal yang benar. Ukuran yang sama menutup klausa E13 "endpoint admin tidak menambah
secret yang terbaca CI": 0 → 0, dan dua secret baru ini hanya sampai ke proses `portfolio-be`.

**Mendarat.** `1850577c` → PR **#33** (base `493808e`, `changed_files=1`, `+2/−2`, `mergeable_state=clean`) →
`go` / `api` / `web` / GitGuardian **success** → merge **`95f91647`** → **CI #64** + **Deploy #33** hijau, deploy
15:09:01Z → 15:13:25Z = **4 m 24 s** → revisi **`portfolio-be-00029-wpx`** pada **100%** traffic
(`latestCreated` == `latestReady` == yang melayani), gambar `sha256:8a3048af7a0ae897…1d3a`. Frontend ikut
dibangun ulang seperti setiap deploy workflow ini dan tetap melayani `portfolio-fe-00028-jlz=100`.
Satu jeda yang wajib dicatat supaya poll berikutnya tidak terbaca sebagai kegagalan: check-runs untuk head SHA
kembali **0 check** selama **8** percobaan beruntun (±160 s) sebelum keempatnya muncul — GitHub mengantri, bukan
menolak. Poll berikutnya (ke-12) sudah `completed` semua.

**Yang berubah di produksi, terukur sebagai pasangan.**

| revisi | entri env | nama berawalan `EMAIL_` |
| --- | --- | --- |
| `portfolio-be-00028-8dc` (pra-2b, hasil (2a)) | 6 | **0** |
| `portfolio-be-00029-wpx` (2b) | 8 | **2** — `EMAIL_USER ← portfolio-email-user`, `EMAIL_PASS ← portfolio-email-pass` |

`GET /api/health` → `{"db":"ok","status":"ok"}`. 20 menit pertama revisi baru: **38** baris log, **38/38**
berlabel `portfolio-be-00029-wpx`, **0** baris mengandung `email`, dan 3 baris mengandung `contact` — ketiganya
`[GIN-debug]` registrasi rute, bukan POST.

### Batas langkah (2b) — nol baris `email` itu belum berarti apa-apa soal Gmail

Ini bagian yang paling mudah dibaca terbalik, jadi kutulis apa adanya: **2b tidak membuktikan satu pun klausa
email.** Jalur kirim hanya diinjak dari handler `POST /api/contact`, dan sejak deploy tidak ada POST. Yang
dibuktikan 2b persis satu hal — kedua env sekarang ada di proses yang melayani request, dilihat dari *spesifikasi*
revisi, bukan dari perilaku. Klausa E13 `email: 1 log run membuktikan SMTP menerima` masih terbuka.

Kenapa probe itu kusisakan untukmu dan tidak kutembak sendiri: satu POST produksi menulis baris `contact_messages`
yang **tidak bisa kuhapus sendiri** — `DELETE /api/admin/contact` butuh JWT, JWT butuh `ADMIN_PASS`, dan itu secret
yang tidak kubaca. Baris probe lama (`b693e544-3001-…`) plus 5 baris seed warisan juga masih menunggu dibersihkan
di `/admin/dashboard`. Satu POST sekarang menutup tiga hal sekaligus: §8(a) (situs publik menulis), klausa count +1
E13, dan klausa email E13 lewat satu baris log `contact <id>: email terkirim ke …`.

Yang tetap belum tersentuh, dan sekarang justru lebih kelihatan:

- **Cabang `gagal kirim email` tetap nol eksekusi**, dan deploy ini tidak bisa menangkapnya: `--set-secrets`
  memvalidasi nama secret + versinya + akses SA, **bukan** kredensial SMTP. App password salah = Deploy #33
  tetap hijau, dan kegagalannya baru muncul sebagai satu baris log pada POST pertama dari pengunjung sungguhan.
  Ini persis bentuk kegagalan yang (2a) buat tidak lagi diam-diam — bedanya, sekarang ada kredensial untuk salah.
- **Alamat penerima tidak kuklaim.** Kalau `portfolio-admin-email` menyimpan alamat yang bukan kotak masukmu,
  Gmail akan tetap menerima dan mengirim ke sana. Nilainya tidak kubaca, jadi klaim apa pun di baris ini akan jadi
  narasi, bukan angka.
- `EMAIL_HOST`/port tetap hardcoded `smtp.gmail.com:587` di `mailer.go`; pola fire-and-forget (`go func()` tanpa
  konteks, tanpa tunggakan, tanpa retry) **masih utuh**. 2b memasang kredensial, tidak mengubah bentuk pemanggilnya
  — itu §5 butir fire-and-forget, dan ia bukan bagian urutan F9.

### F9 penutup — satu POST produksi, dan email pertamanya sampai (2026-10-06, 00:51 UTC)

Kamu mengirim satu pesan lewat form publik. Ini seluruh jejaknya di `portfolio-be-00029-wpx`, satu jendela
log 25 menit, 26 baris:

```
00:51:09.571  Starting new instance. Reason: AUTOSCALING
00:51:10.243  Database connection established; skema terverifikasi.
00:51:10.248  Default STARTUP TCP probe succeeded after 1 attempt for container "backend-1" on port 8080.
00:51:10.363  [GIN] 201 | 28.75ms | 180.248.44.168 | POST "/api/contact"
00:51:13.535  contact 4e8d174a-d5ab-4130-8454-d5e71fe917bf: email terkirim ke muhammadarkanfauzi9@gmail.com
```

**Angkanya.** `terkirim` = **1**, `dilewati` = **0**, `gagal kirim email` = **0**. SMTP memakan **3,171 s**
(10.363763 → 13.535249) dan pengunjung tidak menunggunya: `201` sudah keluar **28,75 ms** setelah POST,
di instance yang baru saja lahir (0,792 s dari `Starting new instance` sampai request terlayani). Itu sekaligus
ukuran pertama pola fire-and-forget di produksi: kalau Gmail menggantung 30 s, yang menderita goroutine tanpa
konteks itu, bukan orang yang mengisi form.

**Klausa E13, butir per butir, setelah POST ini.**

| klausa E13 | status | ukuran |
| --- | --- | --- |
| path mati `api-baseline.json` turun dari 13 | **hijau** | 13 → **9**, sejak langkah (3) |
| `api-contract-check.mjs` tetap `rc=0` | **hijau** | job `api`, CI #64 dan #66 |
| 1 POST dari situs publik **terhitung** lewat `GET /api/admin/contact` (count +1) | **belum** | barisnya tertulis — `201` + id UUID yang hanya ada kalau `Create` sukses — tapi hitungannya lewat API admin, dan itu butuh JWT-mu |
| 401 tanpa JWT | **hijau, diukur ulang di revisi email** | 3/3 ke backend langsung, 3/3 lewat frontend, `Bearer` palsu → 401 |
| email: 1 log run membuktikan SMTP menerima | **hijau** | `00:51:13.535` di atas, dicocokkan dengan Gmail `07.51 WIB` (= 00:51 UTC, +7) |
| `go vet` + `gofmt` bersih | **hijau** | rc=0 / kosong, pada `1850577c` |
| endpoint admin tidak menambah secret yang terbaca CI | **hijau** | `grep -c 'secrets\.'` di `ci.yml` = **0**, `google-github-actions/auth` = **0** |

**Tiga klaim di blok (2b) yang barusan dibetulkan kenyataan.** (i) "Alamat penerima tidak kuklaim" — sekarang
terkirim dan kotak masuknya memang punyamu, jadi `portfolio-admin-email` tidak salah arah. (ii) "Cabang
`gagal kirim email` tetap nol eksekusi" — masih benar, tapi sekarang nol-nya setelah jalur itu **pernah hidup**,
bukan sebelum. (iii) "2b tidak membuktikan satu pun klausa email" — benar saat ditulis, dan tepat satu POST
mengubahnya.

### Yang keluar dari membaca pesan yang sampai, bukan dari log

Ini tiga temuan yang tidak akan pernah keluar dari `grep` log produksi, dan semuanya milik jalur yang baru saja
sah dipakai:

1. **Tidak ada `Reply-To`.** `newMessage` (`go-backend/mailer/mailer.go:29-38`) menyetel `From`, `To`, `Subject`,
   body — dan berhenti di situ. Gmail menampilkan **Balas** yang mengarah ke `muhammadarkanfauzi9@gmail.com`,
   yaitu ke dirimu sendiri, karena alamat pengunjung (`arkanfauzi.sekawanmedia@gmail.com`) cuma hidup sebagai
   teks di dalam body. Perbaikannya satu baris `SetHeader("Reply-To", …)` + satu assertion di
   `mailer_test.go` yang sekarang cuma mengecek From/To/Subject. **Di luar urutan F9, dan butuh katamu.**
2. **Subjek bukan pilihan pengunjung.** `Contact.tsx:24` membakar `subject: \`Visionary Project : ${form.name}\``,
   sementara form-nya sendiri hanya punya `name`/`email`/`message`. Karena itu nama yang kauisi ("anonymous")
   naik ke baris subjek dan subjek sungguhan tidak pernah ada. Bukan bug — keputusan bentuk, dan sekarang
   terlihat.
3. **`To` == `From`.** `ADMIN_EMAIL` dan `EMAIL_USER` adalah akun yang sama, jadi Gmail menulis "kepada saya".
   Jalan. Tapi itu berarti satu secret (`portfolio-admin-email`) adalah satu-satunya tempat rute notifikasi bisa
   dipindah, dan tidak ada yang mengujinya.

**Satu instrumen yang kucoba lalu kutolak.** `watch.yml` melaporkan `rows=17`, dan terbaca seperti hitungan baris
DB. Bukan: itu `grep -c` atas TSV vonis komponennya sendiri (`watch.yml:370-374`). Jadi tidak ada satu pun jalur
sah dari laptop untuk membaca `contact_messages` tanpa tokenmu, dan butir "count +1" di tabel di atas tetap
punya-mu: **login ke `/admin/dashboard`**, pastikan `4e8d174a-d5ab-4130-8454-d5e71fe917bf` muncul, sekalian
hapus baris probe `b693e544-3001-…` dan 5 baris seed warisan (§8 butir a dan d).

**Satu lead keluar dari screenshot kotak masukmu, bukan dari pekerjaan ini:** GitGuardian mengirim
**"ArkanFzi/website-porto2 — 1 internal incident detected"** dua kali — `Generic Password` pada
2026-10-05 06:02:28 UTC dan `Username Password` pada 2026-10-04 15:32:39 UTC. Kalimat pertamaku tentang ini
("check GitGuardian hijau pada setiap run") **salah**, dan blok investigasi di bawah mengoreksinya dengan
angka.

### Investigasi GitGuardian — dua email itu nyata, dan klaim pertamaku tentangnya salah (2026-10-06, 00:58 – 01:04 UTC)

**Koreksi duluan, karena ini yang paling mahal.** Aku menulis "check `GitGuardian Security Checks` di CI hijau
pada setiap run". Tidak. Yang terukur dari `commits/{sha}/check-runs`:

| commit | waktu (committer, +07) | verdict GitGuardian | judul check-run |
| --- | --- | --- | --- |
| `98a7057` | 2026-10-04 22:32:39 = **15:32:39 UTC** | **failure** | `1 secret uncovered!` |
| `e3ce49d` (commit yang justru *memperbaiki*) | 22:36:12 | **failure** | `2 secrets uncovered!` |
| `f07fddb` | 22:38:42 | success | `No secrets detected ✅` |
| `4c5e6d0` (langkah F9 (3)) | 2026-10-05 13:02:28 = **06:02:28 UTC** | **failure** | `1 secret uncovered!` |

Dua angka UTC di baris 1 dan 4 **persis** waktu kedua email. Jadi email itu bukan backlog yang mengambang —
keduanya punya commit, dan keduanya bisa ditunjuk.

**Kenapa merah tetap bisa masuk.** `GET /branches/main/protection/required_status_checks` hari ini:
`{"strict":true,"contexts":["go","web","api"]}`. **`GitGuardian Security Checks` tidak ada di daftar itu.**
Buktinya bukan teori: PR #24 (head `4c5e6d0`, check GitGuardian `failure`) di-merge pada
2026-10-05T06:56:28Z, sehari setelah proteksi dipasang. Gerbangnya menyala, dan tidak ada yang memblokir.

**Apa yang sebenarnya ditandai — dan apa yang tidak.**

- `98a7057` menyimpan literal `ci-only-password` / `ci-only-jwt-secret` / `ci-only-admin-pass` di `ci.yml`.
  Branch-nya `chore/gerbang-ci`, **PR #2 tidak pernah di-merge** (`merged_at = null`), dan
  `git log origin/main -S'ci-only-admin-pass'` → **kosong**. Nilai itu tidak pernah masuk riwayat `main`.
  Yang masuk dari jalur itu adalah `f07fddb`, dan commit itulah yang GitGuardian sebut `No secrets detected ✅`.
- `4c5e6d0` — yang ini **memang masuk `main`** — menandai satu string: `"password\":\"tidak-terdaftar\"` di
  `ci.yml:336`, yaitu sandi salah yang dipakai assertion "login dengan sandi salah harus 401". Bukan kredensial;
  tapi bentuknya persis yang dicari detector, dan ia **masih ada di HEAD**, jadi akan menyalakan GitGuardian
  lagi setiap kali blok itu tersentuh.
- Yang tidak ditandai apa pun: repo ini **public** dengan `secret_scanning` + `secret_scanning_push_protection`
  **enabled**, dan `GET /repos/…/secret-scanning/alerts` → **0 alert**. GitHub sendiri tidak akan menangkap
  bentuk *generic password*: `secret_scanning_non_provider_patterns` = **disabled**,
  `secret_scanning_validity_checks` = **disabled**. Jadi "0 alert dari GitHub" dan "1 secret dari GitGuardian"
  keduanya benar dan tidak saling meniadakan.
- Nilai produksi tidak pernah lewat jalur itu sama sekali: scan literal di tree HEAD untuk
  `(password|passwd|secret|api[_-]?key|access[_-]?token|bearer) = "<literal>"` di luar lockfile → **0**
  hit; `ADMIN_USER`/`ADMIN_PASS`/`JWT_SECRET` di `ci.yml` hari ini semuanya di-generate
  (`openssl rand -hex`, `ci.yml:124-125`) dan yang asli ada di Secret Manager.

**Vonis.** Tidak ada kredensial sungguhan yang pernah bocor, dan tidak ada yang perlu dirotasi karena alasan ini.
Yang nyata adalah **satu celah kebijakan**: sebuah check bisa `failure` di PR dan merge tetap jalan, karena yang
dibutuhkan hanya `go`/`web`/`api`. Itu keputusanmu, bukan task-ku — dua opsi yang tersedia:

1. **Bikin string itu berhenti berbentuk kredensial** (mis. `"$ADMIN_PASS-salah"` dari fixture yang sudah ada,
   seperti baris 223 yang lolos) → GitGuardian diam tanpa mengubah kebijakan apa pun. Kecil, lokal, bisa kuerjakan.
2. **Tambahkan `GitGuardian Security Checks` ke required contexts** → merah benar-benar memblokir, tapi setiap
   false positive ikut memblokir merge, dan itu mengubah kebijakan semua PR. Tidak kukerjakan tanpa katamu.

### Opsi 1 dieksekusi — dan scanner-nya mengajuku satu hal yang belum kutahu (2026-10-06, 01:15 – 01:48 UTC)

Katamu opsi 1. Yang dikerjakan ternyata bukan cuma baris 336: `grep` menemukan **satu lagi** dengan bentuk
sama, `ci.yml:394` di langkah "DB mati menjawab 500, bind gagal tidak keluar nol", dan itu yang
menginterpolasi `$ADMIN_PASS` fixture asli. Dua-duanya dipindah ke `jq -nc --arg`.

**Angka sebelum push.** `yaml.safe_load` → `jobs=[go, web, api]`; 19 langkah `run:` diekstrak dari YAML
dan masing-masing dilewat `bash -n` → **0 gagal**; `grep -In` untuk kedua bentuk pasangan terkutip
(dengan dan tanpa backslash) di `.github/workflows/*.yml` → **0**; payload yang benar-benar dikirim
dijalankan langsung dan dicetak — isinya sama persis dengan sebelumnya, hanya cara merakitnya yang ganti.

**Lalu PR-nya merah dengan cara yang menarik.** `9e49a14` → `go`/`api`/`web` **success**, GitGuardian
**`failure`**, dan tabel temuannya menunjuk `R336`. Bukan kode — **komentarku sendiri**:

> `# Bentuk jq --arg, bukan pasangan terkutip username/password: pasangan terkutip yang`

Kata `password` disusul titik dua lalu sebuah kata, dan itulah yang dicari detector `Generic Password`.
Kode yang kuperbaiki lolos; prosanya yang tidak.

**Commit susulan tidak membersihkan temuan.** Komentar kubuang (`ed0aee6`), poll lagi, check-run tetap
merah — tapi kalimatnya berubah: "1 secret **were** uncovered from the scan of **2 commits**", dengan
temuan yang tetap menunjuk `9e49a14`/R336. Scan GitGuardian atas sebuah PR adalah scan **riwayat commit
PR itu**, bukan isi akhirnya.

| SHA | isi branch | GitGuardian | yang ditunjuk |
| --- | --- | --- | --- |
| `9e49a14` | kode bersih + komentar berbentuk kredensial | **failure** | `ci.yml` R336 |
| `ed0aee6` | komentar dibuang, isi branch identik | **failure** | `9e49a14` R336 (lama) |
| `20c16ea` | **satu commit**, isi branch identik, riwayat bersih | **success** | — |

Baris ketiga adalah instrument yang sebenarnya dari klaim opsi 1 — bukan "kodenya sudah rapi", tapi "isi
akhir `ci.yml` tidak lagi berbentuk kredensial". Branch-nya dibuat dari `origin/main`, isinya
`git checkout ed0aee6 -- .github/workflows/ci.yml`; diff `1 file changed, 7 insertions(+), 2 deletions(-)`,
identik dengan PR #36. #36 kututup dengan komentar yang menjelaskan kenapa, bukan karena isinya salah.
Badan PR #38 juga kusapukan pola yang sama (`hit=0`, 2 596 karakter) supaya eksperimen "riwayat bersih =
hijau" tidak terconfound oleh teks yang sedang diuji.

**Dan ini angka yang dulu tidak kupunya untuk opsi 2.** Kalau `GitGuardian Security Checks` jadi required
context, PR berbentuk #36 tidak bisa digabung tanpa rewrite history — dan `strict: true` + larangan
force-push membuat jalannya keluar cuma satu: branch baru. Detector itu terbukti bisa dipuaskan
(`20c16ea`) **dan** bisa dinyalakan oleh sebuah kalimat (`9e49a14`). Keputusanmu tetap, tapi sekarang
berangka.

**Mendarat.** `20c16ea` → PR **#38** → `go`/`api`/`web`/GitGuardian **success** → squash **`e99cf67`** →
CI run **#74** + Deploy run **#34** **success** → `portfolio-be-00030-7wc` dan `portfolio-fe-00029-zqv`
@100%. Entri env revisi baru tetap **8**, dengan **2** nama berawalan `EMAIL_` yang menunjuk secret yang
sama — tidak ada yang berubah di sana.

### Reply-To — dan satu klaimku soal injeksi header yang kukoreksi sebelum sempat masuk kode (2026-10-06, 01:22 – 01:48 UTC)

Rencana pertamaku menulis gerbangnya berbunyi: tanpa filter, CRLF di `Reply-To` "bisa menempel header
baru di badan email". Aku ukur dulu, dan **salah**: gomail menetralkan nilai header dengan RFC 2047, jadi

```
Reply-To: =?UTF-8?q?hit@example.test=0D=0AX-Injected:_bukti?=
```

tetap **satu baris**; `X-Injected` tidak pernah berdiri sendiri jadi header. Komentarku dibuang dari kode,
dan `TestCRLFTidakMenjadiBarisHeaderBaru` mengunci perilaku pustaka itu supaya orang berikutnya tidak
menyimpulkan hal yang sama dariku. Gerbang `mail.ParseAddress` tetap dipasang, dengan alasan yang benar:
encoded-word semacam itu bukan alamat yang bisa dibalas — lebih baik header-nya hilang daripada salah.
Handler sudah memvalidasi `row.Email` di `main.go:366`, jadi ini defense-in-depth di batas paket, bukan
satu-satunya pagar.

**Yang berubah.** `mailer.SendEmail(to, replyTo, subject, body)` — satu parameter baru, satu call site
(`main.go:388`) yang sekarang mengirim `row.Email` pengunjung; `newMessage` memasang `Reply-To` hanya
kalau nilainya lolos `mail.ParseAddress`.

**Angka.** `go test -count=1 ./mailer/` → **4 PASS** (`TestSendEmailTanpaKredensialBerhentiSebelumSMTP`
3 sub-case, `TestPengirimAdalahAkunYangDiautentikasi` dengan From/To/Reply-To/Subject,
`TestReplyToBukanAlamatTidakMasukHeader` 6 input jahat, `TestCRLFTidakMenjadiBarisHeaderBaru`) ·
`gofmt -l .` kosong · `go vet ./...` rc=0 · `go build ./...` ok · `cmd/audit-ignored` →
`silent_gorm=0 silent_listen=0` · diff 3 file `+71/−6`.

**Satu titik data baru soal `strict: true`.** PR #37 sempat hijau penuh di `a3bbbb9`, lalu `main` bergerak
oleh #38 dan branch-nya jadi tertinggal; dengan proteksi §F2 satu-satunya jalan adalah
`git merge origin/main` → commit merge `564900c` → keempat check **success** lagi → squash **`29757ca`** →
CI run **#76** + Deploy run **#35**. Tidak ada force-push di seluruh rangkaian ini.

**Yang belum terbukti.** Bahwa balasan benar-benar mengarah ke pengunjung. Itu hanya bisa dibaca dari
header `Reply-To` pada pesan yang benar-benar datang, dan itu butuh **satu POST lagi** ke form publik —
satu email baru ke inbox-mu dan satu baris baru ke `contact_messages`. Tidak kukirim tanpa katamu.

### Yang tidak kubebereskan di M12 (biar tidak kelihatan lupa)

`roles/editor` pada `…@cloudservices.gserviceaccount.com` (SA milik Google, bukan kita); `roles/pubsub.publisher`
project-level pada SA compute — yang terukur hanya penerbit pada 2 topic (`pickertime-pb-deploy-results`,
`pickertime-pb-backups`) dan keduanya sudah punya binding topic-level, jadi peran project-level itu
**kemungkinan besar** tinggal menutupi publish ke 4 topic lain yang tidak ada binding-nya (`agentic-alerts`,
`gog-gmail-watch`, `gog-gmail-dead-letter`, `pickertime-pb-deploy` — sensus topic lengkap 6, terukur hari ini);
tidak kuhapus karena
di luar yang kamu izinkan; grant pubsub yang
sama terpasang di **kedua** SA VM padahal salah satunya hampir pasti inert (konsumennya tidak
terattribusi); `gs://ai-agent-triage-batch-1790307337` tanpa grant; **6 binding
`roles/secretmanager.secretAccessor` pada SA compute** (`portfolio-database-url`, `portfolio-admin-pass`,
`portfolio-admin-email`, `portfolio-cors-origins`, `portfolio-jwt-secret`, `gog-keyring-password`) — inert
hari ini, tapi itu satu-satunya sisa M12 yang menguasakan **nilai**, dan perlu katamu untuk dicabut;
2 binding storage pada SA compute yang sama (`objectAdmin`/`objectViewer`, lihat tabel F6); Cloud SQL yang
**belum kunumerasi** (perintahnya tidak ada di gcloud ini); `metricWriter` terpasang tapi
buktinya belum dapat; build image yang tidak reproducible — dan **satu kasus lagi terukur 2026-10-06**:
nol file frontend berubah, digest frontend tetap baru (§7 "Catatan jujur" #5, perluasan); artefak CI ≠ artefak produksi (masih benar, dan `deploy.yml` tidak
pura-pura mengesahkannya); `allUsers → roles/run.invoker` (memang publik by design).

---

## 9. Sisa kerja setelah F9 — rencana, dan andil yang butuh katamu (ditulis 2026-10-06 02:45 UTC)

Nol baris kode di bagian ini. Isinya daftar kerja yang tersisa, dan tiap butir dikunci satu angka supaya
"butuh keputusanmu" bisa dijawab **sekali**, bukan ditanya ulang tiap sesi. Rekomendasiku kutulis, tapi
yang di bawah ini **tidak kukerjakan** sebelum butirnya dijawab: B1–B3, C1–C6, D1–D3, dan cabut-grant.

### 9.0 Angka yang kuukur sendiri untuk menulis bagian ini

| Pengukuran | Angka |
|---|---|
| Klausa E13 "401 tanpa JWT", **dua origin**, 02:44 UTC | `GET /api/admin/contact` **401** · `GET /api/admin/contact/1` **401** · `GET /api/admin/dashboard` **401** · `GET /api/admin/messages` **401** · `POST /api/admin/contact` **401** · `DELETE /api/admin/contact/1` **401** · `GET` dengan bearer `tidak-valid` **401** → **7/7, nol 200**. Via origin frontend (rewrite `next.config.ts:12`): GET **401**, POST **401**. Kontrol supaya 401 itu bukan 404 menyamar: `/api/health` via FE **200**, `GET /api/contact` via FE **405** |
| Yang memang sengaja terbuka | `/` **200**, `/admin/dashboard` **200**, `/cv-layout` **200** — cangkang halamannya; datanya 401 (baris di atas) |
| Env service frontend | **1** nama: `BACKEND_URL` = URL publik backend. Fallback `http://localhost:8080` di `next.config.ts:3` dipakai **sisi server** saat build-arg tidak ada, tidak pernah dilihat browser — beda kelas dengan bug cv-layout yang ditutup F9(4) |
| Revisi yang melayani | `portfolio-be-00031-xtr` @100 (hasil Deploy #35) · `portfolio-fe-00030-phn` @100 |
| E7 pengukuran **(11)** | merge `b68183d` (PR #39, dokumen saja) → `CI` **#78 `success`**, run `Deploy to Cloud Run` **0**, revisi yang melayani tidak berubah |
| Build tidak reproducible, kasus frontend | `29757ca` mengubah **nol** file frontend; digest FE tetap berubah: `12bd7e2b…` → `ec59a79e…` (§7 "Catatan jujur" #5 + perluasannya) |
| **A0** — fire cron `37 2 * * *` hari ini | diukur **enam** kali: 02:37:11, 02:44:24, 02:51, 02:59:42, 03:20:51, 03:31:31 UTC → `total=7`, baris `event=schedule` **tetap 1** pada setiap pengukuran. **Belum** terbukti gagal: fire kemarin baru tiba 6 jam 58 menit setelah menit cron-nya, jadi batas bawah "sudah lewat jadwal" baru sah ±14:00 UTC |
| Verifikasi browser (puppeteer headless, tanpa menyentuh server) | `/cv-layout` **2433** karakter teks ter-render, `/api/certificates=200`, `linkLokal=0`; `/admin/dashboard` tanpa token = **hanya** gerbang login (**80** karakter: `System Override / Enter Elaris Noir credentials / Username / Password / Access Dashboard`, `inputPwd=1`, **0** panggilan API); dengan `localStorage.admin_token` palsu → `/api/admin/contact=401` lalu jatuh ke gerbang yang sama, 80 karakter. **Semua angka baris ini diulang 03:3x UTC lewat alat yang sekarang ikut di repo** (`node docs/verify/browser-probe.mjs`, §9.7) — run scratch pertama membaca 82, bedanya whitespace tepi, dan yang kukutip sekarang adalah yang reproduksibel |
| `GET /api/cv` di produksi, tanpa token, diukur dua kali | **200** dalam **5,888 s** lalu **200** dalam **4,566 s**, masing-masing **783 896 B**, keduanya `%PDF-1.4` — jadi tidak ada hasil yang di-cache; tiap panggilan = satu render browser nyata. Batas kontainer: FE `containerConcurrency=80`, `timeout=300`, **1 Gi / 1000m**; BE `80/300/512Mi/1000m` |
| Census branch | `22` remote; **16** sudah jadi ancestor `main`; 6 bukan: `ci/deshape-tanpa-riwayat-noda`, `docs/gitguardian-clean-room`, `feat/f9-3c-reply-to` (ketiganya 0 commit unik — sudah squash), `docs/f9-penutup` (2), `chore/gerbang-ci` (2), `ci/deshape-string-sandi-ci` (2, dan ini branch PR **#36 yang kututup tanpa merge**) · **37** branch lokal |
| Migrasi di jalur deploy | `grep -c migrate .github/workflows/deploy.yml` = **0**, padahal `-migrate` ada di `main.go:151` |
| Permukaan secret yang terbaca CI | `grep -c 'secrets\.' ci.yml` = **0** · `grep -c 'google-github-actions/auth' ci.yml` = **0** (klausa terakhir E13, masih hijau setelah #37/#38) |

### 9.1 Sisa E13: tinggal satu klausa

Enam dari tujuh sudah punya angka. Yang tersisa **count +1** — satu POST dari form publik harus naik jadi
+1 saat dibaca lewat `GET /api/admin/contact`. Instrumennya butuh JWT, JWT butuh `ADMIN_PASS`, dan itu
secret yang tidak kubaca. `watch.yml` pernah kuajukan sebagai alat cadangan dan kamu tolak; penolakannya
benar — itu mengukur hal yang lain.

### 9.2 Batch 0 — tanpa keputusan (sudah kukerjakan)

| | Isi | Status |
|---|---|---|
| **A0** | Baca hasil fire cron 02:37 UTC | **tetap 1/7** pada enam pengukuran (02:37 → 03:31:31 UTC). Ulangi setelah **14:00 UTC**: kalau masih 1, F10 **dihapus** dari daftar (cron tidak layak jadi dasar alarm), bukan di-hold; kalau jadi 2, hold sampai 2026-10-13 |
| **A1** | PR dokumen ini: E7 **(11)**, revisi produksi pasca #38/#37, tabel 401 dua origin, koreksi tanggal F10, §9 | sudah merge (`bad34e5`) |
| **A2** | Verifikasi browser `/admin/dashboard` + `/cv-layout`, dan pengukuran C4 yang tadinya "belum ada angka" | PR ini — angkanya di §9.0, akibatnya ditulis di **C1**, **C3**, **C4** dan menutup butir browser di **D2** |

### 9.3 Batch 1 — butuh satu katamu, bukan keputusan desain

| Butir | Yang perlu kamu tulis | Kenapa bukan aku yang putuskan |
|---|---|---|
| **B1** — drill F7 (clone-from-timestamp) | **"ya"** | Instance clone sementara = **tagihan baru**, dan Cloud SQL belum bisa kunumerasi dari gcloud ini. Sekali "ya", kerjakan sendiri sampai akhir: durasi, biaya, dan apakah `--restore-date` benar-benar mendarat di titik yang kuminta |
| **B2** — count +1 (E13) | **login** ke `/admin/dashboard` lalu sebut angkanya, **atau** izinkan aku memanggil `gcloud secrets versions access portfolio-admin-pass` **tanpa pernah mencetak nilainya** | Yang pertama tidak bisa digantikan alat apa pun. Yang kedua: itu nilaimu, aku tidak mengambilnya tanpa diminta. Setelah angka ada, hapus barisnya tetap butuh kamu (butir 3 di §9.6) |
| **B3** — bukti `Reply-To` di pesan produksi | **"kirimi"** | Efeknya nyata: 1 email masuk ke inbox-mu + 1 baris `contact_messages`. Hanya header pada pesan yang benar-benar datang yang bisa membuktikan #37 |

### 9.4 Batch 2 — butuh pilihan (kolom terakhir = rekomendasiku)

| | Soal | Angka yang membatasi | Rekomendasiku |
|---|---|---|---|
| **C1** | Permukaan publik tanpa batas ada **dua**, dan yang kedua baru kelihatan setelah verifikasi browser: (a) `POST /api/contact` tiap kali = 1 SMTP sungguhan, (b) `GET /api/cv` = 1 render Chrome per panggilan, tanpa autentikasi dan tanpa cache | (a) `201` dalam **28,75 ms**, SMTP **3,171 s** jalan di belakangnya lewat `go func()` (`main.go:388`) — permintaan lambat tidak menahan request, tapi kuota SMTP **habis** tanpa menahan apa pun. Rate limit per-IP **tidak bisa langsung** dipasang: pengunjung menembus rewrite Next (`next.config.ts:10`), BE tidak melihat socket pengunjung, `x-forwarded-for` bisa diisi sendiri, dan bentuk rantai yang sampai ke BE **belum kukukur**. (b) `GET /api/cv` **200/5,888 s** lalu **200/4,566 s**, **783 896 B** keduanya — bukan hasil cache; handler-nya meluncurkan puppeteer lalu men-*fetch* dirinya sendiri lewat loopback (`src/app/api/cv/route.ts:22`, navigasinya di `:25`), jadi **satu render menempati 2 slot** `containerConcurrency=80` (1 render = 2 slot → kapasitas render ≈ **40** sekaligus, dan `timeout=300` berarti satu render yang menggantung menahan slotnya 5 menit). Ini **deduksi dari dua angka yang terukur, bukan load test** — aku tidak menghujani produksi dengan request. Dua catatan yang menahan diri supaya tidak melebih-lebihkan: `/api/github-profile` dan `/api/github-repos` juga memanggil GitHub tanpa token (`route.ts:8` baris `Authorization` dikomentari), **tapi** keduanya pakai `next: { revalidate: 3600 / 600 }`, jadi kuota GitHub per-IP kontainer tidak dipakai ulang tiap kunjungan — permukaannya jauh lebih kecil daripada `/api/cv`; dan 500-nya `/api/cv` menyertakan `details: errorMessage` (`route.ts:51`) yang bentuknya adalah message puppeteer, jadi kalau render gagal klien melihat `http://127.0.0.1:<port>/cv-layout` — loopback, bukan secret, tapi satu-satunya rute FE yang memantulkan error internal ke pengunjung (dibaca dari kode, belum kumunculkan dengan merusak produksi) | **(iii) dulu, dan pisahkan dua butirnya.** (a) ukur bentuk `x-forwarded-for` yang benar-benar diterima BE (1 request, nol perubahan kode) sebelum memilih gin-bucket atau kuota Cloud Run — memasang limiter tanpa tahu IP siapa yang dibaca = pagar salah alamat. (b) `/api/cv` **jauh lebih murah diperbaiki daripada contact**: kontennya tidak berubah-ubah, jadi satu `Cache-Control` publik / dedup in-flight sudah menghapus 2-slot-per-kunjungan, dan `details` cukup dibuang 1 baris. Pola header-nya **sudah ada di repo ini** (`src/app/api/github-repos/route.ts:39` memasang `public, s-maxage=600, stale-while-revalidate=60`), jadi (b) bukan desain baru, cuma meniru yang sudah jalan. Yang (b) tidak perlu pengukuran lanjutan |
| **C2** | Form tidak punya kolom subject; subject disintesis di FE | `Contact.tsx:24` → `Visionary Project : <nama>`; `main.go:388` mem prepend `"Contact Form: "`. Subject produksi hari ini: **`Contact Form: Visionary Project : <nama pengunjung>`**. Dan `subject` **tidak** wajib di backend (`main.go:362` hanya cek name/email/body), jadi `{"email":…,"body":…}` langsung dari curl menghasilkan subject `Contact Form: ` kosong | **Biarkan, sebagai keputusan sadar.** Menambah input subject = permukaan validasi baru (cap 500 rune sudah ada di `main.go:372`) untuk inbox yang cuma kamu baca. Dokumentasinya sudah jujur: README baris "Form kontak" menyebut subject **dibakar** di `Contact.tsx:24` dan "bukan pilihan pengunjung" — jadi tidak ada yang perlu dikoreksi di sana, yang tersisa cuma pilihan produk |
| **C3** | Cangkang `/admin/dashboard` 200 publik + JWT di `localStorage` | 200/200 terukur di 9.0; semua datanya 401. **Sekarang ada bukti yang dirender, bukan cuma status code** (03:2x UTC, puppeteer ke produksi, server tidak kusentuh): tanpa token, `/admin/dashboard` menampilkan **hanya** gerbang login — `80` karakter teks (`System Override / Enter Elaris Noir credentials / Username / Password / Access Dashboard`), **1** input bertipe password, **0** panggilan API, jadi tidak ada satu pun baris data yang ikut ter-render. Dengan `localStorage.admin_token` (kunci sebenarnya, `src/lib/auth.ts:3` — bukan `token`, itu yang bikin probes pertamaku jadi hasil nol) yang kupalsukan, halaman memanggil `/api/admin/contact=401` lalu **jatuh kembali ke gerbang yang sama, 80 karakter**. `localStorage` berarti token terbaca oleh XSS apa pun yang mendarat di halaman itu | **200 tetap** — dan pengukuran di kolom tengah memperkuat itu: yang terbuka cuma form login, tidak ada isi. Yang jadi soal tinggal `localStorage` → **pindah ke cookie `HttpOnly`** kalau kamu pernah membuka admin dari jaringan yang bukan milikmu. Pekerjaan FE+BE+`deploy.yml` sendiri, belum masuk M12, dan jangan dicampur Batch 1 |
| **C4** | DB mati → `500` (sejak #29, sebelumnya `200 + null`): apa yang dirender FE ke pengunjung? | **Sudah ada angkanya, dan saranku di kolom ini sendiri tadi salah sasaran.** Suruhanku "buka `/` di browser, baca apa yang muncul" tidak akan menghasilkan apa-apa: `/` **tidak** memanggil `/api/certificates` sama sekali (terukur: 2 panggilan di beranda = `github-profile` + `github-repos`, panjang teks **1761** baseline vs **1759** saat kumock 500 — selisihnya cuma animasi loading). Konsumen yang sebenarnya ada di `src/app/dossier/certificates/page.tsx:27`, `src/app/cv-layout/page.tsx:17`, `src/components/Dossier/DataCards.tsx:239`, `src/app/admin/page.tsx:45`. Diukur di dua yang pertama, **mock di sisi klien** (`setRequestInterception`: `/api/certificates` → `500`, dan → koneksi di-*abort*) supaya produksi tidak dikutak-atik: `/dossier/certificates` **554 → 231** karakter; `/cv-layout` **2433 → 2338**; `barisError = []` pada **ketiga** kondisi, dan angka 231 muncul **identik** untuk 500 maupun koneksi yang putus. Artinya: bagian itu **menghilang diam-diam**, dan pengunjung tidak bisa membedakan "server bilang gagal" dari "tidak ada data" — tepat kebalikan dari yang dikejar #29 di sisi API (`200+null` → `500` supaya kegagalan terlihat). Mekanismenya terbaca di kode, dan identik di kedua tempat: `src/app/dossier/certificates/page.tsx:28` dan `src/app/cv-layout/page.tsx:18` sama-sama `.then(r => r.ok ? r.json() : [])` — **galat dipetakan ke array kosong**, jadi 500 dan "kosong" tidak pernah sampai ke render | **Sekarang butirnya punya dasar, tapi tetap keputusanmu** — dan angkanya menunjuk satu arah: DB-mati sudah 500 di API, **UI-nya tidak pernah membacanya**. Kalau yang kamu mau adalah konsistensi dengan #29, kerjanya kecil dan jelas: `res.ok` **sudah** diperiksa, cuma hasilnya dibuang — ganti `: []` itu dengan satu state galat yang dirender di tempat grid (2 file publik: `dossier/certificates/page.tsx`, `cv-layout/page.tsx`; ada konsumen ketiga di `src/app/admin/page.tsx:45` tapi di sana yang melihat galatnya kamu sendiri, jadi bukan prioritas). Kalau yang kamu mau justru "pengunjung tidak boleh lihat galat infrastruktur", maka perilaku hari ini sudah benar dan butir ini ditutup sebagai **keputusan sadar**, bukan dibiarkan menggantung sebagai lubang |
| **C5** | Skema berversi belum masuk jalur deploy | `-migrate` ada di `main.go:151`; `grep -c migrate deploy.yml` = **0**; `AutoMigrate` sudah dibuang dari start (F9(5)) — jadi **sekarang** tidak ada satu pun jalan otomatis membuat kolom, termasuk jalan yang benar | **Pasang sebelum perubahan skema kedua.** Kalau ada satu kolom baru yang harus sampai ke produksi, ini bukan opsional lagi — saat itu terjadi tanpa gerbang, "kolom tidak ada" baru terbaca sebagai 500 di produksi |
| **B4** (izin, bukan desain) | Cabut grant berlebih | **6** binding `roles/secretmanager.secretAccessor` pada SA compute (`portfolio-database-url`, `portfolio-admin-pass`, `portfolio-admin-email`, `portfolio-cors-origins`, `portfolio-jwt-secret`, `gog-keyring-password`) — inert sejak F4/F5; `roles/pubsub.publisher` project-level pada **kedua** SA VM padahal 2 topic sudah punya binding topic-level; `gs://ai-agent-triage-batch-1790307337` tanpa grant | **Cabut 6 `secretAccessor` itu lebih dulu.** Runtime sudah terbukti memakai `secretKeyRef` milik SA khusus (env BE = 8 entri, 2 di antaranya `EMAIL_`), jadi yang dilepas memang yang tidak dipakai — dan itu satu-satunya sisa yang menguasakan **nilai**, bukan sekadar bentuk. Prune pubsub: tunggu seminggu audit, jangan sekalian |
| **C6** | Jadikan GitGuardian required context? | Required contexts = `go`,`web`,`api`; GitGuardian **tidak** memblokir. Verdict-nya membaca **riwayat commit PR**, bukan pohon akhir, jadi tidak bisa dibersihkan dengan commit susulan. Tiga percobaan: `9e49a14` **failure**, `ed0aee6` **failure**, `20c16ea` **success** — dua kegagalan terakhir disebabkan **komentarku sendiri** yang kebetulan berbentuk pasangan kunci:nilai | **Tidak.** Yang dibutuhkan bukan gerbang, tapi menghapus **bentuk** yang memicu detektornya — dan itu sudah: 2 literal dibuang (#38), `grep -c 'secrets\.' ci.yml` = **0**. Required context akan memaksa tiap PR bernoda-di-riwayat di-`rebase` jadi 1 commit, dan itu justru **menghapus jejak clean-room** yang dipakai membuktikan klaim ini |

### 9.5 Batch 3 — rumah, tanpa keputusan produk

- **D1 — hapus branch.** **20** dari 22 aman dihapus tanpa kehilangan konten: 16 sudah ancestor `main`,
  4 lainnya squash-merge yang isinya ada di `main` (dibuktikan SHA merge `e99cf67`, `29757ca`, `b68183d`).
  Kusisakan 2: `chore/gerbang-ci` (keputusan §6 butir 2 belum jatuh) dan `ci/deshape-string-sandi-ci`
  (PR #36 ditutup — satu-satunya branch yang bisa dipakai mengulang eksperimen "riwayat bernoda ⇒ merah").
  Riwayat `20c16ea` tidak hilang meski branch-nya dihapus: GitHub menyimpan ref PR untuk PR yang
  sudah ditutup/di-merge — **perilaku platform, bukan yang kuukur di repo ini**. **37 branch lokal** belum
  kusensus statusnya; itu bagian lain dari D1 kalau kamu mau bersih-bersih juga di sisi itu.
- **D2 — bukti yang belum ada.** Tinggal **dua** yang masih belum: `metricWriter` terpasang di 3 SA tapi
  aksinya belum pernah terlihat, dan varian E4 "dua konten berbeda dalam 60 detik" belum diprovokasi.
  Butir ketiga — **tidak ada verifikasi browser** untuk `/admin/dashboard` maupun `/cv-layout`, yang
  terukur baru status code dan header bukan yang dirender — **tertutup di PR ini** (A2). Satu butir lain
  tertutup di PR #41: sensus cabang `switch` hasil `SendEmail`
  (`main.go:389-396`) ternyata bukan "2 dari 3 terbukti jalan" seperti yang kutulis tadi, dan angkanya
  lebih spesifik dari itu —
  | Cabang | Sebelum #41 | Sesudah #41 |
  |---|---|---|
  | `dilewati` (`ErrNotConfigured`) | dipositifkan di CI (`ci.yml:294-298`) **dan** di level paket (`TestSendEmailTanpaKredensialBerhentiSebelumSMTP`, 3 sub-case) | tetap |
  | `gagal kirim` (`default:`) | hanya diasumsikan **tidak** muncul (`ci.yml:289-293` `exit 1` kalau ia muncul) — belum pernah dipositifkan di mana pun | `TestAutentikasiDitolakBukanErrNotConfigured` — premisnya diuji positif lewat penolakan `535` dari stub in-process |
  | `terkirim` (`err == nil`) | terjadi **sekali di produksi** (POST 2026-10-06 00:51 UTC), 0 kali di CI | `TestServerMenerimaPesanKembalikanNil` |
  Yang masih terbuka dan sekarang jadi tapi-tunggal yang jelas: **0 test handler** (setelah #41 pun tetap
  2 file test, keduanya di `mailer/`) — menutup `switch` di dalam goroutine butuh harness Postgres, bukan
  tambahan kecil.
  **Yang tertutup di PR ini (A2)** — verifikasi browser, dijalankan ke produksi lewat
  `docs/verify/browser-probe.mjs` (§9.7), server tidak diubah:
  | Yang dirender | Angka | API yang dipanggil |
  |---|---|---|
  | `/cv-layout` | **2433** karakter, `jumlahImg=1`, `linkLokal=0`, `consoleErr=[]` | `/api/certificates=200` |
  | `/admin/dashboard`, tanpa token | **80** karakter = gerbang login saja, `inputPwd=1` | **0** panggilan |
  | `/admin/dashboard`, `admin_token` palsu | tetap **80** karakter — kembali ke gerbang yang sama | `/api/admin/contact=401` |
  | `/dossier/certificates` | **554** baseline → **231** saat `/api/certificates`→500 → **231** saat koneksi putus; `barisError=[]` di ketiganya | `200` / `500` / — |
  Baris terakhir itu bukan hiasan: ia menjawab **C4** dengan angka, dan menunjukkan bahwa yang diukur lewat
  status code (#29) **tidak** pernah sampai ke pengunjung — 500 dan "kosong" menghasilkan halaman yang sama
  panjangnya, karakter per karakter.
- **D3 (opsional) — drill negatif E11** lewat pin traffic. Itu menyentuh produksi kelas yang sama dengan
  P5, tapi izin P5 bukan izin ini; butuh "ya" sendiri.

### 9.6 Checklist manual — urutan yang paling murah dulu

1. **`/admin/dashboard` → login → catat jumlah pesan.** Satu-satunya cara menutup klausa E13 terakhir.
2. **Bolehkan aku memakai `portfolio-admin-pass` lewat `gcloud secrets versions access` tanpa mencetak
   nilainya?** Kalau ya, butir 1 jadi kerjaku; kalau tidak, tetap di tanganmu.
3. **Hapus baris**: probe `b693e544-3001-…` + **5** baris seed warisan. Butuh DELETE ber-JWT.
4. **"kirimi"** untuk 1 POST pembuktian `Reply-To` (B3).
5. **"ya"** untuk drill clone F7 (B1, berbayar).
6. **Jawab C1–C6** — tiap jawaban langsung jadi satu PR, bukan satu milestone. Sejak PR ini **C1, C3 dan
   C4 sudah punya angka**, jadi yang tersisa benar-benar pilihan, bukan rasa penasaran: C1(a) masih butuh
   1 request pengukuran, C1(b)+C4 tidak butuh apa-apa lagi, C5/C6/B4 sudah bulat rekomendasinya.
7. **Cabut 6 `secretAccessor` SA compute** + putuskan prune pubsub (B4). Bisa lewat aku kalau diizinkan,
   bisa lewat console sendiri.
8. **Putuskan `chore/gerbang-ci`** (butir §6 yang masih terbuka) dan boleh-tidaknya **20** branch dihapus.
9. **A0 susulan** sesudah 14:00 UTC: kalau `event=schedule` masih **1**, F10 dicoret. Aku yang ukur di sesi
   berikutnya; tidak perlu kamu sentuh.
10. **Bolehkah `github-watch@config-agentic-ubuntu.iam.gserviceaccount.com` memegang
    `roles/monitoring.viewer`?** Satu binding **read-only**. Tanpa itu, tidak ada assertion yang bisa menjaga
    channel email yang kupasang hari ini — `notificationChannels` ketiga policy bisa kembali jadi 1 dan
    **tidak ada satu pun workflow yang merah**, karena `watch.yml` hari ini cuma bisa membaca Cloud Run
    (`roles/run.viewer`).
11. **Eksperimen atribusi konsumen (§9.8):** cabut `roles/pubsub.subscriber` dari `hermes-openclaw@` selama
    satu jendela alarm, lalu lihat ack. Ini yang menutup hutang prune §8 F6. Aku tidak mengerjakannya sendiri
    karena kalau ternyata hermes yang menyedot, rantai alarm putus selama jendela pengamatan.

### 9.7 Alat ukur yang ikut di repo: `docs/verify/browser-probe.mjs`

Angka render di §9.0, **C3** dan **C4** dihasilkan alat ini, jadi ditulis ulang kalau nanti berubah.

```
node docs/verify/browser-probe.mjs /cv-layout
node docs/verify/browser-probe.mjs /dossier/certificates
node docs/verify/browser-probe.mjs --mock=/api/certificates:500 /dossier/certificates
node docs/verify/browser-probe.mjs --mock=/api/certificates:putus /dossier/certificates
node docs/verify/browser-probe.mjs /admin/dashboard
node docs/verify/browser-probe.mjs --token=palsu /admin/dashboard
```

Yang perlu diketahui supaya angkanya tidak disalah baca:

- **Ia tidak mengubah apa pun di server.** Mock dipasang lewat `setRequestInterception` di dalam Chrome,
  jadi `/api/certificates` yang "500" itu **tidak pernah** sampai ke backend — DB produksi tetap hidup,
  dan tidak ada baris `contact_messages` yang bertambah karena probe ini.
- `puppeteer` diambil dari `nextjs-frontend/node_modules` lewat `createRequire` yang menunjuk
  `nextjs-frontend/package.json`; dipanggil dari root repo tanpa itu → `ERR_MODULE_NOT_FOUND`.
  Jalan di host ini dengan `/usr/bin/google-chrome` (`headless: 'new'`, `--no-sandbox`), dan `FE_URL`
  bisa ditimpa lewat environment.
- **`domcontentloaded` + jeda 7 s, bukan `networkidle`.** `/` tidak pernah idle (`FotoDiriFix.png` >3 s),
  jadi `networkidle0/2` membuat probe timeout tanpa mengukur apa pun — itu penyebab dua run pertamaku
  menghasilkan `TimeoutError` untuk beranda, bukan penyebab halaman lambat.
- `panjangTeks` = panjang `document.body.innerText` setelah `\n{2,}` dirapatkan. Angka ini **peka terhadap
  whitespace tepi**: gerbang admin terbaca **82** di run scratch dan **80** di run alat ini, selisihnya
  baris kosong, bukan konten. Yang dipakai sebagai bukti adalah bentuknya (hanya form login, `inputPwd=1`,
  0 panggilan API), dan ±2 karakter itu kutulis supaya tidak tampak lebih presisi dari aslinya.
- File ini ada di `docs/**`, dan `deploy.yml` mengabaikan `**.md` **dan** `docs/**` — jadi menambah alat
  ukur ke repo **tidak** memicu build/deploy. Itu berbeda dari menaruhnya di `tools/`, yang akan memicu
  satu run deploy penuh; pilihan letak ini memang sengaja (E7 arah "dokumen tidak menyentuh produksi").
  Harga dari letak yang sama: **tidak ada satu pun job CI yang membaca `docs/`** — `ci.yml` menjalankan
  lint/tsc/build dengan `working-directory: nextjs-frontend` (dan `go-backend`), jadi probe ini bisa rusak
  tanpa ada yang tahu. Yang menjaganya cuma bahwa §9.0/C3/C4 mengutip angka yang dihasilkannya, dan
  `node --check docs/verify/browser-probe.mjs` lolos.
- **Cara memverifikasi tanpa menelan artefak lama:** `npx tsc --noEmit` di host ini **merah** sebelum
  perubahan apa pun, karena `.next/types/validator.ts` (root-owned, 2026-10-02 09:19) masih memvalidasi
  `src/app/api/contact/route.ts` — file yang **sudah tidak ada** di git (`git ls-files src/app/api/` =
  `cv`, `github-profile`, `github-repos`). `.next` itu tidak kuhapus (punya root, dan dia satu-satunya
  yang bisa dipakai membanding build lama). Angka yang benar didapat dengan mengecualikan artefak itu:
  `tsc --noEmit -p <tsconfig dengan include tanpa .next>` → **rc=0**; `npm run lint` → **0 errors,
  11 warnings** (semua warning sudah ada sebelumnya). CI tidak pernah melihat ini karena checkout-nya
  bersih, tanpa `.next`.

### 9.8 Rantai alarm: dua kesimpulan salahku sendiri, dan angka yang membatalkannya (2026-10-06, 06:40 – 07:35 UTC)

**Klaim yang dicabut.** Sesi kemarin menuliskan **N3**: "rantai alarm produksi berakhir di antrean yang
tidak pernah dibaca", dibuktikan dengan **nol** entri `Subscription.Pull` di Cloud Audit Logs 30 hari.
Hari ini aku menggali "koreksi" yang lebih keras: "bukan cuma tidak dibaca — tidak pernah ditulis sama
sekali" (`send_message_operation_count` 0, `ack_message_count` 0, `pull_message_operation_count` 0 dalam
30 hari). **Keduanya salah.** Rantainya hidup dan sibuk.

**Satu penyebab, dan itu penyebabku, bukan produksi.** Semua angka nol itu keluar dari satu bentuk query:
`aggregation.alignmentPeriod=604800s` (pekanan) + `ALIGN_SUM` pada metrik bertipe DELTA milik Pub/Sub.
API-nya **membalas 0 tanpa error apa pun** — bukan "tidak ada data", tapi nol yang looks like a measurement.
Dengan bucket harian (`86400s`) angkanya begini:

| hari | publish ke `agentic-alerts` | ack di `agentic-alerts-sub` | unary pull |
|---|---|---|---|
| 2026-09-26 | 9 | 9 | 1 |
| 09-27 | 43 | 43 | 5 |
| 09-28 | **233** | 233 | 0 |
| 09-29 | 116 | 116 | 0 |
| 09-30 | 65 | 66 | 0 |
| 10-01 … 10-05 | 57, 43, 41, 59, 62 | 57, 43, 41, 59, 62 | 0 |
| 10-06 (s/d 07:05) | 71 | 72 | 7 |

Ack ≈ publish **hari per hari**, dan unary pull nyaris nol → konsumennya streaming pull. Jadi kalimat yang
benar: antreannya **dibaca**, dan `pull_message_operation_count` yang nol itu bukan bukti "tidak ada yang
menyedot" — dia hanya tidak menghitung streaming.

**Aturan yang kutanam supaya temuan hantu seperti ini tidak terulang.** (1) Pada metrik Pub/Sub ber-type
DELTA, `alignmentPeriod` **maksimum 86400s**; jangan pernah pakai pekanan/bulanan. (2) Sebuah nol harus
dibaca silang dari metrik lawannya (publish vs ack) dan pada bucket 60s sebelum dipercaya. (3) Absennya
entri di Cloud Audit Logs **bukan** bukti negatif untuk operasi data-plane — Pub/Sub tidak meng-audit
`publish`/`ack`/`pull` kecuali data-access logging dinyalakan, dan hari ini dia tidak menyala: 9 ack
terukur terjadi pada menit yang sama, `gcloud logging read` untuk `protoPayload.serviceName=
"pubsub.googleapis.com"` tetap **0 baris**.

**Drill yang kukerjakan (sesuai "ukur dua kali"), dan hasilnya.** Setelah patch, satu insiden dipicu lewat
jalur yang sama persis dengan produksi (uptime checker → kondisi → channel):

| langkah | angka |
|---|---|
| cek `drill-rantai-alarm-2F2YjRZiiDs` (host yang tidak resolve, `tcpCheck:443`, `period:60s`, `STATIC_IP_CHECKERS`) | dibuat 06:52 UTC |
| policy `drill-rantai-alarm-portfolio`, kondisi MQL identik dengan `portfolio-be-down`, `duration:0s`, dua channel | dibuat 06:56 UTC |
| insiden OPEN | **6 baris** checker: 4 @ 06:57:51, 2 @ 06:58:27 |
| publish ke topic | **6** pada bucket `06:59:58` (`code=success`) |
| ack | ikut naik (06:58:31=2, 06:59:31=4) |
| email | **mendarat** di `arkanfauzi.sekawanmedia@gmail.com` — disaksikan penerima, karena API notifikasi tidak bisa kupakai (lihat "batas bukti") |
| pembongkaran | `DELETE` policy dan `DELETE` cek = HTTP 200; tersisa 5 policy + 2 cek produksi, terverifikasi |

Dua penolakan API yang layak dicatat karena bentuknya tidak intuitif: `alertStrategy.autoClose` **1200s
ditolak** ("at least 30 minutes"), dan `documentation.mimeType` harus `text/markdown`, bukan `TEXT/MARKDOWN`.

**Perubahan produksi yang benar-benar terjadi hari ini, semuanya tercatat.** 3 `PATCH alertPolicies`
(updateMask `notificationChannels`) → `portfolio-be-down`, `portfolio-fe-down`, `portfolio-5xx` sekarang
`channels=pubsub+email`, `enabled=true`, terverifikasi lewat **baca ulang** (bukan dari gema respons PATCH).
Salinan sebelum/sesudah ikut di repo: `docs/evidence/alert-policies-sebelum-email-channel.json`
(6.420 byte) dan `docs/evidence/alert-policies-sesudah-email-channel.json` (6.669 byte). Keduanya hasil
`GET alertPolicies?pageSize=100` yang **kubersihkan** sebelum masuk git: `creationRecord`/`mutationRecord`
(satu-satunya tempat alamat email operator muncul) dibuang, field yang disisakan cuma yang memang kuclaim
di tabel — `displayName`, `enabled`, `notificationChannels`, `conditions`. Letak di `docs/` juga berarti
dia tidak memicu deploy (`deploy.yml` mengabaikan `docs/**`).
Selain itu: 2 resource drill dibuat lalu dihapus, 2 publish manual ke topic (langsung
ter-ack konsumen), 1 subscription probe fan-out dibuat dan dihapus. Tidak ada perubahan kode atau IAM lain.

**Batas bukti yang kubiarkan terbuka, dan jawabannya cuma satu eksperimen.** Heartbeat tiap 5 menit dari
instance `3411766485018421527` = `agentic-watchdog-vm` (SA `agentic-watchdog@`), isinya
`{alive:true, beatMs:5, pubsubSubscriber:true, queueLength:0, uptimeSec:98118, whatsappConnected:true}`
(terakhir 07:22:21.979Z). Itu menguatkan bahwa konsumen ada di VM itu — tapi tetap **self-report**, dan
ack tidak menyebut identitas. Karena data-plane tidak ter-audit dan API notifikasi `v1` mati di proyek ini
(semua jalur 404: `notificationChannels`, `notifications`, `incidents`, `uptimeCheckConfigs`), pertanyaan
§8 F6 "VM mana yang menyedot `agentic-alerts-sub`" **belum terjawab**, dan hutang grant pubsub di kedua SA
tetap berdiri. Eksperimen yang menutupnya satu perintah dan bisa dibatalkan — cabut
`roles/pubsub.subscriber` dari `hermes-openclaw@`, amati satu jendela alarm: ack terus datang → hermes
inert dan prune aman; ack berhenti → `add-iam-policy-binding` lagi. Risikonya jelas: kalau ternyata hermes
yang menyedot, rantai putus selama jendela pengamatan. **Itu keputusanmu, bukan yang kukerjakan diam-diam.**

**Reframing yang harus kutelan.** Item "konsumen buntu" di urutan kerja kita tidak memperbaiki apa pun yang
rusak; yang terjadi adalah **menambah jalur kedua** (pubsub → email terverifikasi) pada tiga policy, plus
satu koreksi besar di dokumen ini. Nilainya nyata tapi jauh di bawah yang kuklaim kemarin.

**Angka PR #43** (perbaikan bug, jalur terpisah dari bagian ini): run `51860055524` `success` — `go`, `api`,
`web` hijau, GitGuardian hijau; langkah baru `Kontrak validasi tulis (kosong, kepanjangan, body besar, rute mati)`
lolos di GitHub, bukan hanya di harness lokal. Baseline kontrak `dead_paths` 9 → **0**.

## 10. N6 — Artifact Registry: temuanku salah sebab, dan tulisannya sudah dieksekusi (2026-10-06, 15:20 – 16:10 UTC)

**Yang kutuliskan sebagai N6:** "Artifact Registry tidak punya kebijakan pembersihan → tumbuh tanpa batas."
**Salah.** Kebijakannya **sudah ada**, dua-duanya, dengan id yang jelas:

```
keep-recent-5        = KEEP   mostRecentVersions.keepCount = 5
delete-older-than-3d = DELETE olderThan = 259200s, tagState = ANY
```

Yang membuatnya tidak pernah mengerjakan apa pun: `cleanupPolicyDryRun` **menyala**. Kebijakan dalam mode
dry run itu laporan yang tidak pernah dibaca siapa pun — dia menghitung apa yang *akan* dihapus dan
tidak menghapus apa pun, selamanya. Jadi temuan yang benar bukan "tidak ada kebijakan", tapi
**"kebijakan ada tapi non-aktif, dan tidak ada satu pun yang diberi tahu"**.

**Keadaan yang kuukur sebelum menulis apa pun.**

| paket | versi | jumlah `imageSizeBytes` |
|---|---|---|
| `backend` | 33 | 745,54 MB |
| `frontend` | 32 | 10945,25 MB |
| penjumlahan | 65 | 11690,79 MB |
| **Repository Size (terukur AR)** | — | **10636,582 MB** |

Selisih 1054,21 MB antara penjumlahan per-versi dan ukuran repository = layer yang **di-dedup**. Angka ini
penting karena dia membatalkan klaim berikutnya: kebijakan yang sama, kalau dinyalakan, secara nominal
membuang **10 versi backend (225,63 MB) + 9 versi frontend (2206,32 MB) ≈ 2,43 GB** — tapi karena dedup,
yang benar-benar kembali ke storage **tidak bisa diketahui sebelum penghapusan terjadi**, dan angka
atasnya 2,43 GB. Pertumbuhan harian yang kuukur dari tabel push (2026-09-23 … 2026-10-06) ≈ 1 GB/hari,
puncak 4,43 GB pada 10-05.

**Tulisannya, satu perintah.** `gcloud artifacts repositories set-cleanup-policies portfolio-app
--project=config-agentic-ubuntu --location=us-central1 --no-dry-run` → rc=0, `Dry run is disabled.`
Terekam di audit log sebagai `UpdateRepository` pada **2026-10-06T15:32:29.780Z**,
`permission: artifactregistry.repositories.update`, `granted: true`, isi permintaan
`cleanupPolicyDryRun: false` beserta kedua kebijakan dikirim ulang utuh (read-modify-write, jadi
kebijakannya tidak tertimpa kosong).

**Tiga pembacaan untuk membuktikan mati-nya dry run** (bukan dari gema perintah tulis):
(1) `list-cleanup-policies` mencetak `Dry run is disabled.`; (2) `describe --format=json` menampilkan
kedua kebijakan dan **tanpa** key `cleanupPolicyDryRun` sama sekali — key hilang = false; (3) audit log
di atas.

**Empat belokan yang kubayar di jalan ke sana**, ditulis supaya tidak dibelokkan ulang:
(a) **"gcloud GA tidak bisa mematikan dry run" — salah.** `--no-dry-run` ada. Aku menyimpulkan tidak ada
karena `--help` (GA/beta/alpha) tidak menampilkan flag cleanup apa pun; yang membuktikan adalah surface
definition CLI-nya sendiri: `lib/surface/artifacts/repositories/set_cleanup_policies.yaml` →
`arg_name: dry-run / api_field: repository.cleanupPolicyDryRun / type: bool / default: null`,
`command_type: UPDATE`, `update.read_modify_update: true`. Bentuk `--dry-run=false` **ditolak**
(`ignored explicit argument 'false'`) — flag bool di surface ini cuma punya bentuk `--no-`.
(b) **Rute REST mentok**: discovery `v1` dan `v1beta2` tidak mengekspos sub-sumber `cleanupPolicies`,
jadi "coba PATCH langsung" bukan jalur yang sah lewat alat yang kupakai.
(c) **Rute file `--policy` dibuang** setelah tiga penolakan beruntun: objek → `Policy file must contain a
list of policies`; array tanpa `name` → `Key "name" not found`; setelah `id`→`name` →
`Invalid action "DELETE"`. Bentuk yang diterima surface itu tidak kubuktikan, dan aku tidak butuh bukti
itu karena (a) sudah cukup.
(d) **Loop ukuran sempat menghasilkan `null`** untuk 65 baris karena aku memecah pada `"@sha256:"`
sedangkan nama versi AR memakai `/versions/sha256:`; `--show-tags`/`--show-untagged` bukan flag yang ada,
dan `--format=json` memberi `metadata.tags: null`, jadi ukuran harus `versions describe` satu-satu.

**Pertanyaan "resource-ku habis?" — dan jawabannya bukan tentang Artifact Registry.**
Aku sempat menjawab "yang habis itu uang", dan itu juga perlu dikoreksi. Dari BigQuery FOCUS export
(`gcp_billing_export_focus_018EEB_36C206_679B7E`, filter `DATE(ChargePeriodStart)` — kolom `ChargeDate`
tidak ada): total list Rp483.530 sejak hari tagih pertama 2026-09-20, kredit free trial terserap
**Rp411.886**, effective cost ≈ **Rp0**. Composisinya:

| layanan | biaya (Rp, list) |
|---|---|
| Compute Engine | 253.339 |
| Networking | 127.375 |
| Cloud SQL | 96.961 |
| Cloud Run | 4.197 |
| Vertex | 1.060 |
| **Artifact Registry** | **596** |

Artifact Registry = **0,12%** dari semuanya. SKU penyimpanan `8502-299A-ABAF` ≈ Rp494/GiB-bulan list, jadi
menyalakan penghapusan (±2,43 GB) maupun membiarkannya tumbuh itu delta-nya **≈ Rp266/hari ≈ 0,9% dari
burn** — di bawah noise. Burn Rp30.600–33.800/hari itu datang dari **dua VM yang menyala**:
`hermes-openclaw-vm` (e2-medium) dan `agentic-watchdog-vm` (e2-micro), us-central1-a. Risikonya bukan
"kehabisan kredit" tapi **kredit hangus di akhir trial** (±90 hari → sekitar 19 Des 2026): yang Rp411.886
itu tidak hilang, tapi sisa burn setelahnya berubah jadi tagihan riil, ordo Rp2,8 juta. Yang **tidak bisa
kuukur dari CLI**: saldo kredit dan tanggal hangus sebenarnya — itu hanya ada di Console → Billing → Credits.

**Batas kebijakan, supaya tidak salah berharap.** AR punya **dua** batas umur (`olderThan: 3d`) dan satu
batas jumlah (`keep-recent-5`); dia **tidak** punya batas ukuran. `gcloud alpha services quota list
--service=artifactregistry.googleapis.com --consumer=projects/config-agentic-ubuntu` hanya mengembalikan
metrik laju permintaan (`project_region_requests/writes/deletes/upstream_host_reads/repo_management/
prewarm_operations` + `user_*`) — **tidak ada kuota storage maupun jumlah versi**. Artinya pembersihan ini
bukan penyelamat kuota; dia hanya mengikat steady-state repository di ±9 GiB ≈ **3 hari deploy**.

**Produksi sehat sesudah menulis** (dibaca ulang, bukan disimpulkan): `/api/health` 200
`{"db":"ok","status":"ok"}`; `/api/cv` 200, 783.896 byte, diawali `%PDF-`; digest yang sedang dipakai
Cloud Run — `be sha256:0a9528af…`, `fe sha256:6d26e722…` — tetap **peringkat #1** di daftarnya, jadi
`keep-recent-5` melindunginya. Itu bukan kebetulan yang aman: setiap deploy push `$IMG:${{ github.sha }}`
dan deploy by digest, jadi versi live selalu yang terbaru.

**Yang masih terbuka, dan itu memang bagian dari rencana.** Penghapusan AR **asinkron**; dokumentasinya
"applied within approximately one day". Per **2026-10-06T16:09Z** hitungannya masih **33 backend /
32 frontend**, Repository Size masih 10636,582 MB — jadi belum ada satu byte pun yang benar-benar
terhapus, dan klaim "N6 selesai" belum boleh ditulis tanpa pembacaan besok (target: 23/23, digest live
masih ada, `/api/cv` tetap PDF). Kalau hitungannya tidak turun, yang kubaca bukan "kebijakan gagal" tapi
"penghapusan belum dijadwalkan" — dan itu yang akan kulaporkan apa adanya.

**Yang sengaja tidak kukerjakan (di luar scope, atas katamu).** Guard AR di CI. Dua alasan: `github-watch`
cuma punya `roles/run.viewer` sehingga tidak bisa membaca AR sama sekali (kalau mau, tempatnya di
`deploy.yml`, bukan `watch.yml`), dan tidak ada yang terancam — AR 0,12% dari biaya, tanpa kuota, tanpa
jalur deploy yang bergantung pada jumlah versi.

## 11. Antrean eksekusi — lima PR terbuka, dan apa yang terjadi di tiap merge (ditulis 2026-10-06 16:20 UTC)

Bagian ini rencana kerja, bukan hasil. Yang **sudah kuukur** cuma fakta di "gerbang" dan "konflik" di bawah;
sisa angkanya akan ditulis dari log run setelah tiap merge, dan kalau tidak cocok dengan ramalan di sini
yang berubah adalah bagiannya, bukan klaimnya.

**Gerbang yang berlaku di `main`** (dibaca dari `branches/main/protection`): required contexts =
**`go`, `api`, `web`**, `strict: true` (cabang wajib setara `main` sebelum boleh merge),
`required_approving_review_count: 0`, `enforce_admins` ada. **GitGuardian bukan required check** —
itu sebabnya netral di #46 tidak memblokir merge. Job baru `pdf` (#46) dan `vuln` (#47) juga **belum
required**; dia jalan dan hijau tapi tidak menahan siapa pun.

**Satu koreksi sebelum daftar.** Aku sempat melaporkan GitGuardian #46 "selesai" seolah itu hasil baik.
Check run-nya `completed` dengan kesimpulan **`neutral`**, `title: "Could not complete scanning of your
commits"`, `summary: "…Some resources do not exist on GitHub. Please retry."`, `annotations: 0`,
mulai 08:46:20Z → selesai 09:06:22Z. **Pemindaiannya tidak pernah jalan**, bukan "bersih". Karena dia
tidak required, merge tetap sah; tapi kalimat "GitGuardian hijau" untuk #46 salah dan tidak boleh
ditulis ulang. Yang benar: `go`, `api`, `web`, **`pdf`** hijau di #46; GitGuardian tidak terukur.

**Konflik: tidak ada, dan itu diuji bukan ditebak.** Kelima cabang dicoba merge berurutan di cabang
buang (`git merge --no-ff` sungguhan, lalu cabang buang dihapus): **bersih semua** —
`fix/validasi-admin-dan-galat-fe` → `feb8789`, `ci/migrate-lewat-image` → `75f10a8`,
`ci/pdf-dari-image` → `fdffba8`, `ci/gerbang-kerentanan` → `b61a9fc`, `docs/koreksi-rantai-alarm` →
`5cf9a29`. Alasan strukturnya: #43/#45/#46 tiga-tiganya menyentuh `.github/workflows/ci.yml` tapi
hunk-nya terpisah jauh (sisip di baris 247; sunting 92 + 174; sambung di ujung 447), dan **hanya #44**
yang menyentuh `TODO.md`, jadi tidak ada dua PR yang berkelahi di ekor yang sama — itu juga sebabnya
§10 dan §11 ini kutulis di cabang #44, bukan di `main` langsung.

**Urutan, dan harga tiap langkah.** `deploy.yml` jalan di `push` ke `main` dengan
`paths-ignore: ["**.md", "docs/**"]`, `concurrency: deploy-production-main`,
`cancel-in-progress: false`, timeout 30 menit. Jadi:

| # | PR | isi | deploy produksi? |
|---|---|---|---|
| 1 | **#43** | `fix(admin)`: validasi tulis, batas body 1 MB, rute mati 404, galat FE | **ya** (menyentuh `go-backend/`, `nextjs-frontend/`) |
| 2 | retry GitGuardian #46 | bukan merge; cuma minta check suite dijalankan ulang | tidak |
| 3 | **#45** | `fix(image)`: `ENTRYPOINT` supaya `-migrate` tercapai lewat image | **ya** (`Dockerfile` + `ci.yml`) |
| 4 | **#46** | `ci(pdf)`: uji `/api/cv` lewat image frontend, bukan magic byte saja | **ya** (`ci.yml`) |
| 5 | **#47** | `ci(vuln)`: gerbang baseline kerentanan + dependabot | **ya** (`scan.yml`, `dependabot.yml`, `tools/ci/`) |
| 6 | **#44** | `docs(alarm)` + §10 + §11 | **tidak** — keempat file kena `paths-ignore` |

Empat deploy produksi untuk langkah 1–5, satu untuk #44 = nol. Deploy tidak bisa dihindari dengan
menyusun ulang PR karena isinya memang kode produksi/CI; `cancel-in-progress: false` berarti mereka
**antre**, tidak saling batalkan — tiap merge berikutnya menambah ±20 menit ke antrian, jadi
menggabungkan semuanya sekaligus itu bukan ide.

**Kenapa #46 di posisi 4, bukan belakangan.** Dependabot menjadwalkan npm **Senin 03:33 UTC** dan gomod
**03:36 UTC** (`day: monday`, `timezone: UTC`, `open-pull-requests-limit: 3` per ekosistem → maksimal
6 PR terbuka, bukan 3 total). PR bumpan dependabot menjalankan CI dari cabang basis, dan aku ingin
bump `next`/`puppeteer` pertama itu **sudah** tertangkap job `pdf` — kenaikan versi di dua paket itulah
yang pernah merusak `standalone` tracing dan tidak pernah kelihatan di lint. Tenggat nyatanya: #46 sudah
di `main` sebelum **2026-10-12 03:33 UTC**. `scan.yml` dijadwalkan 03:17 UTC, jadi urutan hari Senin
yang sah: scan menyatakan keadaan → bot menawarkan perbaikan → `pdf` membuktikan perbaikan itu.

**Setiap langkah dipantau, bukan dianggap lulus.** Setelah tiap merge: baca run `deploy.yml` untuk SHA
merge itu (bukan run terakhir yang kebetulan hijau), lalu baca ulang produksi — `/api/health` 200,
`/api/cv` diawali `%PDF-`, dan digest live kedua service. Kalau ada yang merah, antrean berhenti di situ
dan yang dilaporkan adalah penyebab dari log, bukan dugaan.

**Langkah 7, besok (bukan hari ini): verifikasi N6 benar-benar mengeksekusi penghapusan.**
Setelah ±15:32 UTC + satu jendela "approximately one day": `versions list` diharapkan **backend 33 → 23**
dan **frontend 32 → 23**, Repository Size turun dari 10636,582 MB ke ordo ±8,2 GB, digest
`sha256:0a9528af…` (be) dan `sha256:6d26e722…` (fe) **masih ada**, `/api/health` 200, `/api/cv` tetap PDF.
Nomor 23/23 itu hasil simulasi `olderThan: 259200s` + `keepCount: 5` di atas daftar hari ini — kalau
nyata berbeda, yang ditulis adalah angka nyata dan alasannya, bukan angka ramalan. Task #6 baru boleh
berstatus selesai setelah pembacaan ini.

**Langkah 8, setelah daftar di atas tutup: separuh kedua permintaan awal.**
"…jika sudah tidak ada maka kita langsung perbaiki bugs di website-porto2 langsung." Bug yang tersisa
itu pekerjaan sebenarnya, dan N1–N7 tidak mengerjakan satu pun darinya. Tidak ada langkah 9 yang
direncanakan dari sini; apa yang muncul dari bugs itu nanti yang menentukan.

## 12. Pembacaan setelah #53 mendarat, retensi N6 berjalan, dan #58 dibuka (ditulis 2026-10-07 04:30 UTC)

§11 adalah ramalan; bagian ini adalah hasil pembacaan. Yang cocok saya sebut cocok, yang meleset saya
sebut meleset beserta penyebabnya — tidak ada angka §11 yang diam-diam ditulis ulang supaya terlihat benar.

**Antrean §11 tutup.** #45 → `ba1302d`, #46 → `14c6fa5`, #47 → `dad96e3`, #44 → `3009296`, #43/`fix(contact)`
→ `0504cc1`, lalu #53 squash-merge → **`f863d61`** (satu commit, judul satu baris, 99 karakter). Rebutan
ekor `TODO.md` yang dikhwatirkan §11 tidak terjadi: hanya #44 yang menyentuh file itu.

**Gerbang CI satu-SHA terpakai untuk pertama kalinya — dan dia yang paling dulu memutuskan.**
`Deploy to Cloud Run #42` (id 37568857625) pada `f863d61`, dibaca dari log run, bukan dari kesimpulan:

```
03:53:44  ##[group]Run ambil_run() { …            ← langkah 3 "Gerbang CI"
03:53:46  CI masih queued (-), tunggu…
03:54:06  CI masih in_progress (-), tunggu…       ← 7 baris seperti ini, jeda ±20,4 s
03:56:09  CI hijau untuk f863d610d186…: https://github.com/ArkanFzi/website-porto2/actions/runs/37568857560
```

Baru setelah garis terakhir itu workflow menyentuh docker: `Configure Docker for Artifact Registry` →
`Build dan push image backend` → `Deploy backend` → `Build dan push image frontend` → `Deploy frontend` →
`Verifikasi pasca-deploy`. `CI #110` (push `main`) sendiri 03:53:37 → 03:55:54 = **2 m 17 s**.

**Durasi: ramalan §11 salah hampir 3×.** §11 menulis "tiap merge berikutnya menambah ±20 menit ke antrian".
Terukur #42: `created 03:53:38` → `updated 04:00:07` = **6 m 29 s** untuk deploy lengkap dua service,
termasuk 2 m 23 s menunggu gerbang. Tidak ada antrean yang perlu dihindari dengan mengorbankan urutan.

**Verifikasi yang dicetak deploy itu sendiri** (langkah 13, `f863d61`):

```
backend /api/health => {"db":"ok","status":"ok"}
frontend / => 40693 byte
frontend /api/health => terproxy ke backend
/api/cv => 839060 byte PDF
Verifikasi lulus: kedua layanan serve artefak SHA f863d610d186c0fcd0c88ce6cff61514c60e2013 dengan isi yang benar.
```

**Produksi dibaca ulang dari internet publik, 2026-10-07 ±04:05 UTC** — kriteria selesai #53, bukan diasumsikan:

| yang diukur | hasil |
|---|---|
| `GET /api/cv` #1 | `200` dalam **5,572 s**, `X-CV-Asal: render`, **839.060** byte, diawali `%PDF-` |
| `GET /api/cv` #2 (dalam jendela 60 s) | `200` dalam **2,204 s**, `X-CV-Asal: pukulan-cache`, **839.060** byte, `cmp` dengan #1: **byte identik** |
| `Cache-Control` pada #2 | `public, max-age=60` |
| `curl -I /` | `HTTP/2 200` + `strict-transport-security`, `x-content-type-options`, `x-frame-options`, `referrer-policy`, `permissions-policy` = **5/5**, `x-powered-by` **tidak ada**, `server: Google Frontend` |
| `GET /api/health` | `200` 0,487 s `{"db":"ok","status":"ok"}` |
| service live | `portfolio-be-00038-drt` @ `sha256:3a4a96acfd553a9a…3710d17e`<br>`portfolio-fe-00037-k2s` @ `sha256:af09194f78fe223e…c93e94c` |

Dua angka yang perlu dibedakan supaya tidak jadi klaim kosong: cache hit **2.204 ms dari internet publik**
vs **12 ms dari runner CI** vs **61 ms dari localhost ke replika hangat** — yang sama hanyalah `asal`,
yang berbeda adalah berapa lompatan jaringan yang diukur. Render produksi 5,572 s juga sejajar dengan
baseline 2026-10-07 sebelum #53 (5,358 s dan 5,956 s untuk dua GET identik): yang berubah adalah GET
kedua, bukan kecepatan render.

**Assertion baru di CI terbukti menyala dari log, bukan dari lokal.** `CI #110`, job `pdf`:

```
GET #1 => 200 asal=render ; GET #2 => 200 asal=pukulan-cache dalam 12 ms
cache CV terbukti: render lalu pukulan-cache, 12 ms, byte identik (827203 byte)
```

Job `go` pada run yang sama: `Setup go version spec 1.25.0` → `go version go1.25.0 linux/amd64` →
perintah yang di-echo `go test ./... -race -count=1` → `ok go-backend 1.230s` + `ok mailer 1.009s`.
(Bukan hiasan: sebelum #53 gerbangnya `go test ./...` polos, dan run #108 hijau dengan tes yang sama.)

**Ukuran PDF tidak stabil antar run, dan ini baru ketahuan hari ini.** `CI #110` (03:55 UTC, `main`)
mencetak `byte identik (827203 byte)`; `CI #119` (04:28 UTC, #58 — branch yang **tidak** menyentuh
frontend sama sekali) mencetak `… 11 ms, byte identik (825063 byte)`. Selisih **2.140 byte** pada jalur
yang sama, 33 menit terpisah. Aku belum punya penjelasan dan tidak akan mengarang satu; yang berlaku
praktisnya jelas: **jangan pernah mengasertakan panjang PDF** — gerbang `pdf` menjaga magic byte +
`asal` + `cmp` dua GET, dan itu tetap hijau. Angka 774.803 / 783.896 / 839.060 / 827.203 / 825.063 yang
beredar di dokumen adalah pembacaan berbeda pada waktu berbeda, bukan kontradiksi yang perlu didamaikan.

**Check run pada `f863d61`: 14, semuanya `success` — dan GitGuardian tidak termasuk.** Daftarnya:
`go`, `web`, `api`, `pdf`, `deploy`, `.github/dependabot.yml`, 8× `Dependabot`. Jadi untuk SHA merge ini
GitGuardian **tidak melaporkan apa pun**; itu bukan "bersih" dan bukan "gagal", dan kalimat mana pun yang
menyebutnya hijau di `main` salah. (Di PR #58 dia `completed:success` dengan `annotations=0` — dua hal
berbeda, dan yang pertama adalah sebabnya §11 mengoreksi #46.)

### N6: penghapusan benar-benar jalan, dan ramalanku tentang angkanya salah

Dibaca 2026-10-07 ±04:15 UTC, metode sama seperti baseline (jumlah versi + penjumlahan `imageSizeBytes`):

| | baseline 2026-10-06 16:09Z | sekarang | ramalan §11 |
|---|---|---|---|
| versi `backend` | 33 | **28** | 23 |
| versi `frontend` | 32 | **28** | 23 |
| sisa yang berasal dari snapshot lama | — | **22 (be) / 22 (fe)** | 23 / 23 |
| → yang benar-benar terhapus | — | **11 (be) / 10 (fe)** | 10 / 9 |
| total `imageSizeBytes` | 745,54 + 10945,25 MB | **631,91 + 10643,65 MB** | — |
| Repository Size | 10636,582 MB | **12863,964 MB** (`describe`) / **12268,032 MB** (`list`) | ±8.200 MB |
| digest lama yang harus selamat | — | `0a9528af…` (be) **masih ada**, `6d26e722…` (fe) **masih ada** | masih ada |

Versi tertua yang selamat sekarang `2026-10-04T15:43:12Z` (be) dan `15:45:24Z` (fe), keduanya **di dalam**
jendela 259200 s pada saat pengukuran — jadi saat ini 0 versi memenuhi syarat DELETE, dan kebijakan itu
bekerja, bukan menggantung.

**Kenapa 28, bukan 23.** Enam push baru per service terjadi setelah snapshot §11 (be: 16:18, 16:28, 16:37,
16:47, 23:27, 03:57; fe: 16:20, 16:30, 16:39, 16:49, 23:29, 03:59). Semuanya lebih muda dari 3 hari, jadi
`olderThan` tidak menyentuhnya dan `keepCount: 5` juga tidak perlu. Simulasiku jalan di atas daftar yang
tuanya terus bergerak — yang salah bukan kebijakan, yang salah adalah memperlakukan snapshot sebagai
konstanta. Yang terhapus malah **lebih banyak** daripada ramalan (11 vs 10, 10 vs 9).

**Kenapa ukuran naik, bukan turun.** Enam image FE baru × ±400 MB ≈ 2,4 GB masuk, sementara yang dibuang
±2,2 GB. Catatan penting: `Repository Size` (12.863,964 MB) sekarang **lebih besar** daripada penjumlahan
`imageSizeBytes` per versi (11.275,56 MB), padahal di baseline relasinya terbalik (10.636,582 < 11.690,79,
selisih itu kudokumentasikan sebagai dedup layer). Dua permukaan `gcloud` juga tidak saling setuju
(`describe` 12.863,964 vs `list` 12.268,032 pada menit yang sama). **Aku belum bisa menjelaskan ini dan
tidak akan menulis sebab yang belum kuukur** — jadi butirnya terbuka sebagai S5a: penghapusan AR asinkron
dan akuntansi ukurannya mungkin ikut tertinggal, tapi itu hipotesis sampai ada pengukuran kedua.

**Empat bug caraku mengukur sendiri, dan inilah yang menghasilkan "0 digest" kemarin.**

```bash
# (1) property-nya BUKAN `digest`. Tabel mencetak kolom `DIGEST`, tapi objeknya `version`.
gcloud artifacts docker images list $AR/backend --format 'value(digest)'  # -> KOSONG, selalu
gcloud artifacts docker images list $AR/backend --format 'value(version)' # -> sha256:… per baris

# (2) repo/region salah. Yang benar:
#     us-central1-docker.pkg.dev/config-agentic-ubuntu/portfolio-app/{backend,frontend}
gcloud artifacts docker images list europe-west2-docker.pkg.dev/…/arkfazone-backend …
#  -> ERROR: NOT_FOUND … (dan `grep -c` atas stdout yang kosong = 0, bukan "registry kosong")

# (3) `Repository Size` HANYA ada di output manusiawi `describe`; `--format json` tidak punya kunci size.
#     Men-grep json lalu menyimpulkan "kosong" adalah kesimpulan dari query yang salah, bukan dari AR.

# (4) JEBAKAN TZ: kolom CREATE_TIME di tabel itu waktu LOKAL (UTC+7), field `createTime` itu UTC.
#     digest 074584ae: tabel 2026-10-05T00:51:20, JSON 2026-10-04T17:51:20Z.
#     Filter umur wajib dibaca dari field JSON; kalau dari tabel, jendela 72 jam bergeser 7 jam.
```

### Koreksi ketiga atas body #53: dua ID kerentanan tertukar

`govulncheck ./...` pada `f863d61` (go1.27.1, 2026-10-07): **3 kerentanan terpanggil, rc=1**. Body #53
menulis "`pgx v5.8.0 → v5.9.2` menutup GO-2026-5970 yang reachable dari `verifySchema`". Jalur dan
modulnya benar, **ID-nya tertukar**:

| ID | modul | FOUND → FIXED | jalur (verbatim) |
|---|---|---|---|
| **GO-2026-5004** | `github.com/jackc/pgx/v5` | v5.8.0 → v5.9.2 | `main.go:286:84: backend.verifySchema calls gorm.DB.Scan, which eventually calls sanitize.SanitizeSQL` |
| **GO-2026-5970** | `golang.org/x/text` | v0.34.0 → v0.39.0 | `main.go:28:2: init calls gorm.init … norm.Form.Properties`; `main.go:307:21: initDB calls gorm.Open … norm.Form.Span` / `.Transform` |
| **GO-2026-5676** | `github.com/quic-go/quic-go` | v0.59.0 → v0.59.1 | `main.go:579:28: main calls http.Server.ListenAndServe … http3.Error.Error` + `qpackError.Error`, 2 trace di `cmd/audit-ignored` |

Dua catatan jujur yang mencegah angka ini dibaca lebih besar dari adanya: input `verifySchema` adalah
`managedTables = []string{"certificates","experiences","contact_messages"}` (`main.go:271`) — konstanta,
bukan data request, jadi GO-2026-5004 hari ini tidak punya jalur eksploitasi dari pengunjung; dan trace
quic-go hanya menyentuh konstruksi galat di jalur listen, sementara service ini bicara HTTP/1.1 di belakang
Cloud Run. Bump-nya tetap diambil karena `Fixed in` dan karena tripwire tidak boleh menyimpan ID yang
sudah tertutup.

**#58** (`bump/kerentanan-go`, `build(go)` + 2 commit `chore(go)`) menaikkan persis tiga `Fixed in` itu
(+ `x/sync` v0.19.0 → v0.21.0 sebagai konsekuensi) dan **menulis ulang baseline jadi 0 GO + 20 GHSA**.
Terukur: `govulncheck` → *"No vulnerabilities found / 0 vulnerabilities"*, `go vet` + `gofmt` bersih,
`go test ./... -race -count=1` `ok 1.332s` + `ok mailer 1.055s`, `vuln-check.mjs` rc=0 (sebelum regenerasi
**rc=1 dengan `GERBANG MERAH: 0 temuan baru, 3 temuan hilang dari baseline`** — tripwire-nya terbukti
bukan hiasan), `api-contract-check.mjs` rc=0, `audit-ignored` `silent_gorm=0 silent_listen=0`, dan
`docker build` pada image produksi `golang:1.25-alpine@sha256:1ae0735f…` rc=0. `go mod tidy` juga menaikan
status `golang-jwt/jwt/v5` dari `// indirect` menjadi langsung, karena `main.go:25` memang mengimpornya —
itu koreksi status di `main`, bukan perubahan versi.

**Yang ternyata berlaku untuk #48 (dependabot, grup minor-patch go).** Dua hal terukur, dan keduanya
membuat "merge #48 saja" bukan jalan pintas:

1. #48 menaikkan `golang.org/x/crypto` v0.48.0 → v0.56.0, yang menyatakan `go 1.26.0`. Di salinan scratch,
   `docker build` dengan image yang di-pin hari ini mati tepat di langkah download:
   `go: go.mod requires go >= 1.26.0 (running go 1.25.14; GOTOOLCHAIN=local)` → `exit code: 1`.
   **Job `go` di CI tidak akan menangkap ini**, karena `actions/setup-go` memasang toolchain *dari
   `go-backend/go.mod`* (terukur di #110: `Setup go version spec 1.25.0`) sementara image produksi tetap
   1.25. Jadi #48 butuh #54 (`golang: 1.25-alpine → 1.27-alpine`) lebih dulu.
2. `scan.yml` punya trigger `pull_request` pada `go-backend/go.mod` dan `go.sum`. #48 mengubah keduanya
   tanpa mengecilkan `tools/ci/vuln-baseline.json`, jadi dia akan merah di `vuln` kecuali baseline
   ikut dibawa — dan `vuln` bukan required check, sehingga dia bisa di-merge **sambil meninggalkan
   tripwire yang salah**. Itu persis kegagalan yang mau dibasmi gerbang ini.

### Item baru yang terbuka (ID S*, supaya tidak menguap)

| ID | butir | status / yang dibutuhkan |
|---|---|---|
| **S1** | Percakapan SMTP setelah `connect` tanpa batas | `gomail.Dialer` tidak punya field `Timeout` dan hanya mengikat connect 10 s (`smtp.go:61`). Batas 12 s sekarang ada di **caller** (`sync.WaitGroup` + ticker), terbukti dari tes: SMTP kumacetkan 30 s → `rc=0` di +12,457 s dengan log `masih ada email yang berjalan saat proses berhenti (batas 12s)`. Yang belum: memotong dialog, bukan menghitungnya. |
| **S2** | 3 situs `react-hooks/set-state-in-effect` diturunkan ke `warn` | `admin/dashboard/page.tsx:50`, `admin/page.tsx:77`, `components/Dossier/TimedCarousel.tsx:64`. Perlu verifikasi di browser + kredensial `/admin` yang tidak kupunya; exit condition sudah ditulis di komentar `eslint.config.mjs`. |
| **S3** | CSP belum dipasang (= O5) | sengaja absen; alasannya di komentar `next.config.ts`, bukan lupa. |
| **S4** | Antrean dependabot: 7 PR terbuka (`#48`,`#50`,`#51`,`#54`,`#55`,`#56`,`#57`) | Keputusan urutan ada di kamu. Fact yang terpakai: **#54 sebelum #48** (lihat di atas); #57/#50/#51 menulis `nextjs-frontend/package.json` + lockfile yang sama; #49 sudah tidak ada (digantikan #57 yang basisnya `f863d61`). |
| **S5** | Angka CV di dokumentasi basi | DEPLOY.md masih menulis `774 803 byte` (dipakai di §F6 juga), §11 menulis `783.896`; produksi hari ini **839.060** byte. Disinkronkan di PR dokumen ini. |
| **S5a** | `Repository Size` > jumlah `imageSizeBytes`, dan dua surface `gcloud` tidak setuju | terbuka, belum terjelaskan — lihat tabel N6 di atas. Jangan ditulis sebagai "dedup" sampai diukur ulang. |
| **S6** | Image scratch lokal menumpuk | ±9 `porto-*` ordo 5,8 GB, bertambah `porto-fe:pr53`, `porto-fe:next164` (**basi**: `grep -rl "pukulan-cache"` = 0 file, tanpa header keamanan — sumber salah satu kesalahanku), `porto-bump-check` (sudah kuhapus). Izin yang diberikan baru untuk **kontainer**, belum untuk image. |
| **S7** | Restore drill Cloud SQL masih 0× | masih F7 dari §8; PITR aktif ≠ pemulihan terbukti. |

## 13. S1 ditutup, E7 terbukti, dan satu merge yang salah metode (ditulis 2026-10-07 13:48 UTC)

Semua angka di bagian ini adalah keluaran alat yang dibacakan setelah `#58`/`#59`/`#60`
mendarat. Yang meleset dari rencanaku ditulis sebagai meleset, bukan dihaluskan.

### E7 — butir terakhir daftar uji #53: merge dokumen terbukti tidak men-deploy

Buktinya sepasang, bukan satu: kasus uji dan kasus kontrol pada hari yang sama, supaya
"0 run" tidak bisa berarti "aku lupa mengecek".

| merge | isi | `deploy.yml total_count` sebelum → sesudah | run baru |
|---|---|---|---|
| `#59` → `ad767c6` (squash) | `TODO.md` +187, `DEPLOY.md` +54/−5, nol kode, nol workflow | 43 → **43** | **0** |
| `#60` → `f7e24ba` (squash) | `go-backend/mailer/*` | 43 → **44** | `Deploy #44` |

Dua perintah, dan satu jebakan yang menjebakan aku duluan: `total_count` di endpoint
**workflow** menghitung seluruh run workflow itu apa pun branch-nya, jadi ia hanya berarti
kalau dibaca bersama filter `head_sha`.

```bash
curl -s --config $CFG "$API/actions/workflows/deploy.yml/runs?per_page=1" | jq .total_count
curl -s --config $CFG "$API/actions/workflows/deploy.yml/runs?head_sha=$SHA&per_page=100" \
  | jq '[.workflow_runs[] | select(.head_sha == "'"$SHA"'")] | length'
```

Sejak §10 kalimat "merge isi `.md` saja tidak membangun ulang produksi" kutulis sebagai
*harapan yang dijaga `paths-ignore`*. Sekarang **terukur**. Yang dulu membuat celahnya ada:
workflow lama menyulut `push: main` tanpa filter apa pun (lihat run `2501378`/`2d024ab`).

### Kesalahan prosesku sendiri: `#58` jadi merge commit, bukan squash

`PUT /pulls/58/merge` kupanggil tanpa field `merge_method`. Default GitHub untuk field itu
adalah **`merge`**, bukan `squash` — jadi yang mendarat di `main` adalah `fad9aaf` dengan
pesan `Merge pull request #58 from …`. Terukur dari `git log -1 --format=%P | wc -w`:

| commit | PR | jumlah orang tua | bentuk |
|---|---|---|---|
| `fad9aaf` | #58 | 2 | merge commit — **di luar niatku** |
| `ad767c6` | #59 | 1 | squash |
| `f7e24ba` | #60 | 1 | squash |

Yang sengaja TIDAK kulakukan: menulis ulang `main` (force-push) untuk merapikan itu. Riwayat
yang sudah terpublikasi di branch terproteksi — dan sudah jadi image yang sedang serve
produksi, `portfolio-be-00039-4lt` digest `sha256:aa905fcf…` — bukan tempat membersihkan
kecerobohan. Harga membiarkannya cuma satu commit tambahan di log.

Aturan yang kupakai sejak saat itu, dan yang membuat #59/#60 benar: **setiap** panggilan
merge mengirim `merge_method` **dan** `sha` head, tanpa peduli sekuat apa pun keyakinanku
pada nilai default. ID baru **S8** untuk ini — bukan pekerjaan, tapi pagar cara kerja.

### S1 — apa yang sebenarnya bocor, dan apa yang sekarang memotong

Framing-ku di tabel S* salah dan harus dibetulkan dulu sebelum isinya dicoret. Aku menulis
"dialog yang macet menahan POST pengunjung sampai timeout Cloud Run 300 s". Ternyata
`handleContact` menjawab **201 lebih dulu** dan baru mengirim email di goroutine latar
(`main.go:669`, dihitung di `undungEmail`). Yang bocor bukan latensi pengunjung, melainkan
**goroutine + socket tanpa satu baris log pun**: surat hilang diam-diam, dan tidak ada yang
menyebutnya di `/api/health` maupun di log layanan.

A/B pada satu stub yang sama — server menjawab `220` lalu diam selamanya, koneksi tetap
terbuka (stub yang menutup socket menghasilkan EOF, dan EOF bukan kondisi yang diuji):

```
BUKTI: gomail.DialAndSend masih menggantung setelah 5s pada stub yang diam setelah greeting
BUKTI: kirim() memotong setelah 12.011s, err=SMTP 127.0.0.1:43913: greeting: read tcp …: i/o timeout
```

12,011 s itu bukan angka yang kukarang dan bukan kebetulan: ia sama dengan
`batasPercakapan` dan sama dengan `batasMatikan` (`main.go:243`). Satu percakapan SMTP tidak
mungkin lagi memakan seluruh jendela shutdown; sebelumnya tidak ada batas sama sekali, dan
`Dialer` memang tidak menyediakan pegangan (`d.Timeout undefined`).

Tes yang di-commit (`go-backend/mailer/batas_waktu_test.go`, tiga tes tingkat atas):

| tes | tenggat dipadatkan ke | dipotong pada | assert tambahan |
|---|---|---|---|
| diam setelah greeting | 600 ms | **602 ms** | `errors.Is(err, os.ErrDeadlineExceeded)` dan error menyebut `EHLO` |
| diam sesudah `354` (titik penutup pesan tidak dijawab) | 800 ms | **801 ms** | tenggat + stub mencatat `AUTH`/`MAIL FROM`/`RCPT TO`/`DATA` benar-benar diterima + error menyebut `menutup pesan` |
| server hanya mengiklankan `AUTH LOGIN` | — (tidak macet, kembali `nil`) | — | mekanismenya LOGIN, bukan PLAIN; dua tantangan 334 dijawab dua baris yang base64-nya **equal** dengan user & pass |

Bagian yang paling kunikmati dari tes ini adalah **batas bawahnya** (`lepas >= tenggat/2` di
`cekTenggat`): tanpa itu, `err != nil` dari sebab lain — EOF, connection refused, mekanisme
salah — membuat tes hijau sambil menguji hal yang salah.

Yang sengaja **disalin**, tidak "disederhanakan": urutan seleksi mekanisme (`smtp.go:90-105`:
CRAM-MD5 → LOGIN hanya jika PLAIN tidak diiklankan → PLAIN), `tlsConfig =
&tls.Config{ServerName: host}`, dan amplop `MAIL FROM` = akun yang diautentikasi (gomail
mengambilnya dari header `From`, dan `From` memang diisi `user`). `gomail.Message` tetap
dipakai, sekarang murni sebagai pembangun MIME lewat `msg.WriteTo(w)` — empat tes di
`mailer_test.go` tidak tersentuh dan tetap hijau (tiga di antaranya justru menguji header:
From/To/Subject, Reply-To bukan alamat, CRLF tidak jadi baris header baru), begitu juga dua tes
stub di `smtp_ditolak_test.go`. Angka suite: `go test ./mailer/ -count=1` → `ok 1.413s`
(9 tes tingkat atas), `go test ./... -race -count=1` → `ok backend 1.262s / ok mailer 2.428s`,
`gofmt -l .` kosong, `go vet ./...` bersih (satu keluhan IPv6 ditutup `net.JoinHostPort`),
`docker build ./go-backend` exit 0. Yang tetap **tidak** terbukti: percakapan Gmail yang
sungguhan — itu B3, dan bukan bagian S1.

### Produksi setelah `Deploy #44` (dibaca 13:42 UTC, revisi live `portfolio-be-00040-p45`)

| baca | hasil |
|---|---|
| merge → selesai | `CI #127` **2 m 24 s** (`13:32:23`→`13:34:47`), `Deploy #44` **6 m 48 s** (`13:32:23`→`13:39:11`), keduanya `success` |
| image live | `portfolio-be-00040-p45` = `sha256:feb1177138…` = tag `f7e24ba902b7…` |
| `GET <be>/api/health` | 200, `{"db":"ok","status":"ok"}`, 0,782 s |
| `GET <fe>/api/cv` #1 | 200, **839.060 byte**, 5,539 s, `x-cv-asal: render` |
| `GET <fe>/api/cv` #2 (<60 s) | 200, 839.060 byte, **1,800 s**, `x-cv-asal: pukulan-cache`, byte identik, `%PDF-1.4` |
| `GET <fe>/` | 200, 40.693 byte, 0 kemunculan `Application error` |
| `GET <be>/api/certificates` | 200, 607 byte, 0,336 s |
| header FE | HSTS `max-age=31536000; includeSubDomains`, `nosniff`, `DENY`, `strict-origin-when-cross-origin` — **CSP tetap absen** (S3 = O5) |

Enam menit empat puluh delapan juga membuat ramalan "±20 menit per merge" di §11 semakin jauh
salah: dua pengukuran terakhir (6 m 29 s dan 6 m 48 s) berdekatan, dan keduanya adalah merge
kode yang benar-benar men-deploy.

### Dua pembacaan yang salah, dan keduanya terjadi hari ini

1. **`GET https://portfolio-be-….run.app/api/cv` menjawab 404** dan sempat kutafsirkan sebagai
   dugaan regresi. `/api/cv` bukan milik backend sama sekali — ia route handler Next.js.
   Peta yang benar, diukur dari kode (bukan dari tebakan), dan kucatat di sini karena
   `/api/projects` yang dari tadi ada di kepalaku **tidak ada**:

   | path | pemilik | sumber |
   |---|---|---|
   | `/api/cv`, `/api/github-profile`, `/api/github-repos` | **frontend** | `nextjs-frontend/src/app/api/*/route.ts` |
   | `/api/login`, `/api/auth/*`, `/api/contact`, `/api/admin/*`, `/api/certificates*`, `/api/experience*`, `/api/health` | backend, lewat rewrite FE | `next.config.ts:9-17` → `main.go:371-395,524,543,563` |
   | `/api/projects`, `/api/admin/projects` | **tidak ada di mana pun** | `main.go:352` justru menuntutnya 404, bukan 401 |

   Jadi 404 di URL backend untuk `/api/cv` adalah perilaku yang benar. Cara cek yang kupakai
   sebelum menyebut apa pun "hilang": `ls nextjs-frontend/src/app/api/` lalu
   `grep -nE 'source: "/api' nextjs-frontend/next.config.ts`.
2. **Watcher yang kutulis sendiri salah hitung.** `grep -c` menghitung **baris** yang cocok,
   dan aku mencetak seluruh daftar check-run dalam SATU baris — kondisinya tidak pernah
   terpenuhi, watcher berjalan sampai timeout, dan satu siklus tunggu terbuang. Yang benar
   `grep -o pola | wc -l`. Ini cacat pada alat ukurku, bukan pada repo, dan catatan §12 tentang
   "empat bug cara membaca gcloud" sekarang punya saudara dari sisi CI lokal.

### Riwayat run, snapshot 2026-10-07 13:45 UTC

| workflow | total | success | failure | cancelled |
|---|---|---|---|---|
| `CI` (`ci.yml`) | 127 | 124 | 3 | 0 |
| `Deploy to Cloud Run` (`deploy.yml`) | 44 | 37 | 6 | 1 |
| `Watch` (`watch.yml`) | 9 | 8 | 1 | 0 |

`deploy.yml` 44 run itu sekarang termasuk satu yang **tidak** tersulut: merge #59. Itu
bukan kebetulan dan sudah dicatat di bullet `paths-ignore` DEPLOY.md.

### Perubahan tabel butir

| ID | Sebelum | Sesudah |
|---|---|---|
| **S1** | terbuka | **selesai di `f7e24ba`** (PR #60, deploy #44, produksi dibaca ulang). Sisa: B3, dan itu bukan bagian S1. |
| **E7** | "butir terakhir daftar uji #53, belum diuji" | **terbukti: 0 run** dari merge dokumen, dengan kasus kontrol dari merge kode. |
| **S5** | angka CV perlu disinkronkan | DEPLOY.md sekarang memuat empat pengukuran: 774.803 / 783.896 / 839.060 (×2, `#42` dan `#44`)) — dan latensinya dipisah: render vs hit cache. |
| **S6** | ±9 image `porto-*` | `porto-s1-check` sempat kubuat (build verifikasi `docker build ./go-backend`) dan kuhapus pada hari yang sama; hitungan sisa tidak berubah. |
| **S8** (baru) | — | `merge_method` + `sha` wajib eksplisit di tiap `PUT /pulls/*/merge`. Alasan terukur: #58 jadi merge commit. Sudah berlaku di #59 dan #60. |

## 14. Sampel ketiga E7, dan dua angka yang menjatuhkan alasanku sendiri (ditulis 2026-10-07 14:45–16:21 UTC)

### E7, sampel ketiga: merge dokumen lagi, `deploy.yml` diam lagi

`#61` (`docs/s1-dan-e7`, dua file `.md`, nol kode) di-squash-merge dan yang mendarat di `main`
adalah `10fc11253da9c2bdd2757e1e3950828ae9568d4a` (`10fc112`), 1 orang tua — bukan merge commit.
Angka yang kubaca sebelum dan sesudah, dengan jeda 45 detik:

| baca | sebelum merge | sesudah merge |
|---|---|---|
| `deploy.yml total_count` | 44 | **44** |
| run `deploy.yml` pada SHA merge | — | **0** |
| `ci.yml total_count` | 128 | **129** (tersulut `push: main`, `CI #129` `success`) |

Tiga sampel sekarang: `#59` 43→43, `#60` (kode) 43→44, `#61` 44→44. Yang membedakan bukan
"PR dokumen" secara umum, tapi **`paths-ignore` pada `deploy.yml`** — dan ia terbukti dari kedua
sisinya: dua merge dokumen diam (0 run), satu merge kode menyala. `ci.yml` sengaja **tidak** memasang
filter apa pun, jadi angka 129 itu juga bagian dari rancangan: gerbang tes tetap jalan untuk
perubahan dokumen.

Produksi tidak berubah dan itu ikut kucek, bukan kuasumsikan: `portfolio-be-00040-p45` dan
`portfolio-fe-00039-7n5` tetap revisi live, image backend tetap `sha256:feb1177138…`,
`/api/health` 200 `{"db":"ok","status":"ok"}`.

### Angka yang menjatuhkan alasanku sendiri: `next_run_at=null` bukan sinyal

Baris §6 butir 5 sudah kukoreksi di tempatnya; intinya di sini: pada 2026-10-05 02:59:50 UTC
aku membaca `state=active` + **`next_run_at=null`** + `event=schedule` masih 0, lalu menulis
"kemungkinan besar ini yang membuatnya tidak tersulut". Hari ini `event=schedule` sudah **3
baris** — #7 `3e0265a` 2026-10-05 09:35:08Z, #8 `03b2876` 2026-10-06 09:23:21Z, #9 `ad767c6`
2026-10-07 09:12:39Z, ketiganya `success` — dan **`next_run_at` tetap `null`**. Field itu jadi
bukti bahwa workflow-mu tidak akan pernah tersulut, padahal tidak ada yang salah dengan cron-nya.

Dua kesalahan yang tumpang tindih di situ, dan keduanya milikku:

1. **Salah tafsir field.** Yang menyalakan schedule adalah `event=schedule` pada run, bukan
   perkiraan waktu di objek workflow. Aturan baru (ID **S9**): `next_run_at` tidak dipakai
   lagi sebagai diagnosis; kalau perlu membuktikan penyalaan, hitung run per event.
2. **Salah duga jendela — dan koreksiku sendiri di bawah ini juga salah, diluruskan oleh subseksi
   berikutnya.** Aku
   sempat menulis bahwa "cron-nya sekitar 09:1x". Tidak. Cron `watch.yml` adalah **`37 2 * * *`
   = 02:37 UTC** pada ketiga SHA itu (`git show <sha>:.github/workflows/watch.yml | grep cron:`,
   baris 36 di ketiganya). Yang 09:1x adalah **kapan run-nya benar-benar dibuat**. Jadi
   pengukuranku 02:59:50 UTC itu 22 menit 50 detik **sesudah** cron, dan 6 jam 35 menit
   **sebelum** run hari itu muncul. Dua-duanya salah arah, satu akar: aku menyimpulkan jadwal
   dari satu pembacaan tanpa pernah membandingkan `created_at` run dengan ekspresi cronnya.

```bash
# cara yang benar, dan murah
curl -s --config $CFG "$API/actions/workflows/watch.yml/runs?per_page=100" \
  | jq -r '(.workflow_runs | group_by(.event) | map("\(.[0].event)=\(length)") | join(" "))'
#   hari ini: total=9 → schedule=3 workflow_dispatch=6
```

Isi run #9-nya sendiri: `rows=17 merah=0`, langkah selesai `09:13:22Z` (±43 s dari mulai).
Angka `rows` bergerak antar-hari (Watch #5 pernah `rows=19`) karena ia hitungan baris tabel
hari itu, bukan konstanta — tidak ada yang perlu dicurigai dari selisih itu, tapi juga tidak
boleh ditulis sebagai "jumlah probe tetap 17".

### Yang tertunda bukan cuma run: koreksiku di §6 menyalakan ulang sesuatu yang sudah dicatat F10

Tabel ini bukan temuan baru, dan bagian paling memalukan dari hari ini justru itu:

| run | `head_sha` | cron | `created_at` = `run_started_at` | selisih dari 02:37 |
|---|---|---|---|---|
| Watch #7 | `3e0265a` | 2026-10-05 02:37Z | 2026-10-05 **09:35:08Z** | **6 jam 58 m 08 s** |
| Watch #8 | `03b2876` | 2026-10-06 02:37Z | 2026-10-06 **09:23:21Z** | **6 jam 46 m 21 s** |
| Watch #9 | `ad767c6` | 2026-10-07 02:37Z | 2026-10-07 **09:12:39Z** | **6 jam 35 m 02 s** |

F10 (§8) **sudah** mencatat bahwa cron `37 2 * * *` menghasilkan satu baris `event=schedule` yang
datang 6 jam 58 menit setelah menit cron-nya, sudah memakai angka itu untuk menggeser tanggal
re-check dari 2026-10-12 ke **2026-10-13 03:00 UTC**, dan baris **A0** di §9.0 (ditulis 2026-10-06)
sudah menambahkan enam pembacaan pada hari itu (02:37:11 → 03:31:31 UTC) yang semuanya masih
`schedule=1`.
Jadi ketika aku menulis di §6 butir 5 bahwa "cron-nya sekitar 09:xx", aku tidak hanya salah —
aku mengarang ulang kesimpulan yang ada di file yang sama, beberapa baris di bawah yang sedang
kuedit. Aturan kerja yang gagal di sini: mengoreksi catatan tanpa mencari catatan itu (`grep -n
"37 2 \|schedule"`) lebih dulu.

Yang memang baru dari hari ini cuma dua hal:

1. **Dua sampel tambahan** (#8, #9), sehingga selisihnya sekarang tiga titik: 6 j 58 m → 6 j 46 m →
   6 j 35 m, **mengecil ±11 menit per hari** (−11 m 47 s, lalu −11 m 19 s). Tiga titik monoton tidak
   membuktikan drift; yang membuktikannya hari ke-4 dan ke-5. Prediksi yang bisa difalsifikasi:
   #10 ≈ **09:01 UTC pada 2026-10-08**, #15 ≈ **08:05 UTC pada 2026-10-13**. Meleset → klaim drift
   dicabut.
2. **Ekspresi cron-nya kubaca langsung dari ketiga SHA** (`git show <sha>:.github/workflows/watch.yml`,
   baris 36, identik `"37 2 * * *"`), jadi hipotesis "cron pernah diubah lalu dikembalikan" tertutup.
   `next_run_at` masih `null` pada objek workflow yang sama.

Konsekuensi operasionalnya tetap seperti yang sudah ditulis F10, dan ini bukan arkeologi: `watch.yml`
adalah satu-satunya probe yang membandingkan produksi dengan assertion `deploy.yml`, sementara
alert-nya lahir dari cron 02:37 dan baru sampai sekitar **jam 09:12** — ±6,6 jam untuk sesuatu yang
bernama "watch". Karena itu §6 butir 5 (kasih `issues: write` atau tidak) harus diputuskan dengan
angka itu di tangan, dan tanggal yang sah untuk membaca jumlah barisnya tetap **2026-10-13 03:00 UTC**
(bukan 2026-10-12 yang kutulis di baris §6 — sudah kukoreksi di tempatnya).

Yang **tidak** kujelaskan: kenapa penundaannya sebesar itu. Dugaan defaultku tadi ("GitHub memang
menunda `schedule` saat beban tinggi") tidak bisa kubuktikan dari mesin ini — WebFetch dokumen
kena batas API hari ini — jadi kalimat itu aku buang dan tidak kunyatakan alasannya. Penyebab yang
kubuang dengan data: repo ini `private=false` / `visibility=public`, dan `event=schedule` di seluruh
repo **hanya** 3 baris ini — jadi bukan workflow lain yang menyita antrean penyalaan.

```bash
# tabel di atas, reproducible
API=https://api.github.com/repos/ArkanFzi/website-porto2
curl -s --config $CFG "$API/actions/runs?event=schedule&per_page=100" \
  | jq -r '.workflow_runs[] | "\(.name) #\(.run_number) \(.head_sha[0:7]) created=\(.created_at) started=\(.run_started_at) \(.conclusion)"'
for s in 3e0265a 03b2876 ad767c6; do git show $s:.github/workflows/watch.yml | sed -n '36p'; done
```

### `/api/cv`: angka "16,4 s replika dingin" yang kutulis 20 menit lalu itu salah, dan log permintaan mematahkannya

Yang kutulis di draf awal subseksi ini: 16,384 s terjadi karena `min-instances` tidak di-set ⇒
replika dingin, selisih 10,845 s = harga replika. Log `run.googleapis.com/requests` milik Cloud Run
mematahkan itu. Empat belas permintaan `/api/cv` hari 2026-10-07, **server-side**:

| kelas | server-side | sampel (waktu UTC, instance) |
|---|---|---|
| **render pertama pada sebuah instance** | **13,104 – 15,252 s** | 03:59:48 = 15,066 (`…71a`, instance lahir 03:59:43) · 04:46:36 = 15,252 (`…46`, lahir 04:46:25) · 13:38:52 = 14,288 (`…5b`, lahir 13:38:43) · 14:40:54 = 13,104 (`…f4`, `/api/cv` pertamanya) |
| **render berikutnya, instance yang sama** | **3,985 – 4,766 s** | 04:01:27 = 4,202 · 04:57:49 = 4,224 · 09:12:49 = 4,766 · 13:42:05 = 4,118 · 15:28:30 = 3,985 |
| hit cache < 60 s | **8 – 34 ms** | 04:01:32 = 13,8 ms · 04:57:54 = 8,3 ms · 13:42:11 = 20,0 ms · 14:41:21 = 34,1 ms |
| posisi dalam instance tidak diketahui | 5,052 s | 00:45:42 pada `…66` (instance ini lebih tua dari jendela log hari ini) |

Keduanya tidak tumpang tindih sedikit pun (13,1 di atas vs 5,05 di bawah), dan penjelasannya bukan
replika: **instance `…f4` sudah hidup 31 menit** ketika menerima 13,104 s itu (lahir 14:09:14 lewat
permintaan `/` pertama yang butuh 4,689 s = start kontainer), dan sepanjang 31 menit itu `/` diminta
terus-menerus.

Kenapa kontainer hampir tidak pernah dingin: **2.534 permintaan** masuk ke `portfolio-fe` antara
09:00:05 dan 15:59:43 UTC (jendela 6 j 59 m 38 s = 25.178 detik), dan **2.509 di antaranya (99,0 %)
berasal dari `GoogleStackdriverMonitoring-UptimeChecks`** — rata-rata satu permintaan tiap 9,94
detik; 10,03 detik kalau hanya uptime checks yang dihitung. Instance berganti generasi empat kali
hari ini (…66 → …71a → …46 → …5b → …f4), dan **tiga di antaranya tepat berimpit dengan pergantian
revisi**: 03:59:43 (→00037), 04:46:25 (→00038), 13:38:43 (→00039). Yang keempat, `…5b`→`…f4` pada
14:09:14, terjadi **di revision yang sama** dan tidak kutafsirkan. Artinya `min-instances=0` hari
ini praktis tidak pernah tertagih ke pengunjung: yang menyalakan kontainer baru adalah deploy, bukan
sepi trafik.

Client-side vs server-side, dan sisa yang harus dibayar jaringan:

| permintaan | `curl` (klien) | log (server) | selisih |
|---|---|---|---|
| 14:40:54 render pertama `…f4` | 16,384 s | 13,104 s | 3,28 s |
| 14:41:21 hit cache | 2,228 s | 0,034 s | **2,19 s** |
| 15:28:30 render berikutnya | 5,504 s | 3,985 s | 1,52 s |

Jadi hitungan yang benar: **±9 s** (13,1–15,3 vs 4,0–4,8) hidup **di dalam kontainer yang sudah
hidup**, per instance pertama, bukan per replika. Catatan lama "13,9 s cold / 5,8 s warm" di bullet
Skala DEPLOY.md adalah fenotipe yang sama dengan label yang sama salahnya.

Yang **tidak** bisa kuisolasi dari luar, dan ini bukan malas menyebutnya: di dalam ±9 s itu ada
(a) Chromium first-run (`puppeteer.launch()` + `browser.close()` **per render** — `route.ts:45-69`,
tidak ada browser pool) dan (b) `/cv-layout` pertama yang dikompilasi/dilayani Next lewat loopback.
Dua-duanya kubuang sebagai sumber bukti: `page.goto` internal tidak tercatat di request log
(terukur: **0 baris** memuat `cv-layout` sepanjang hari) dan stdout kontainer kosong pada jendela
14:40:40–14:41:40 (terukur: hanya 8 baris request log, nol `textPayload`). Yang bisa memisahkan
keduanya cuma render pemanasan saat boot atau instrumentasi di rute itu — **perubahan kode**, jadi
butuh katamu (ID baru **S12**).

Konsekuensinya untuk butir **standby replika** berubah arah (ID barunya **S13** di tabel bawah), dan
ini bagian yang penting: `minInstances=1` tidak menyentuh ±9 s itu sama sekali. Yang dibelinya cuma
start kontainer (4,689 s, dan itu pun jarang karena uptime checks menghangatkan instance setiap
10,03 detik) — jadi uangnya dibayar untuk sesuatu yang sudah terjadi gratis. Yang memang menghapus
9 s bagi pengunjung pertama adalah **satu render pemanasan saat instance naik**, nol rupiah.

Keputusan tetap milikmu; tabel di atas yang jadi dasarnya sekarang datang dari log produksi, bukan
dari `curl` yang kutafsirkan.

```bash
# kedua tabel di atas, reproducible. CATATAN: operator pencocokan string di filter log adalah `=~`,
# bukan `~` — pakai `~` hasilnya KOSONG tanpa error (terukur dua kali hari ini).
gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="portfolio-fe" AND httpRequest.requestUrl=~"/api/cv" AND timestamp >= "2026-10-07T00:00:00Z"' \
  --limit 100 --order asc --format 'json(timestamp,httpRequest.latency,labels.instanceId)' \
  | jq -r '.[] | "\(.timestamp[11:19]) \(.httpRequest.latency) inst=\(.labels.instanceId[0:12])"'

gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="portfolio-fe" AND timestamp >= "2026-10-07T09:00:00Z" AND timestamp < "2026-10-07T16:00:00Z"' \
  --limit 20000 --format 'json(timestamp,httpRequest.userAgent)' \
  | jq -r '[.[] | select(.httpRequest)] | "request=\(length) uptime=\([.[] | select(.httpRequest.userAgent | test("UptimeChecks"))] | length)"'

# tabel sisi backend: ganti service_name, dan lihat bahwa tidak ada satu pun baris UptimeChecks
gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="portfolio-be" AND timestamp >= "2026-10-07T09:00:00Z" AND timestamp < "2026-10-07T16:00:00Z"' \
  --limit 20000 --order asc --format 'json(timestamp,httpRequest.userAgent,httpRequest.latency,labels.instanceId,resource.labels.revision_name)' \
  | jq -r '[.[] | select(.httpRequest)] | "request=\(length) uptime=\([.[] | select(.httpRequest.userAgent | test("UptimeChecks"))] | length)", (group_by(.labels.instanceId) | .[] | "inst=\(.[0].labels.instanceId[0:12]) rev=\(.[0].resource.labels.revision_name) \([.[] | .httpRequest.latency | rtrimstr("s") | tonumber] | max) maks")'

# umur instance = permintaan pertama yang tercatat padanya
gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="portfolio-fe" AND timestamp >= "2026-10-07T00:00:00Z"' \
  --limit 20000 --order asc --format 'json(timestamp,httpRequest,labels.instanceId,resource.labels.revision_name)' \
  | jq -r '[.[] | select(.httpRequest)] | group_by(.labels.instanceId)
           | .[] | "inst=\(.[0].labels.instanceId[0:12] // "null") rev=\(.[0].resource.labels.revision_name) pertama=\(.[0].timestamp[11:19]) terakhir=\(.[-1].timestamp[11:19]) permintaan=\(length)"'
```

### Sisi backend: 22 permintaan dalam 7 jam, dan harga replika standby-nya < 1 detik

Asimetri kedua service ini yang membuat `minInstances` tidak bisa diputuskan dengan satu angka:

| jendela (09:00–16:00 UTC) | siapa | permintaan ke `portfolio-be` | permintaan pertama pada instance |
|---|---|---|---|
| 09:12:47–09:12:54 | **Watch #9** (run-nya dibuat 09:12:39) | 9 | **0,922 s** (`/api/health`), sisanya 4,8–20 ms |
| 13:38:51–13:42:13 | langkah verifikasi `Deploy #44` | 9 | 0,0097 s — **start kontainer tidak tertangkap di baris ini**; kemungkinannya terserap oleh `--wait` pada langkah deploy, dan itu hipotesis, bukan pengukuran |
| 14:40:53–14:41:03 | probes-ku sendiri | 2 | **0,221 s** |
| 15:28:28–15:28:32 | probes-ku sendiri | 2 | **0,422 s** |

Terukur: **22 permintaan HTTP** ke `portfolio-be` dalam jendela tujuh jam, **nol** di antaranya dari
uptime checks —
karena check untuk BE adalah **TCP 443** (`portfolio-be-uptime-3lw7E4A0E40`, tercatat di bagian alert
DEPLOY.md), dan koneksi TCP tidak menghasilkan baris `run.googleapis.com/requests`. Jadi BE memang
menganggur di nol replika, tapi harga yang dibayar untuk satu permintaan pertama sesudah menganggur
adalah **0,22–0,92 detik**, bukan 9 detik. Untuk konteks: catatan lama `/api/certificates` 1,7 s cold
masih berdiri (endpoint itu menyentuh Cloud SQL; hari ini yang pertama dipukul adalah `/api/health`).

Gabungan kedua tabel inilah isi **S13**: FE (yang dilihat pengunjung) dihangatkan 99,0 % oleh uptime
checks sendiri dan 9 detik yang hilang ada di dalam kontainer → `minInstances` tidak membeli apa pun;
BE benar-benar tidur tapi bangunnya < 1 detik → `minInstances` membeli < 1 detik dengan biaya
per-jam. Yang menguntungkan di kedua sisi adalah **S12** (render pemanasan saat boot), dan itu kode,
bukan konfigurasi.

### Satu observasi yang lewat di pull log yang sama: probe `.env` dan `.git/config`

Bukan bagian dari E7/S1, tapi tercatat di pull log yang sama dan layak ditulis daripada menguap:
`arkfazone-portofolio.elarisnoir.my.id` dipprobe **10 path `.env*`** pada 03:44:54–03:45:27 UTC oleh
UA `CertLabBot/1.0 (certificate research)`, dan `.git/config` dua kali (05:55:15, 12:36:00) dari UA
Safari/Chrome biasa. Yang terukur di log: varian `http://` dijawab **302** (redirect ke https,
ditambah 13 permintaan tanpa `instanceId` — sebagian tidak pernah menyentuh kontainer), dan untuk
`.env*` lanjutan `https:` -nya **tercatat** dan dijawab **404** — tidak ada satu pun isi file yang
sampai. `.git/config` berhenti di 302 dan lanjutan https-nya tidak muncul di log sama sekali, jadi
vonis untuk yang satu itu **belum** bisa kubacakan dari data ini.

### `total_count` berfilter mengembalikan dua angka untuk pertanyaan yang sama

Bullet "Riwayat run" di DEPLOY.md selama ini menyebut caraku mengukur yang "benar": `?status=X`
lalu baca `total_count`. Hari ini metode itu menghasilkan **117** satu kali, lalu **126** tiga kali
berturut-turut, pada `ci.yml` dan dalam rentang beberapa menit:

```bash
API=https://api.github.com/repos/ArkanFzi/website-porto2
for i in 1 2 3; do curl -s --config $CFG "$API/actions/workflows/ci.yml/runs?status=success&per_page=1" | jq .total_count; done
#   117   ← pembacaan pertama (14:5x UTC)
#   126 126 126   ← tiga pembacaan berikutnya
```

Angka yang benar diketahui dari cara yang lebih murah untuk diverifikasi silang: tarik semua baris
lalu `group_by(.conclusion)`.

```bash
for p in 1 2; do curl -s --config $CFG "$API/actions/workflows/ci.yml/runs?per_page=100&page=$p"; done \
  | jq -s '"baris=\([.[].workflow_runs[]]|length)", ([.[].workflow_runs[]] | group_by(.conclusion) | map("\(.[0].conclusion)=\(length)") | join(" "))"' -r
#   baris=129 → failure=3 success=126   (126+3 = 129, dan status semua run: completed=129)
```

Yang tertutup dengan cara itu: `deploy.yml` 44 = 37 success + 6 failure + 1 cancelled
(42 `push` + 2 `workflow_dispatch`), `watch.yml` 9 = 8 success + 1 failure
(3 `schedule` + 6 `workflow_dispatch`), `ci.yml` 129 = 126 + 3. Selisih 9 pada angka 117 itu
**tidak kujelaskan** — yang bisa kugugurkan cuma penjelasan "ada run yang belum selesai":
`skipped`, `queued` dan `in_progress` ketiganya 0, dan seluruh 129 run berstatus `completed`. Aturan baru (ID **S11**): `total_count` dari query
berfilter `status=` tidak boleh dipakai sendirian; selalu paginasi penuh + `group_by(.conclusion)`,
dan pakai `status=completed` (129) sebagai pemeriksaan bahwa tidak ada baris yang hilang.

Perbaikan yang keluar dari sini: angka `CI` hari ini adalah **129 run, 126 success, 3 failure**
— bukan "125 success, 4 failure" yang sempat kutulis sambil lalu di draf bullet ini sebelum
diukur.

### Perubahan tabel butir (§14)

| ID | Sebelum | Sesudah |
|---|---|---|
| **S9** (baru) | — | `next_run_at` **tidak dipakai lagi** sebagai diagnosis penyalaan `schedule`. Yang sah: hitung run per event. Alasan terukur: tiga run `schedule` mendarat sementara field itu `null` terus. |
| **S10** (baru) | — | **Bukan temuan baru:** F10 (§8) dan A0 (§9.0) sudah mencatat `schedule` Watch datang ±6,6 jam setelah cron 02:37 UTC. Yang ditambahkan #8 dan #9 → selisih mengecil ±11 m/hari, dan tesis "drift" difalsifikasikan: #10 ≈ 09:01 UTC pada 2026-10-08, #15 ≈ 08:05 UTC pada 2026-10-13. Meleset → klaim drift dicabut. Tanggal baca yang sah tetap **2026-10-13 03:00 UTC** seperti F10, dan keputusan §6 butir 5 wajib menyebut latensi ±6,6 jam. |
| **S11** (baru) | metode "`?status=X` → `total_count`" ditulis di DEPLOY.md sebagai cara benar | Turunkan derajatnya jadi pemeriksaan sekunder. wajib: paginasi penuh + `group_by(.conclusion)`. Alasan terukur: `ci.yml?status=success` memberi 117 lalu 126 (×3) untuk pertanyaan yang sama; yang menutup adalah 126+3=129 **pada pembacaan 14:54 UTC** — bacaan 16:10 UTC menutup di 128+3+2=133, lihat **S14**. Metode paginasinya yang tetap benar, angkanya yang berumur pendek. |
| **E7** | terbukti 2 sampel | **tiga sampel, dua sisi**: `#59` 43→43, `#60` (kode) 43→44, `#61` 44→44 dengan `CI #129` tetap tersulut. |
| **E4** (bukan butir ini) dan **O3** (tidak ada) | kusedia menyebut keduanya sebagai "butir minInstances" | **Koreksi:** `E4` = `cancel-in-progress` CI, sudah hijau sejak F3; seri `O` tidak ada di file ini. Butir standby replika yang kumaksud sekarang bernama **S13**, dan isinya sudah diukur. |
| **S13** (baru) | sempat kutulis di draf sebagai "**E4/O3**" — **dua ID itu salah: E4 adalah butir `cancel-in-progress` CI (`main.go` tidak bersangkutan, lihat §7/tabel E), dan seri `O` tidak ada di file ini** (satu-satunya `O5` yang dipakai di baris S3 adalah rujukan ke daftar opsi lama). | Butir yang sebenarnya: apakah `min-instances=0` pada `portfolio-fe` layak diganti replika standby. Jawabannya sekarang punya angka dan **berbentuk "tidak"**: Jawaban sekarang berbentuk dua bagian dan keduanya terukur: untuk **FE** yang dibelinya cuma start kontainer 4,689 s sementara uptime checks (2.509 dari 2.534 permintaan 09:00–16:00 UTC) sudah menghangatkannya lebih dulu; untuk **BE** memang tidak ada probe HTTP (22 permintaan/7 jam, 0 uptime) tapi permintaan pertama sesudah menganggur cuma 0,22–0,92 s. |
| **S12** (baru) | — | **Satu render pemanasan saat instance naik** (atau reuse browser) di `nextjs-frontend/src/app/api/cv/route.ts`: memangkas ±9 s untuk pengunjung pertama dengan nol rupiah, tidak seperti `minInstances`. Butuh katamu karena ini mengubah kode yang ter-deploy. Sebelum setuju: pemisahan Chromium-first-run vs Next-compile `/cv-layout` belum terukur (0 baris `cv-layout` di request log, 0 `textPayload` di stdout). |
| **S5** | empat pengukuran CV | byte tetap empat angka yang sama (839.060); **yang berubah justru penjelasan latensinya** — label "replika dingin" gugur, diganti dua kelas server-side dari log (13,1–15,3 s render pertama per instance vs 4,0–4,8 s berikutnya). |
| **S14** (baru) | snapshot "Riwayat run" di DEPLOY.md (14:54 UTC): `CI` 129 run → 126 success, 3 failure, **0 cancelled** | Baca ulang dengan metode yang sama (paginasi + `group_by`): 16:10 UTC = **133** → 128/3/**2 cancelled**; 16:21 UTC = **135** → **129 success, 3 failure, 3 cancelled**. Tiga `cancelled` itu **yang pertama dalam sejarah `ci.yml`** (nol sepanjang 129 run pertama) dan penyebabnya push-ku sendiri di branch PR #62: `#131`/`#132` tercipta 16:02:54 dan 16:05:16 lalu mati 16:05:19 dan 16:07:53; `#134` menyusul mati 16:16:51. Run yang dibiarkan selesai butuh 2 m 22 s (`#130`)–2 m 49 s (`#133`), dan aku push lagi tiap ±2,5 m. Batasnya ikut terbaca: `#131` dibatalkan `#132`, `#132` oleh `#133`, `#134` oleh `#135` — selalu push yang datang selagi run sebelumnya berjalan; `#130` dan `#133` selamat karena push berikutnya datang 43 m dan 4 m 23 s sesudahnya. Jadi `cancel-in-progress: true` di gerbang tes terbukti dari **aksinya**, bukan dari teks YAML-nya; selama ini yang terbukti cuma `false` di sisi deploy (F3). Konsekuensi untuk dokumen ini: **angka total `CI` tidak layak ditulis tanpa stempel jam**, karena setiap push ke PR yang masih terbuka berpotensi menggesernya. **Bukan sampel keempat E7**: `deploy.yml` tetap 44 run dengan 0 baru, tapi keenam push itu terjadi di branch dan `deploy.yml` hanya bereaksi pada `main` — jadi nol-run ini tidak menguji `paths-ignore` sama sekali. Bukti E7 tetap tiga sampel merge. |

