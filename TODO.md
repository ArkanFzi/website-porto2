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
di 13 titik. M10 sengaja dibuat **mendukung** M11: baseline ratchet §1 menyusut tiap perbaikan.

Urutan yang kuambil: gerbang dulu (permintaanmu), produk setelah — dengan konsekuensi jujur bahwa
situs tetap kehilangan pesan kontak sampai M11 jalan, dan mulai sekarang CI akan **mengingat** itu
lewat file baseline, bukan melupakannya. Konsekuensi itu **berlaku sampai F9 langkah (1) mendarat**
(lihat bloknya di §8): sejak itu pesan pengunjung masuk ke `contact_messages`, dan sejak langkah (3) pesan itu
bisa **dibaca dan dihapus kembali** lewat `GET`/`DELETE /api/admin/contact` ber-JWT — 401 untuk siapa pun tanpa
token, terukur di produksi. Yang masih terbuka: tidak ada yang dikirim ke inbox email (langkah 2, menunggu
kredensial) dan skema masih dibuat saat start (langkah 5).

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
| 5 | `watch.yml` membuat issue otomatis | **Hold atas keputusanmu (4a), sampai 8 hari baris `schedule` terkumpul.** `issues: write` tetap tidak diberi. Perubahan 2026-10-05: Watch sekarang **bisa** membaca state cloud lewat identitas `github-watch@…` yang cuma memegang `roles/run.viewer` (F8) dan sudah membuktikannya dari runner — Watch #4 `rows=17 merah=0`, Watch #5 `rows=19 merah=0`. Status terukur 02:59:50 UTC: `state=active`, **`next_run_at=null`**, `event=schedule` di repo masih **0**, 2 jam 23 menit lewat cron. Dua penyebab umum kubuang dengan pengukuran: repo `public` dan plan `pro`. Re-check paling cepat 2026-10-12 |
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
| E7 | Dokumen tidak memicu deploy | **hijau — dua pengukuran** | (1) merge PR #9 (`f218564`, hanya `README.md`/`DEPLOY.md`/`TODO.md`) → `deploy.yml` run count **0** untuk SHA itu, `ci.yml` push run #14 `success`. (2) merge PR #13 (`7d7217b`, juga dokumen saja) → `deploy.yml` **0 run**, `watch.yml` 0 run, `ci.yml` push run #23 `success`, dan `gcloud run services describe` tetap `portfolio-be-00018-fsc` / `portfolio-fe-00017-wqb` @100% — merge dokumen tidak mengubah apa pun yang melayani request. Kontrasnya terukur di hari yang sama: PR #10/#11/#12 yang menyentuh `.github/workflows/**` memicu deploy run #20, #21, #22 — ketiganya `success`. `paths-ignore: ['**.md','docs/**']` + `actionlint` bersih. **(3)–(6) diukur hari ini bersama F6:** merge PR #15 (`b45c298`), #16 (`dfb9147`), #19 (`75b2f3f`) dan #20 (`6281b7f`) — keempatnya dokumen saja — **0 run `Deploy to Cloud Run`** masing-masing (yang jalan hanya `CI`, dan di #19/#18 ada `Watch`). Kontrasnya diukur pada jendela yang sama: `382f0e4` (PR #17) dan `3a88e25` (PR #18) masing-masing **1 run deploy**. Query-nya, supaya bisa diulang: `actions/runs?per_page=100` lalu `select(.head_sha==<SHA merge>) \| select(.name\|test("deploy";"i")) \| length` |
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

### K — Dua klaimku sendiri yang gagal diukur ulang

