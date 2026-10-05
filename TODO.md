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
| 4 | Runtime SA tanpa `roles/editor` | **Setengah jalan, dan sengaja dipisah.** Diverifikasi 2026-10-05 01:47 UTC: `486641216758-compute@developer.gserviceaccount.com` masih `roles/editor` + `roles/pubsub.publisher` se-proyek dan **masih** yang melayani request di kedua service. F4 sudah selesai: `portfolio-runtime@…` dibuat dengan grant seperlunya saja (reader pada repo AR `portfolio-app`, logWriter, metricWriter, secretAccessor per-secret pada 5 secret) dan **belum dipakai apa pun** — angka lengkapnya di §8 F4. F5 (pindah service) dan F6 (cabut `editor`) masih terbuka; keduanya tidak kubarengkan dalam satu PR supaya kalau merah, penyebabnya terbaca |
| 5 | `watch.yml` membuat issue otomatis | **Hold atas keputusanmu (4a), sampai 8 hari baris `schedule` terkumpul.** `issues: write` tetap tidak diberi, jadi Watch hanya menulis baris harian + membuat run merah; alarmnya notifikasi default GitHub. Status terukur 02:12 UTC: workflow `state=active`, 3 run selesai (#1 `failure`, #2 & #3 `success`, `rows=13 merah=0`) — **tetapi ketiganya `workflow_dispatch`**, dan run `event=schedule` di repo masih **0** karena cron `37 2 * * *` baru jatuh tempo 02:37 UTC. Re-check paling cepat 2026-10-12 |
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
| E7 | Dokumen tidak memicu deploy | **hijau — dua pengukuran** | (1) merge PR #9 (`f218564`, hanya `README.md`/`DEPLOY.md`/`TODO.md`) → `deploy.yml` run count **0** untuk SHA itu, `ci.yml` push run #14 `success`. (2) merge PR #13 (`7d7217b`, juga dokumen saja) → `deploy.yml` **0 run**, `watch.yml` 0 run, `ci.yml` push run #23 `success`, dan `gcloud run services describe` tetap `portfolio-be-00018-fsc` / `portfolio-fe-00017-wqb` @100% — merge dokumen tidak mengubah apa pun yang melayani request. Kontrasnya terukur di hari yang sama: PR #10/#11/#12 yang menyentuh `.github/workflows/**` memicu deploy run #20, #21, #22 — ketiganya `success`. `paths-ignore: ['**.md','docs/**']` + `actionlint` bersih |
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
| **F9** (6b + 7) | M11 urutanku: (1) tabel `contact_messages` + POST `/api/contact` menulis (sekaligus menutup `main.go:173` yang membuang error gorm); (2) email via gomail; (3) rute admin `POST /api/auth/login`, `GET/DELETE /api/admin/contact` ber-JWT; (4) buang hardcode `http://localhost:8080` di `cv-layout`; (5) hapus `seedData()` + `AutoMigrate` saat start; (6) tutup 13 error gorm yang diabaikan. Satu sub-langkah = satu PR | **E13**: jumlah path mati di `tools/ci/api-baseline.json` **turun dari 13** dan `api-contract-check.mjs` tetap `rc=0`; 1 POST dari situs publik → **terhitung** lewat `GET /api/admin/contact` (count +1, dan **401 tanpa JWT**); email: 1 log run membuktikan SMTP menerima (hanya setelah kredensial ada); `go vet`+gofmt bersih; endpoint admin tidak menambah secret yang terbaca CI | Semua lewat gerbang yang sudah terbukti. (2) **terblokir padamu** (lihat di bawah). Rute admin = permukaan baru di internet: tanpa JWT tidak ada satu pun rute admin yang boleh 200, dan itu kukunci di job `api`, bukan di narasi |
| **F10** (4a) | *Hold* — `issues: write` **tidak** dipasang. Tidak ada kerja; hanya dicatat supaya tidak membusuk jadi keputusan yang tidak pernah diambil | Re-check paling cepat **2026-10-12 02:37 UTC**, syaratnya ≥8 baris `event=schedule` dan 0 MERAH. Kalau ada MERAH sebelumnya, hold menang dan alarm tetap run merah | nol |

### Yang masih butuh darimu

1. **`EMAIL_USER` + `EMAIL_PASS`** di Secret Manager (app password Gmail, bukan password akun). Aku tidak
   menulis nilai secret, hanya namanya ke `secretNames` di `deploy.yml`. F9 langkah (2) tidak bisa mulai
   tanpa ini; langkah (1), (3), (4), (5), (6) bisa.
2. **`chore/gerbang-ci`** — hapus atau simpan (ukurannya sudah di F1b).
3. **"ya" terakhir untuk F7** (create + delete clone berbayar) dan, kalau kau mau bukti negatif E11,
   **untuk drill pin-traffic** di F8 — itu menyentuh traffic produksi kelasnya dengan P5 yang sudah kamu izinkan.

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

### Yang tidak kubebereskan di M12 (biar tidak kelihatan lupa)

`roles/editor` pada `…@cloudservices.gserviceaccount.com` (SA milik Google, bukan kita); `roles/pubsub.publisher`
pada SA compute (pemakainya belum terukur); build image yang tidak reproducible (§7 "Catatan jujur" #5 —
digest berbeda untuk konten identik); artefak CI ≠ artefak produksi (masih benar, dan `deploy.yml` tidak
pura-pura mengesahkannya); `allUsers → roles/run.invoker` (memang publik by design).