| # | Klaim lama | Realita 2026-10-05 | Sebab |
|---|---|---|---|
| **K1** | "PITR **mati**; `pointInTimeRecoveryEnabled` absent" (dicatat 2026-10-04, jadi bahan keputusan 2a) | PITR **aktif penuh** | Aku membaca path JSON yang salah: `.settings.backupConfiguration.settings.pointInTimeRecoveryEnabled` (tidak ada) → keluaran `"absent"`. Path benar `.settings.backupConfiguration.pointInTimeRecoveryEnabled` → `true`. Bukti dua-duanya dijalankan berdampingan hari ini dan hanya bedanya `settings` di tengah. Kesalahan klasnya sama dengan yang kutulis di §7 "Catatan jujur" #6: **alat yang kupakai bukan verifikasi** |
| **K2** | "`spec.template.spec.serviceAccountName` **kosong** → default compute SA" (`DEPLOY.md` §Postur IAM) | Field itu **diisi eksplisit** dengan `486641216758-compute@developer.gserviceaccount.com` di kedua service | Kalimat itu kutulis sendiri kemarin tanpa `jq` pada field tersebut. Kabar baiknya: F5 tinggal mengganti satu field bernama, bukan menambang default |

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
| **F9** (6b + 7) | M11 urutanku: (1) tabel `contact_messages` + POST `/api/contact` menulis (sekaligus menutup `main.go:173` yang membuang error gorm); (2) email via gomail; (3) rute admin `POST /api/auth/login`, `GET/DELETE /api/admin/contact` ber-JWT; (4) buang hardcode `http://localhost:8080` di `cv-layout`; (5) hapus `seedData()` + `AutoMigrate` saat start; (6) tutup 13 error gorm yang diabaikan. Satu sub-langkah = satu PR | **E13**: jumlah path mati di `tools/ci/api-baseline.json` **turun dari 13** dan `api-contract-check.mjs` tetap `rc=0`; 1 POST dari situs publik → **terhitung** lewat `GET /api/admin/contact` (count +1, dan **401 tanpa JWT**); email: 1 log run membuktikan SMTP menerima (hanya setelah kredensial ada); `go vet`+gofmt bersih; endpoint admin tidak menambah secret yang terbaca CI | Semua lewat gerbang yang sudah terbukti. (2) **terblokir padamu** (lihat di bawah). Rute admin = permukaan baru di internet: tanpa JWT tidak ada satu pun rute admin yang boleh 200, dan itu kukunci di job `api`, bukan di narasi. **Status 2026-10-05:** (1) #22, (3) #24, (4) #25, (5) #27 sudah mendarat — path mati 13 → 9 (tidak bergerak di (5), karena (5) tidak menyentuh frontend); (2) terblokir kredensial; (6) belum |
| **F10** (4a) | *Hold* — `issues: write` **tidak** dipasang. Tidak ada kerja; hanya dicatat supaya tidak membusuk jadi keputusan yang tidak pernah diambil | Re-check paling cepat **2026-10-12 02:37 UTC**, syaratnya ≥8 baris `event=schedule` dan 0 MERAH. Kalau ada MERAH sebelumnya, hold menang dan alarm tetap run merah | nol |

### Yang masih butuh darimu

1. **`EMAIL_USER` + `EMAIL_PASS`** di Secret Manager (app password Gmail, bukan password akun). Aku tidak
   menulis nilai secret, hanya namanya ke `secretNames` di `deploy.yml`. F9 langkah (2) tidak bisa mulai
   tanpa ini; langkah (1), (3), (4), (5), (6) bisa.
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

**Butiran baru yang keluar setelah F9 langkah (1) mendarat — rate limit `POST /api/contact`.** Endpoint ini
sekarang adalah **tulis DB tanpa autentikasi** yang terbuka di internet. Tiga pilihan yang kubaca: **(i)**
batas per IP di middleware gin — murah dan nyata, tapi in-memory jadi hilang saat scale-to-zero; **(ii)**
honeypot di form — nol infra, tapi tidak menolak bot yang serius; **(iii)** terima dulu dan pantau jumlah baris
seminggu — nol kode, tagihannya Cloud SQL. Aku sengaja tidak memilih sendiri, dan ini bukan kekurangan ide:
sebelumnya endpoint ini *tidak bisa* ditumpahi spam karena dia tidak menulis apa pun, dan sejak pagi itu bisa.
Nomor ini kutaruh di sini, bukan di dalam daftar di atas, karena tidak ada satu pun butir 1–4 yang berubah
olehnya.

**Empat butir yang keluar setelah F9 langkah (3), (4) dan (5) mendarat.** **(a)** Klausa E13 "count +1 lewat
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
Cloud SQL.

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
buktinya belum dapat; build image yang tidak reproducible (§7 "Catatan jujur" #5 —
digest berbeda untuk konten identik); artefak CI ≠ artefak produksi (masih benar, dan `deploy.yml` tidak
pura-pura mengesahkannya); `allUsers → roles/run.invoker` (memang publik by design).
