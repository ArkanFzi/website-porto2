# Jalur Deploy

**GitHub Actions adalah satu-satunya jalur deploy** ke Cloud Run untuk `portfolio-be` dan
`portfolio-fe` di project `config-agentic-ubuntu` (region `us-central1`). Ada tiga workflow, dan
masing-masing membuktikan hal yang berbeda:

| Workflow | Pemicu | Isi | Kredensial GCP |
|---|---|---|---|
| `ci.yml` (nama: **CI**) | `pull_request: [main]`, `push: [main]`, `workflow_dispatch` | `go` (gofmt/vet/build/test), `web` (lint, `tsc --noEmit`, `next build`, tripwire kontrak), `api` (Postgres 15 service container + binary Go asli, assertion isi JSON + round-trip tulis/hapus dengan JWT) | **tidak ada** — `permissions: contents: read`, tanpa `id-token` |
| `deploy.yml` (nama: **Deploy to Cloud Run**) | `push: [main]` dengan `paths-ignore`, `workflow_dispatch` | build + push by digest, deploy, alokasi traffic eksplisit, verifikasi isi respons, rollback | WIF ke `github-cd@…` (`contents: read`, `id-token: write`) |
| `watch.yml` (nama: **Watch**) | `schedule` 02:37 UTC + `workflow_dispatch` | probe konten produksi (domain publik + run.app), cek drift `main` vs deploy terakhir, **drift cloud (`status.traffic` + `serviceAccountName`)**, tripwire kontrak, branch layu; satu baris per hari | **satu identitas BACA saja** — WIF ke `github-watch@…` yang cuma memegang `roles/run.viewer`, ditambah `GITHUB_TOKEN` bawaan run (`contents: read`, `actions: read`) yang dipasang sebagai `GH_TOKEN` supaya `gh` di runner mau jalan. `id-token: write` ada di sini semata untuk menukar token WIF jadi token akses read-only; percobaan tulis dengan identitas itu menghasilkan **403** (terukur — lihat "Bukti kandang" di bawah). Lihat bagiannya di bawah |

Pembagian ini disengaja. `deploy.yml` dulu punya job `test` sendiri — salinan gerbang yang lebih
lemah (tanpa `tsc`, tanpa tripwire, tanpa tes DB). Salinan itulah yang membuat run #14 hijau
sementara form kontak di situs publik membuang setiap pesan visitor. Sekarang gerbang tes punya satu
definisi, dan yang diuji di jalur deploy adalah **artefak yang benar-benar melayani request**.

## Cabang `main` diproteksi

Push langsung ke `main` ditolak. Yang menutup jalurnya bukan `enforce_admins` (sudah dicoba; push
admin tetap lolos selama tidak ada restriction lain), melainkan `required_pull_request_reviews`
dengan `required_approving_review_count: 0` — PR boleh di-merge sendiri tanpa approval, tapi commit
yang tidak lewat PR ditolak. Ditambah `enforce_admins=true`, `allow_force_pushes=false`,
`allow_deletions=false`. Merge tetap menghasilkan event `push: main` sehingga workflow deploy
tersulut seperti biasa.

Required status checks (dipasang 2026-10-04, setelah `ci.yml` hidup — urutan ini penting, lihat
"jebakan" di [TODO.md](TODO.md#4-jebakan-yang-sudah-diantisipasi)):

```
contexts: ["go", "web", "api"]   strict: true   approvals: 0   dismiss_stale_reviews: true
```

Nama context-nya `go`/`web`/`api` (nama job), bukan `CI / go`; diverifikasi lewat
`GET /repos/…/commits/{sha}/check-runs` sebelum disimpan, bukan ditebak.

`strict` diubah `false → true` pada **2026-10-05 02:00 UTC** atas permintaan eksplisit. Cara
memasangnya bukan satu panggilan bersih, dan catatan ini ada supaya orang berikutnya tidak
membuang waktu di lubang yang sama: `PUT /repos/…/branches/main/protection` pada repo milik
akun personal (bukan organisasi) berada dalam jalan buntu — tanpa key `restrictions` API membalas
`"restrictions" wasn't supplied`, sedangkan `restrictions` apa pun yang berisi `users`/`teams`
membalas `Only organization repositories can have users and team restrictions`. Yang ternyata
bukan `restrictions` penyebabnya, Melainkan `dismissal_restrictions: {}` yang kutempel di dalam
`required_pull_request_reviews`; bentuk minimal di bawah diterima **HTTP 200**:

```bash
# dibaca dulu, lalu dikirim kembali dengan hanya strict yang berubah
curl -sS -H "Authorization: Bearer $TOK" -H "Accept: application/vnd.github+json" \
  "$API/repos/$R/branches/main/protection" > protection-sebelum.json
jq -c '{required_status_checks:{strict:true,contexts:.required_status_checks.contexts},
         enforce_admins:.enforce_admins.enabled,
         required_pull_request_reviews:{dismiss_stale_reviews:.required_pull_request_reviews.dismiss_stale_reviews,
           require_code_owner_reviews:.required_pull_request_reviews.require_code_owner_reviews,
           required_approving_review_count:.required_pull_request_reviews.required_approving_review_count},
         allow_force_pushes:.allow_force_pushes.enabled, allow_deletions:.allow_deletions.enabled,
         restrictions:null}' protection-sebelum.json > body.json
curl -sS -X PUT -H "Authorization: Bearer $TOK" -H "Accept: application/vnd.github+json" \
  -H "Content-Type: application/json" -d @body.json \
  "$API/repos/$R/branches/main/protection"
# verifikasi (keluaran 2026-10-05 02:00 UTC): strict=true, contexts=["go","web","api"], enforce_admins=true
curl -sS -H "Authorization: Bearer $TOK" -H "Accept: application/vnd.github+json" \
  "$API/repos/$R/branches/main/protection" | jq '{strict:.required_status_checks.strict,
       contexts:.required_status_checks.contexts, admins:.enforce_admins.enabled}'
```

`PUT /branches/main/protection/required_status_checks` (endpoint yang lebih sempit, secara teori
hanya menyentuh satu blok) **`404`** di repo ini meski `GET` pada path yang sama mengembalikan
`200` — jadi satu-satunya jalur tulis yang terbukti jalan adalah `PUT /protection` penuh.

Efek `strict: true`: PR wajib sudah di-rebase ke head `main` sebelum boleh di-merge, jadi celah
"merge disetujui pada SHA yang lebih lama" tertutup. `ci.yml` tetap tersulut `push: main` — bukan
lagi sebagai kompensasi, sekarang sebagai lapisan kedua (kalau ada push langsung yang suatu saat
lolos, gerbangnya tetap jalan).

Bukti gerbang ini benar-benar menutup (bukan sekadar terpasang): PR #4 (`spasi/uji-gerbang`,
`9d0a3f1`) dengan sengaja rusak → `go: failure`, `web: failure`, `api: failure`,
`mergeable_state: "blocked"`, dan percobaan merge menjawab **HTTP 405 — "3 of 3 required status
checks are failing."** `main` tidak bergerak dan SHA rusak itu tidak pernah punya run `deploy.yml`.

## Gerbang deploy: apa yang dibuktikan

`deploy.yml` berjalan berurutan; setiap langkah punya bukti di log run:

0. **Gerbang CI satu-SHA — langkah paling awal, sebelum apa pun menyentuh Cloud Run.** Workflow
   menunggu run `ci.yml` **pada SHA yang sama** sampai hijau (`batas_tunggu=1080s` untuk status,
   `batas_daftar=180s` untuk keberadaannya); `failure`, `cancelled`, masih berjalan, atau belum terdaftar
   semuanya `exit 1`. Alasannya spesifik dan pernah terjadi: run #14 (workflow lama) `success` sementara
   form kontak di situs publik membuang setiap pesan — gerbang ini menutup celah "deploy jalan tanpa tes".
   Bukti pemakaian pertama, `Deploy #42` pada `f863d61` (2026-10-07, dari log langkah 3):
   `03:53:46 CI masih queued (-), tunggu…` → 7× `CI masih in_progress` (jeda ±20,4 s) →
   `03:56:09 CI hijau untuk f863d61…: actions/runs/37568857560`, lalu build/push/deploy. Total run
   **6 m 29 s** (`created 03:53:38` → `updated 04:00:07`), jadi harga menunggu gerbang jauh lebih kecil
   daripada dugaan "±20 menit per merge" yang sempat kutulis di TODO.md §11. Pengukuran kedua mengunci
   angka itu: `Deploy #44` pada `f7e24ba` — `CI #127` hijau `13:34:47`, deploy selesai `13:39:11`,
   total **6 m 48 s**, kedua run dilaporkan `created_at` yang sama persis (`13:32:23`) karena keduanya
   tersulut `push: main` yang sama.
1. **Titik rollback** dibaca dari **alokasi traffic nyata** (`status.traffic`), bukan
   `latestReadyRevisionName` — nama kedua terbukti bisa tertinggal dari revisi yang melayani
   request. Workflow mengasumsikan satu alokasi 100% dan menolak kalau ada canary.
2. **Build + push** dengan tag full SHA, **tanpa `:latest`** (tag `:latest` dulu di-push tapi tidak
   pernah dipakai deploy). Digest `sha256:…` diambil dari output `docker push`.
3. **Deploy by digest**, bukan tag — tag bisa ditimpa, digest mengikat revisi ke artefak persis yang
   dibangun run itu.
4. **Alokasi traffic eksplisit** ke revisi yang baru dibuat (`tools/deploy/cloudrun.sh allocate`).
5. **Verifikasi pasca-deploy** — urutannya juga disengaja:
   - langkah 0: revisi yang serve == revisi hasil run ini, untuk **kedua** layanan;
   - `GET /api/health` → `.status=="ok" and .db=="ok"` (DB benar-benar terpasang);
   - `GET /api/certificates` / `/api/experience` → array berisi objek dengan key lengkap. Ini penting
     karena dulu `main.go` mengabaikan error GORM di 13 titik, jadi `200 + null` adalah kegagalan nyata
     yang lolos dari kode status. Sejak PR #29 angka itu **nol** — diukur `go-backend/cmd/audit-ignored`
     (13 → 6 → 0) dan dijaga langkah `Audit` + `DB mati menjawab 500…` di `ci.yml` — tapi cek bentuk isi
     di deploy **tetap dibutuhkan**, karena alat itu menjaga kode, bukan menjaga Postgres produksi:
     kegagalan DB yang muncul setelah image dibangun tetap hanya kelihatan di respons.
   - `GET /` → > 5 KB dan tidak mengandung `Application error` (halaman error Next.js);
   - `GET <fe>/api/health` dan `<fe>/api/certificates` → rantai rewrite fe→be hidup;
   - `GET <fe>/api/cv` → magic byte `%PDF-` (jalur Puppeteer). Nomor yang lewat di sini **naik-turun
     mengikuti isi CV dan versi renderer**, jadi ia dicatat per pengukuran, bukan sebagai konstanta:
     774.803 byte (2026-10-05 04:13 UTC), 783.896 byte (2026-10-06 16:10 UTC), **839.060 byte**
     (`Deploy #42` 04:00:03 UTC, dan sama persis saat dibaca ulang dari URL publik; diulang lagi pada
     `Deploy #44` 13:42 UTC — **839.060** juga, jadi angka itu stabil lintas dua revisi). Yang dijaga langkah
     ini tetap bentuknya (`%PDF-`), bukan ukurannya; rantai render→cache dijaga di `ci.yml` job `pdf`.
6. **Rollback kedua layanan** kalau verifikasi *atau* salah satu langkah build/deploy gagal:
   `gcloud run services update-traffic --to-revisions=<revisi-sebelumnya>=100`. Bukan re-deploy,
   supaya env/secret tidak perlu dituliskan ulang di jalur darurat — dulu rollback hanya ada untuk
   backend, dan 0× tereksekusi dari 15 run.
7. **Verifikasi pasca-rollback**: traffic 100% pada revisi yang diharapkan + health + certificates.
   Rollback tanpa pengecekan setelahnya bukan rollback.

`concurrency` dipasang di **job deploy** dengan `cancel-in-progress: false`. Run #13 (workflow lama)
pernah dibatalkan tepat di batas deploy dan meninggalkan revisi setengah jalan; `if: failure()` tidak
melindungi dari pembatalan, jadi perbaikannya "jangan batalkan deploy", bukan "rollback lebih pinter".

`paths-ignore: ['**.md','docs/**']` hanya ada di `deploy.yml`. Di `ci.yml` path filter justru
berbahaya: workflow yang jadi required check tidak boleh punya jalur yang tidak menghasilkan check,
kalau tidak setiap PR dokumen terkunci selamanya.

## Arah traffic Cloud Run (jebakan yang ditemukan sendiri)

Menyalakan traffic ke revisi harus **eksplisit** di workflow ini. Buktinya datang dari kesalahan
sendiri saat memvalidasi bentuk perintah rollback: `update-traffic --to-revisions=<revisi-bernama>=100`
mem-*pin* traffic, dan deploy berikutnya **tidak ikut berpindah**.

```
latestCreated: portfolio-be-00012-4zs  (Ready=True, image sha256:f0fe00d3… = artefak b6ad3ce)
traffic:       100% portfolio-be-00011-5z8  (image sha256:2e56ee26… = artefak b449a76)
```

Artefak `b6ad3ce` ter-deploy tapi tidak pernah melayani satu request pun, sementara smoke test
mengembalikan hijau — karena yang di-probe adalah **URL layanan**, dan URL itu menjawab apa pun yang
sedang di-traffic. `_LATEST` tidak bisa dipakai untuk melepas pin (API menolaknya:
`only lowercase, digits, and hyphens`), jadi setiap deploy menyebut nama revisinya sendiri lewat
`tools/deploy/cloudrun.sh`. Konsekuensinya diterima sadar: traffic selalu ter-pin ke revisi bernama,
dan itu aman justru karena setiap deploy — termasuk sesudah rollback — mengalokasikan ulang.

## Drill rollback (P5) — 2026-10-04

Rollback sudah terbukti tereksekusi di produksi, dengan kerusakan yang dibuat sengaja lewat PR #7
(`a74e014`): `/api/cv` mengembalikan **200 tanpa body PDF**. Diperbaiki lagi oleh PR #8 (`39eae21`).
Yang direkam dari run #18 (`push: main` pada `a74e014`), kesimpulan job **failure** — run deploy merah
pertama di repo ini, dan merah yang benar:

| UTC | Peristiwa |
|---|---|
| 16:28:07 | titik rollback `portfolio-be-00013-s97`, `portfolio-fe-00012-947` |
| 16:28:54 → 16:30:51 | backend digest `sha256:ec5304fa…` → `portfolio-be-00014-c6c` 100%; frontend digest `sha256:31e32c19…` → `portfolio-fe-00013-c8l` 100% |
| 16:31:22 | verifikasi: revisi yang serve == revisi run ini ✓, health `{"db":"ok","status":"ok"}` ✓, certificates 3 baris ✓, experience 2 baris ✓, `/` 40 699 byte ✓, rewrite fe→be ✓ |
| 16:31:39 | **`/api/cv tidak mengembalikan PDF`** → `Verifikasi pasca-deploy = failure` |
| 16:31:54 | `Rollback kedua service` tereksekusi, traffic kembali ke `be-00013-s97` + `fe-00012-947` |
| 16:32:00 | `Verifikasi pasca-rollback` lulus |

Jendela rusak: 16:30:51 → 16:31:54 ≈ **63 detik**, hanya pada unduhan CV; health, certificates,
experience, dan halaman utama tidak tersentuh. Diperiksa mandiri setelahnya (bukan dari log run):
`cloudrun.sh serving` → `portfolio-be-00013-s97=100` + `portfolio-fe-00012-947=100`, dan
`https://arkfazone-portofolio.elarisnoir.my.id/api/cv` → `200`, 774 803 byte, magic `%PDF-`.

Drill ini juga menunjukkan pembagian kerja dua gerbang: **CI tidak bisa melihat kegagalan ini sama
sekali** (`go`/`web`/`api`/GitGuardian semuanya hijau untuk `6b56d38`), karena CI tidak pernah
menjalankan server Next.js. Yang menangkap adalah probe pasca-deploy.

## Watch (P6) — apa yang dibuktikan, dan apa yang tidak

`watch.yml` punya cron `37 2 * * *` (02:37 UTC), tapi **run-nya baru dibuat ±6,6 jam kemudian**:
#7 `09:35:08Z`, #8 `09:23:21Z`, #9 `09:12:39Z` pada 05/06/07 Oktober — `created_at` sama dengan
`run_started_at`, dan ekspresi cron-nya identik di ketiga SHA (`git show <sha>:.github/workflows/watch.yml`).
Sudah dicatat lebih dulu di TODO.md (F10 di §8 + baris A0 di §9.0, 2026-10-06) — yang bertambah
cuma dua sampel dan pola selisih yang mengecil ±11 menit per hari (6 j 58 m → 6 j 46 m → 6 j 35 m).
Dibaca sebagai batas manfaat: probe ini tidak bisa dipakai untuk sesuatu yang harus diketahui pada
jam 03:00. Isi run-nya satu baris ringkasan per hari, dan workflow ini **bukan
gerbang**: tidak ada merge yang menunggunya, dan tidak ada satu langkah pun yang punya akses tulis.
Isinya tiga hal:

1. **Probe konten** ke tiga origin (`arkfazone-portofolio.elarisnoir.my.id`, `…be-…run.app`,
   `…fe-…run.app`) dengan assertion yang sama kerasnya dengan `deploy.yml`: `health` harus
   `{"status":"ok","db":"ok"}`, `certificates`/`experience` harus array berisi objek lengkap,
   `/` harus ≥ 5000 byte dan tidak memuat `Application error`, `/api/cv` harus diawali `%PDF-`
   dan ≥ 50000 byte. Semua vonis dikumpulkan di `/tmp/hasil.tsv` dan langkah terakhir yang
   memutuskan merah — jadi satu endpoint mati tidak memotong probe sisanya.
2. **Drift**: `git log -1 --first-parent origin/main -- . ':(exclude)*.md' ':(exclude)docs/**'`
   memberi commit terakhir yang benar-benar seharusnya ter-deploy, lalu dibandingkan dengan run
   `deploy.yml` (event `push`) terakhir yang selesai. Merah kalau run itu gagal, atau kalau SHA-nya
   bukan yang diharapkan dan tidak ada deploy yang sedang berjalan.
3. **Drift cloud** (F8, sejak 2026-10-05): membaca `status.traffic`,
   `status.latestReadyRevisionName`/`latestCreatedRevisionName` dan
   `spec.template.spec.serviceAccountName` kedua service lewat identitas **baca** `github-watch@…`.
   Vonisnya: MERAH kalau traffic bukan satu target 100% di revisi `Ready` terbaru (dibaca ulang
   +20 s dulu supaya jendela deploy tidak dituduh produksi rusak), MERAH kalau service tidak lagi
   berjalan di `portfolio-runtime@…`, KUNING kalau ada revisi yang belum `Ready` **dan** KUNING kalau
   cloud/kredensial tidak terbaca. KUNING tertulis di rangkuman, tidak pernah diam-diam hijau.
4. **Tripwire kontrak** terhadap sumber `main` hari itu, dan daftar branch yang tip-nya lebih tua
   dari 7 hari (informasi saja, tidak ada yang dihapus).

Yang masih **tidak** dibuktikan Watch, kutulis apa adanya: (a) ia tidak bisa memastikan artefak yang
ter-serve adalah build dari commit yang kamu kira — `status.traffic` cuma memberi *nama* revisi,
digestnya dibaca `deploy.yml` di dalam run-nya sendiri; (b) tidak ada `issues: write` (keputusan 4a,
hold sampai ≥ 8 baris `schedule`); (c) sisi negatifnya (pin traffic ke revisi lama → Watch harus
MERAH) baru dibuktikan terhadap `gcloud` **stubs** di laptop, belum pernah terhadap produksi nyata.

`issues: write` juga sengaja tidak dipasang. Alarmnya adalah run merah + notifikasi default GitHub.

### Run pertama di runner (2026-10-04 17:27 UTC) — merah, dan merahnya bukan produksi

`workflow_dispatch` hanya mungkin **setelah** file workflow ada di default branch (mencoba dispatch
dari branch saja mengembalikan HTTP 404), jadi bukti pertama bahwa `watch.yml` hidup di runner adalah
run manual #1 pasca-merge PR #10. Hasilnya `failure`, dan langkah gerbang mencetak `merah=1` dengan
tepat satu vonis MERAH:

```text
drift|MERAH|daftar run deploy.yml kosong: gh: To use GitHub CLI in a GitHub Actions workflow, set
the GH_TOKEN environment variable.
```

Kesalahannya milik workflow, bukan produksi: langkah gerbang melaporkan `merah=1` dan satu-satunya
vonis MERAH adalah `drift` — tidak ada probe konten yang merah. Produksi diukur hijau dari luar pada
jam yang sama (lihat tabel verifikasi di bawah). Penyebabnya: `gh` terpasang di runner
`ubuntu-latest` tapi **menolak memakai kredensial bawaannya** kalau `GH_TOKEN` belum di-set. Reheksal
lokal tidak bisa menangkap ini karena shim `gh` buatan saya memanggil `curl` dengan kredensial git dan
karena itu selalu "berhasil".
Yang menangkapnya adalah guard per-titik-gagal di langkah drift: alih-alih langkahnya abort diam-diam
dan baris harian terpotong, guard menulis vonisnya lalu `exit 0` — kegagalan tetap terlihat,
sisa probe tetap tercetak.

Perbaikannya tiga, dan ketiganya punya bukti keluaran alat:

| Perubahan | Kenapa |
|---|---|
| `env: GH_TOKEN: ${{ github.token }}` di job `watch` | token bawaan run, scope-nya persis `permissions:` workflow (`contents: read`, `actions: read`) dan mati sendiri saat run selesai. Kalimat aslinya ("bukan kredensial cloud: tidak ada `id-token`, tidak ada WIF") benar pada 2026-10-04 dan **tidak lagi benar sejak F8** (2026-10-05): `id-token: write` sekarang ada, khusus untuk identitas BACA `github-watch@…` — lihat "Bukti kandang" |
| langkah drift memisahkan `rc != 0` dari "daftar run kosong" | pesan sebelumnya ("daftar run deploy.yml kosong") menuduh pemicu deploy hilang padahal yang gagal adalah `gh api`. Sekarang: `gh api gagal (rc=…): <stderr>` vs `tidak ada satu pun run deploy.yml dengan event=push` |
| langkah *Branch layu* tidak lagi melaporkan `0 branch` saat `gh` gagal | ini false-clean yang paling berbahaya di antara ketiganya: stderr `gh` tercetak di log, tapi barisnya tetap `INFO\|0 branch > 168 jam`. Sekarang daftar ref diambil lebih dulu; kalau rc != 0 atau kosong, barisnya `KUNING\|daftar ref cabang tidak terbaca (rc=…)` — tetap tidak gerbang (langkah ini informasi saja), tapi tidak lagi mengaku bersih |

Reheksal ulang keempat jalur, dengan `gh` shim yang benar-benar berfungsi:
`drift|HIJAU|run #20 hijau untuk f5fdcf1, tidak ada deploy lain di atasnya` +
`branch-layu|INFO|1 branch layu dari 12 cabang`; `GH_TOKEN` dikosongkan → `drift|MERAH|GH_TOKEN kosong:
gh menolak jalan di runner`; `gh api` dibuat gagal → `drift|MERAH|gh api gagal (rc=1)` dan
`branch-layu|KUNING|…rc=1`; `gh` dihapus dari PATH → `drift|MERAH|gh tidak ada di runner`. Keempatnya
`exit 0` di langkahnya, jadi baris harian selalu lengkap.

Perbaikan itu merge lewat PR #11 (`6b4ad9d`, deploy run #21 `success`), lalu Watch di-dispatch ulang:
**run #2 = `success`** (run id 37221338121, dibuat 2026-10-04 17:39:24 UTC di head `6b4ad9d`).
Yang tercetak di log-nya:

```text
expected (commit kode terakhir di main): 6b4ad9d
deploy push terakhir  : run #21 @ 6b4ad9d = success
run belum selesai     : 0
branch lebih tua dari 168 jam: 1 dari 13 cabang (tidak ada yang dihapus)
merah=0
Semua probe hijau.
```

Satu kelemahan run #1 ikut dibenahi setelah itu: vonis harian hanya masuk ke *Step Summary*, dan
Step Summary tidak bisa dibaca lewat API log — jadi klaim "sisanya hijau" waktu itu harus
disimpulkan dari `merah=1`, bukan diukur. Sekarang langkah rangkuman mencetak `rows=N merah=M` plus
seluruh `/tmp/hasil.tsv` ke stdout. Terbukti di run #3 (head `14fe90e`, dibuat 17:55:04 UTC,
`success`) — tiga belas barisnya, apa adanya dari log:

```text
baris harian: rows=13 merah=0
health/domain|HIJAU|0.207307s {"db":"ok","status":"ok"}
certificates/domain|HIJAU|3 baris, 0.103333s
health/be-runapp|HIJAU|0.077960s {"db":"ok","status":"ok"}
certificates/be-runapp|HIJAU|3 baris, 0.064747s
health/fe-runapp|HIJAU|0.124148s {"db":"ok","status":"ok"}
certificates/fe-runapp|HIJAU|3 baris, 0.090758s
experience/domain|HIJAU|2 baris
halaman-utama/domain|HIJAU|40699 byte, 0.080104s
cv-pdf/domain|HIJAU|774803 byte PDF
rewrite/domain|HIJAU|/api/health terproxy ke backend
drift|HIJAU|run #22 hijau untuk 14fe90e, tidak ada deploy lain di atasnya
tripwire|HIJAU|Kontrak sesuai baseline: 13 path mati, 1 stub, tidak ada regresi.
branch-layu|INFO|1 branch layu dari 14 cabang
```

Produksi pada `6b4ad9d`, diukur dari luar tak lama setelah run #2 (bukan angka Watch, angka
`gcloud`/`curl` langsung):

| Yang diukur | Nilai |
|---|---|
| traffic `portfolio-be` / `portfolio-fe` | `portfolio-be-00017-8c8` 100% / `portfolio-fe-00016-t28` 100% |
| `/api/health` di tiga origin | `{"db":"ok","status":"ok"}` di domain publik, run.app be, run.app fe |
| `/api/certificates` / `/api/experience` | 3 baris / 2 baris, di ketiga origin |
| `GET /` | 200, 40699 byte, 0.40 s, 0 kemunculan `Application error` |
| `GET /api/cv` | 200, 774803 byte, 6.31 s, 5 byte pertama `%PDF-` |

Deploy run #22 (`14fe90e`, 17:50:12→17:54:26 UTC) memindahkan traffic ke `portfolio-be-00018-fsc` /
`portfolio-fe-00017-wqb`, masing-masing 100%. Yang menarik dari perpindahan itu bukan revisinya tapi
mekanismenya: kedua service sebelumnya di-pin ke satu named revision oleh manusia (run #16), dan
`deploy.yml` sekarang menulis `--traffic` eksplisit setiap kali, jadi tidak ada lagi keadaan "image
baru terpasang, traffic masih di revisi lama" yang lolos dari CI hijau.

Pelajaran yang sama dengan P7, sekarang untuk jalur CI: **reheksal terhadap shim bukan reheksal
terhadap runner.** Yang dites di shim adalah `curl` buatanku, bukan tool aslinya di lingkungan
aslinya — `$PATH` runner dan aturan `gh` soal kredensial. Hanya run sungguhan di runner yang
membuktikannya, dan itu sebabnya jendela observasi E8 dihitung dari run pertama di runner, bukan
dari hari penulisannya.

### F8 — drift cloud, angkanya dari runner (2026-10-05 02:43 UTC)

PR #18 (`ee52c1e`) hijau `go`/`web`/`api`, merge `3a88e25`, lalu Watch di-`workflow_dispatch` dari
`main`: **run #4 = `success`** (run id 37256510503). Pertama kalinya workflow terjadwal membaca state
cloud, jadi yang dikutip di bawah log run-nya, bukan log laptopku:

```text
02:43:37  access_token_scopes: https://www.googleapis.com/auth/cloud-platform     ← langkah auth@v3
02:43:51  portfolio-be: sa=portfolio-runtime@… traffic=portfolio-be-00021-kmb=100
02:43:52  portfolio-fe: sa=portfolio-runtime@… traffic=portfolio-fe-00020-f4n=100
02:43:55  cloud-sa/portfolio-be|HIJAU|portfolio-runtime@config-agentic-ubuntu.iam.gserviceaccount.com
02:43:55  cloud-traffic/portfolio-be|HIJAU|100% di portfolio-be-00021-kmb
02:43:55  cloud-sa/portfolio-fe|HIJAU|…
02:43:55  cloud-traffic/portfolio-fe|HIJAU|100% di portfolio-fe-00020-f4n
          baris harian: rows=17 merah=0
```

Satu kalimat yang tidak boleh dibaca salah: token aksesnya ber-scope `cloud-platform` (itu memang
bentuk token WIF), dan yang membatasinya adalah **peran IAM** — `github-watch@…` cuma
`roles/run.viewer`. Bedanya tidak diasumsikan; diukur di sub-bagian berikutnya.

Sisi negatif diukur dengan `gcloud` **stubs**: skrip langkahnya diekstrak apa adanya dari YAML
(`python3` + `yaml.safe_load`, ambil key `run`) lalu dijalankan 6× — sekali terhadap produksi nyata,
lima kali terhadap JSON yang dimutasi.

| mutasi | vonis yang muncul | gerbang run |
|---|---|---|
| traffic di `00011-5z8` padahal ready `00021-kmb` (persis skenario run #16) | `cloud-traffic` MERAH ×2 | merah |
| traffic 50/50 ke dua revisi | `cloud-traffic` MERAH ×2 | merah |
| `serviceAccountName` = `486641216758-compute@…` | `cloud-sa` MERAH ×2 (`cloud-traffic` tetap HIJAU) | merah |
| `latestCreated=00022-xxx` belum Ready | `cloud-traffic` HIJAU + `cloud-revisi` KUNING ×2 | hijau |
| `gcloud describe` rc=3, stderr kredensial ditolak | `cloud-drift` KUNING ×2, tidak ada vonis lain | hijau |

**0 false-clean** dari lima mutasi. Yang belum diukur: pin traffic sungguhan ke revisi lama di
produksi — itu menyentuh routing nyata dan masih menunggu izinmu.

### Bukti kandang — identitas baca ini ditolak saat mencoba menulis (2026-10-05 02:48 UTC)

Klaim "cuma `run.viewer`" baru berarti kalau percobaan tulis benar-benar ditolak. Dijalankan sekali di
branch buangan `chore/bukti-kandang-watch` (commit `9824e86`, **tidak digabung**): dispatch Watch →
**run #5 = `success`**.

```text
02:48:31  target no-op: portfolio-be-00022-w7f=100
02:48:33  update-traffic rc=1 :: Updating traffic...failed … ERROR: (gcloud.run.services.update-traffic)
          PERMISSION_DENIED: Permission 'run.service…'
02:48:35  secrets describe rc=1 :: ERROR: (gcloud.secrets.describe) PERMISSION_DENIED: Permission
          'secretmanager.secrets.get' denied on resource (or it may not exist)
          leash/update-traffic|HIJAU|ditolak 403 PERMISSION_DENIED sebagaimana diharapkan
          leash/secret-describe|HIJAU|ditolak 403 PERMISSION_DENIED sebagaimana diharapkan
```

Kedua percobaan dipilih supaya tetap aman **seandainya** lolos: `update-traffic` memakai revisi yang
sedang melayani traffic dengan persen 100 (no-op), dan pada secret yang dicoba hanya `describe`
(metadata) — bukan `versions access`, yang bisa mencetak `portfolio-database-url` ke log run. Tidak ada
nilai secret yang dibaca atau dicetak di mana pun, hari ini maupun sebelumnya.

Kontrol negatif, supaya 403 di atas tidak bisa berarti "metodenya memang mati": perintah
`update-traffic` yang sama, dari laptopku, dengan identitasku sendiri → **`rc=0`**. Yang membedakan
identifikasi, bukan caranya. Apa yang disentuh kontrol itu, diukur sesudahnya: `status.traffic` tetap
`portfolio-be-00022-w7f` @100, `latestCreated == latestReady`, dan tidak ada revisi baru (00022 tetap
terbaru, dibuat 02:44:25 oleh deploy #26). Yang berubah hanya `metadata.generation=35` dan
`lastModifier` = email operator — panggilanku tercatat sebagai modifikasi walaupun routingnya sama.

## Rantai alarm portfolio (diukur 2026-10-06 06:40 – 07:35 UTC)

Konfigurasi yang berdiri sekarang (terverifikasi lewat **baca ulang** `GET alertPolicies`, bukan dari gema
PATCH — salinan JSON-nya ada di `docs/evidence/`, sudah dibersihkan dari `creationRecord`/`mutationRecord`
yang memuat identitas operator):

| policy | pemicu | channel |
|---|---|---|
| `portfolio-be-down` | MQL `uptime_check/check_passed` pada `portfolio-be-uptime-3lw7E4A0E40` (tcp 443), `val() < 1`, `duration:120s` | `agentic-alerts-pubsub` **+** `watchdog-heartbeat-email` |
| `portfolio-fe-down` | MQL idem pada `portfolio-fe-uptime-1mf-3XMJoKI`, `duration:120s` | idem (2 channel) |
| `portfolio-5xx` | `conditionThreshold` pada **log metric** `logging.googleapis.com/user/portfolio-5xx`, `resource.type=cloud_run_revision`, `ALIGN_SUM` per `300s`, ambang **> 3**, `duration:300s` | idem (2 channel) |
| `Agentic Watchdog heartbeat hilang` | `conditionAbsent` pada log metric `logging.googleapis.com/user/agentic-watchdog-heartbeat` (`gce_instance`), hilang **900s** | email saja (1 channel) |
| `watchdog-vm-down` | MQL `compute/instance/uptime` == 0 pada instance `3411766485018421527`, `duration:0s` | email saja (1 channel) |

**Cara mengukur, dan bentuk query yang menipu.** Rantainya terhitung **hidup**: bucket harian 30 hari
menunjukkan **9–233 publish/hari** pada topic `agentic-alerts` dan **9–233 ack/hari** pada
`agentic-alerts-sub`, cocok 1:1; `pull_message_operation_count` (unary) cuma 0–7/hari → konsumennya
streaming pull. Angka yang sama keluar dengan `86400s`; dengan `604800s` API yang sama **membalas 0 tanpa
error**, dan dua kesimpulan salah ("antrean tidak pernah dibaca", "tidak pernah ditulis") lahir dari situ.

```bash
# bentuk yang benar untuk metrik DELTA Pub/Sub
--data-urlencode 'aggregation.alignmentPeriod=86400s' --data-urlencode 'aggregation.perSeriesAligner=ALIGN_SUM'
# JANGAN: alignmentPeriod=604800s (pekanan) -> 0 hening. Cross-check ke metrik lawan (publish vs ack)
# dan ke bucket 60s sebelum percaya sebuah nol.
```

**Yang tidak bisa dibuktikan dari API di proyek ini.** Riwayat notifikasi: seluruh jalur `monitoring/v1`
membalas 404 HTML (`notificationChannels`, `notifications`, `incidents`, `uptimeCheckConfigs`) — daftar
channel hanya bisa lewat `gcloud alpha monitoring channels`, dan `verificationStatus` email terbaca
`VERIFIED` di sana. Identitas konsumen/penerbit: operasi data-plane Pub/Sub **tidak** masuk Cloud Audit
Logs (0 baris `protoPayload.serviceName="pubsub.googleapis.com"` untuk 9 ack yang terjadi pada menit yang
sama). Satu-satunya saksi bahwa jalur email benar-benar mengirim adalah kotak masuk penerima, dan itu
dikonfirmasi manual pada 07:35 UTC.

**Rehearsal yang aman untuk diulang** (yang kupakai 06:52–07:00 UTC, sudah dibongkar lagi): buat uptime
check ke host yang tidak resolve (`tcpCheck.port=443`, `period:60s`, `STATIC_IP_CHECKERS`) + satu policy
dengan MQL identik `portfolio-be-down` tapi `duration:0s`. Tunggu baris checker OPEN (6 baris dalam 40 s),
lalu ukur `send_message_operation_count` naik sebanyak jumlah insiden dan ack mengikutinya. `DELETE` kedua
resource. Dua hal yang ditolak API dan perlu diingat: `alertStrategy.autoClose` **minimal 30 menit**
(1200s ditolak), dan `documentation.mimeType` harus `text/markdown`.

**Guard yang belum ada.** `notificationChannels` ketiga policy bisa kembali jadi 1 dan tidak ada satu pun
workflow yang merah: `github-watch@` cuma memegang `roles/run.viewer`, jadi `watch.yml` buta terhadap
Monitoring. Butuh satu binding **read-only** `roles/monitoring.viewer` untuk memasang assertion itu —
TODO.md §9.6 butir 10.

## Postur IAM (diverifikasi ulang 2026-10-04 16:45 & 16:52 UTC, 2026-10-05 01:47, 02:12, 02:56, 04:13 UTC)

| Principal | Peran | Catatan |
|---|---|---|
| `github-cd@config-agentic-ubuntu.iam.gserviceaccount.com` | `run.admin`, `artifactregistry.writer`, `cloudsql.client`, `iam.serviceAccountUser`, `secretmanager.secretAccessor` (project-level) | dipakai workflow lewat Workload Identity Federation. Kunci: **hanya 1 `SYSTEM_MANAGED`** — kunci statis `USER_MANAGED` yang ada di baseline §1 TODO.md (valid sampai 2028-09-22) sudah tidak ada |
| `portfolio-runtime@config-agentic-ubuntu.iam.gserviceaccount.com` | `artifactregistry.reader` **pada repo `portfolio-app` saja**, `logging.logWriter`, `monitoring.metricWriter` (project-level), `secretmanager.secretAccessor` **per-secret pada 5 secret** | dibuat 2026-10-05 02:10 UTC (F4) dan **SEJAK F5 dipakai**: `spec.template.spec.serviceAccountName` kedua service = SA ini, terukur lagi 02:46 UTC sesudah deploy run #26 (`3a88e25`) → `portfolio-be-00022-w7f` @100 dan `portfolio-fe-00021-hmv` @100, connector `portfolio-connector` masih terpasang di backend. `logWriter` terbukti (entri `run.googleapis.com/stdout` baru muncul setelah deploy); `metricWriter` **belum** terukur. Tidak memegang `editor`, `cloudsql.client`, `run.admin`, `iam.serviceAccountUser` (terukur: `kosong (benar)`) |
| `github-watch@config-agentic-ubuntu.iam.gserviceaccount.com` | **`roles/run.viewer` saja** (project-level) + `roles/iam.workloadIdentityUser` pada SA-nya sendiri, member `principalSet://…/github-pool/attribute.repository/ArkanFzi/website-porto2` | identitas F8 untuk `watch.yml`. Tidak ada `secretAccessor`, tidak ada write — dan itu diukur **dua arah** pada 02:48 UTC: `update-traffic` → 403, `secrets describe` → 403, perintah yang sama dengan identitas operator → `rc=0`. Granularitas binding sepanjang yang disediakan provider (`attributeMapping` tidak memetakan `sub`/`environment`) |
| `agentic-watchdog@config-agentic-ubuntu.iam.gserviceaccount.com` | `logging.logWriter`, `monitoring.metricWriter` (project); `pubsub.subscriber` pada 3 langganan; `pubsub.publisher` pada 2 topic; `storage.objectAdmin` + `objectViewer` pada `gs://config-agentic-ubuntu-backups` dan `gs://pickertime-pb-backups`; `objectViewer` pada `gs://pickertime-pb-deploys` (terakhir, 04:22:58 UTC) | dibuat 04:02:38 UTC (`CreateServiceAccount` tercatat di activity log) dan **dipasang ke `agentic-watchdog-vm`** pada 04:06:36.5 UTC; scope `cloud-platform` dipertahankan. Bukti hidup di dalam VM itu sendiri, bukan dari API-ku: heartbeat 04:07:21 (`uptimeSec=17`, `pubsubSubscriber=True`) dan 04:12:21 (`whatsappConnected=True`, `queueLength=0`) ditulis dengan token identitas baru ini. Jendela mati terukur dari audit: `instances.stop` 04:06:11.6 → `start` selesai 04:06:51.7 (≈ 40 s). Kolom grant di kiri itulah **seluruh** kuasanya — `editor` dan `iam.serviceAccountUser` tidak ada di dalamnya. `objectViewer` pada bucket deploys **bukan** bagian rencana: dia baru diminta setelah sweep ulang menemukan bahwa SA compute memegang peran itu di sana dan tidak ikut berpindah |
| `hermes-openclaw@config-agentic-ubuntu.iam.gserviceaccount.com` | sama 5 grant pubsub + `logging.logWriter` + `monitoring.metricWriter`; **hanya `storage.objectViewer`** pada `gs://pickertime-pb-deploys` dan `gs://config-agentic-ubuntu-backups` | dibuat 04:02:40 UTC, dipasang ke `hermes-openclaw-vm` 04:05:28.9 UTC, 7 scope lama utuh, mati 79 s (audit: `instances.stop` mulai 04:04:38.6, `start` selesai 04:05:58.0), `GCEGuestAgent` 04:06:27 membuktikan dia masih bisa menulis log. Write-object tidak kuberikan karena scope VM-nya (`devstorage.read_only`) memang tidak akan pernah memakainya — memberi peran yang tak terjangkau scope hanya menambah privilege mati. Konsumen langganan yang mana belum terattribusi: grant pubsub sengaja terpasang di kedua SA (hutang prune, lihat §8 F6) |
| `486641216758-compute@developer.gserviceaccount.com` | **project-level: `roles/pubsub.publisher` saja** — `roles/editor` **sudah dicabut** 04:07 UTC. Di tingkat resource dia **masih** memegang 8 binding: `secretmanager.secretAccessor` pada **6 secret**, `storage.objectAdmin` pada `gs://pickertime-pb-backups`, `storage.objectViewer` pada `gs://pickertime-pb-deploys` | E9b: pemegang `roles/editor` se-proyek tinggal **1** (`486641216758@cloudservices.gserviceaccount.com`, SA milik Google). Tidak ada lagi beban kerja yang memakai SA ini: kedua Cloud Run service di `portfolio-runtime@` (F5), kedua VM di SA khususnya (F6), `keys list` pada 6 SA = **0 `USER_MANAGED`** — tapi 5 lewat gcloud dan yang compute **hanya** lewat REST, karena `keys list` atas SA itu rc=1 `INVALID_ARGUMENT` padahal SAv-nya ter-describe; lihat blok di bawah. Ia tetap SA *default*, jadi VM baru tanpa `--service-account` akan mendapatkannya lagi — dengan `pubsub.publisher` **plus 8 binding resource-level itu**, bukan dengan `editor`. Yang tadinya membuat F6 berbahaya juga tercatat: `agentic-alerts-sub` **sebelum** F6 tidak punya binding apa pun (kini `roles/pubsub.subscriber` untuk kedua SA VM — terlihat di blok di bawah), dan `pubsub.subscriptions.consume` hari itu hanya datang dari `editor` (terukur: `editor` 12.154 permission termasuk `consume`; `pubsub.subscriber` pun memuat `consume`; `secretmanager.versions.access` di `editor` = **0**, jadi **nilai** secret memang tidak pernah terbuka lewat `editor`). Justru binding `secretAccessor` yang menempel langsung ke 6 secret itulah yang membukanya — dan itu keluar **setelah** cabut, dari sweep ulang, bukan dari dump pertama (dump itu kupotong `cut -c1-400` dan loop bucket-nya pakai `--format='value(url)'` yang tidak punya field itu → nol iterasi; lihat §8 F6). Delapan binding itu inert hari ini, tidak kupindahkan dan tidak kucabut — itu keputusan yang kutanyakan, bukan yang kuambil diam-diam. Cloud SQL tidak tercakup: `gcloud sql instances get-iam-policy` tidak ada di gcloud versi ini (`Invalid choice`) |
| `allUsers` | `roles/run.invoker` pada **kedua service** | situs memang publik; binding-nya di IAM service, bukan project |
| `985349644251-compute@developer.gserviceaccount.com` | `roles/cloudbuild.builds.builder` di `cicd-personal-arkan` saja | `run.admin`/`iam.serviceAccountUser`/`vpcaccess.user`/`editor` + akses 5 secret di `config-agentic-ubuntu` sudah dicabut saat pipeline Cloud Build dimatikan |

Tujuh perintah yang menghasilkan tabel di atas, supaya klaimnya bisa diulang orang lain:

```bash
# peran project-level per principal
gcloud projects get-iam-policy config-agentic-ubuntu --format=json \
  | jq -r '.bindings[] | .role as $r | .members[] | select(test("github-cd|486641216758-compute|allUsers")) | "\($r)\t\(.)"' | sort
# apakah situs publik (allUsers hanya boleh muncul di sini, bukan di project)
for s in portfolio-be portfolio-fe; do gcloud run services get-iam-policy $s \
  --platform managed --region us-central1 --format=json \
  | jq -r '[.bindings[] | select(.members[]? | test("allUsers")) | .role] | join(",")' ; done
# kunci SA: yang tersisa hanya SYSTEM_MANAGED
gcloud iam service-accounts keys list \
  --iam-account=github-cd@config-agentic-ubuntu.iam.gserviceaccount.com --format=json
# identitas baca Watch: peran project-level + apa yang boleh menukarnya
gcloud projects get-iam-policy config-agentic-ubuntu --format=json \
  | jq -r '.bindings[] | select(.members[]? | test("github-watch")) | "\(.role) <- \(.members|join(","))"'
gcloud iam service-accounts get-iam-policy \
  github-watch@config-agentic-ubuntu.iam.gserviceaccount.com --format=json \
  | jq -c '[.bindings[]? | {r:.role, m:.members}]'
# bahwa kedua service sudah pindah dari SA compute (F5) — keluarannya dua baris email
for s in portfolio-be portfolio-fe; do gcloud run services describe $s --platform managed \
  --region us-central1 --format='value(spec.template.spec.serviceAccountName)'; done

# F6: siapa yang memegang editor sekarang, identitas di dalam VM, dan grant resource-level
# yang jadi dasar penggantiannya. `--format=json | jq` lagi-lagi satu-satunya jalur yang bisa
# dipercaya: `--flatten bindings[].members` mencetak kolom kosong.
gcloud projects get-iam-policy config-agentic-ubuntu --format=json \
  | jq -r '.bindings[] | select(.role=="roles/editor") | .members[]'
for v in agentic-watchdog-vm hermes-openclaw-vm; do gcloud compute instances describe $v \
  --zone=us-central1-a --format='json(serviceAccounts,status)'; done | jq -c
for S in agentic-alerts-sub pickertime-pb-deploy-to-vm pickertime-pb-backups-to-gcs; do
  gcloud pubsub subscriptions get-iam-policy $S --format=json \
  | jq -r --arg s "$S" '([.bindings[]? | "\($s) \(.role) <- \(.members|join(","))"] | unique) | .[] // "\($s) KOSONG"'; done
for B in config-agentic-ubuntu-backups pickertime-pb-backups pickertime-pb-deploys; do
  gcloud storage buckets get-iam-policy "gs://$B" --format=json \
  | jq -r --arg b "$B" '([.bindings[]? | select(.members[]? | test("agentic-watchdog|hermes-openclaw|projectEditor")) | "\($b) \(.role) <- \(.members|join(","))"] | unique) | .[]'; done
# dan di secret — baris inilah yang mengubah kesimpulan fase ini, lihat catatan di bawah.
# `unique` itu wajib: `select(.members[]? | test(...))` menghasilkan satu baris per anggota yang
# cocok, jadi tanpa `unique` binding yang sama tercetak berkali-kali dan mudah terhitung salah.
for sec in $(gcloud secrets list --format='value(name)'); do
  gcloud secrets get-iam-policy $sec --project=config-agentic-ubuntu --format=json \
  | jq -r --arg s "$sec" '([.bindings[]? | select(.members[]? | test("compute@developer|agentic-watchdog|hermes-openclaw|portfolio-runtime")) | "\($s) \(.role) <- \(.members|join(","))"] | unique) | .[] // "\($s) KOSONG"'; done
# apakah masih ada kunci statis di salah satu SA (jawabannya harus SYSTEM_MANAGED semua).
# `--format='json(keys[])'` TIDAK berlaku di sini: keluarannya `[null]`, dan itu yang membuat
# bacaanku sempat kosong. Pakai `--format=json`, yang memang sudah array.
for sa in agentic-watchdog hermes-openclaw portfolio-runtime github-watch github-cd; do
  printf '%s: ' "$sa"
  gcloud iam service-accounts keys list --iam-account=$sa@config-agentic-ubuntu.iam.gserviceaccount.com \
    --format=json 2>/dev/null | jq -r '[.[].keyType] | if length==0 then "0 kunci" else join(",") end'
done
# SA compute TIDAK bisa didaftar kuncinya lewat gcloud: rc=1 `INVALID_ARGUMENT: Unknown error`,
# padahal `service-accounts describe` atas email yang sama berhasil. REST jalur lain, dan jawaban
# aslinya ada di sana — satu kunci, SYSTEM_MANAGED, 0 USER_MANAGED.
curl -s -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  "https://iam.googleapis.com/v1/projects/config-agentic-ubuntu/serviceAccounts/486641216758-compute%40developer.gserviceaccount.com/keys" \
  | jq -r '[.keys[]?.keyType] | "486641216758-compute (REST): " + (if length==0 then "0 kunci" else join(",") end)'
```

Dua hal yang **tidak** bisa dibuktikan blok di atas, dan itu harus disebut, bukan diabaikan:
`gcloud sql instances get-iam-policy` tidak ada di gcloud versi ini (`Invalid choice: 'get-iam-policy'`),
jadi Cloud SQL berada di luar enumerasi — "belum diukur", bukan "bersih". Dan dua kegagalan proyeksi yang
pernah menghasilkan kesimpulan salah di fase ini: `--format='value(url)'` pada `storage buckets list`
mengembalikan baris-baris **kosong** (field-nya tidak ada) sehingga `for B in $(...)` tidak pernah iterasi
dan setiap bucket tercetak kosong, serta `cut -c1-400` pada dump policy membuat binding yang terpotong
**hilang tanpa suara**. Keluaran kosong bukan fakta kosong — loop tanpa iterasi tidak bisa dibedakan dari
policy tanpa binding, dan itu persis cara `secretAccessor` pada 6 secret lolos dari bacaan pertamaku.

`--flatten="bindings[].members"` bersama `--format='value(members)'` mencetak kolom kosong;
gcloud menyimpan anggota di field bertype (`members.serviceAccount`, `members.user`), jadi jalur
`--format=json | jq` di atas adalah satu-satunya yang memberi angka yang bisa dipercaya.

F6 sudah tidak terbuka lagi: `roles/editor` dicabut 2026-10-05 04:07 UTC setelah kedua VM pindah ke SA
khususnya, dan pemegang `editor` se-proyek tinggal SA milik Google. Yang tersisa dari paragraf ini
hanya dua, dan keduanya keputusanmu, bukan pekerjaan yang kelewat: (1) grant pubsub terpasang di **kedua**
SA VM karena aku tidak bisa membuktikan VM mana yang menyedot `agentic-alerts-sub` (Cloudflare di depan
endpoint bot, openclaw tanpa IP eksternal dan tanpa log aplikasi, Data Access logging mati) — prune butuh
seminggu pengamatan; (2) `roles/pubsub.publisher` project-level pada SA compute, sekarang vestigial.
Satu kalimat lama di bagian ini juga kusabut penuh: "satu kerentanan di container frontend punya jalan
keluar dari batas aplikasi" sudah tidak berlaku sejak F5 untuk Cloud Run **dan** sejak F6 untuk VM —
tidak ada lagi identitas yang memegang `editor` di dalam beban kerja kita. Dan satu koreksi atas kalimat
yang sama: `editor` tidak pernah membuka **nilai** secret (`secretmanager.versions.access` = 0 di dalamnya);
yang dia buka adalah metadata dan kemampuan merusak (`secrets.delete`, `versions.destroy`).

## Pipeline Cloud Build sudah dimatikan

Trigger `porto2-build-main` (`c0b1a320-6c47-49fe-abcf-4b9fc86626e8`, Cloud Build regional
`us-central1`, terhubung ke GitHub lewat connection `arkan-github` → repo `website-porto2`,
filter push `^main$`) berstatus **disabled** — diverifikasi ulang 2026-10-04
(`{"name":"porto2-build-main","disabled":true}`). Jangan diaktifkan lagi tanpa membaca bagian
"Cara mengaktifkan kembali" di bawah.

Dua alasan:

1. **Konflik permanen dengan pipeline GHA.** Cloud Run membedakan env var literal dan mount
   Secret Manager sebagai dua tipe berbeda. Setelah GHA memasang `--set-secrets`, langkah Cloud
   Build yang memakai `--set-env-vars` ditolak:
   `Cannot update environment variable [DATABASE_URL] to string literal because it has already
   been set with a different type.`
2. **Pola secret yang lebih lama.** Langkah Cloud Build menyalin nilai secret ke memori build
   (`gcloud secrets versions access latest --secret=portfolio-database-url …`) lalu
   menyemboyongkannya ke `--set-env-vars`. GHA memakai `--set-secrets` sehingga nilai secret tidak
   pernah lewat shell build.

Keduanya menargetkan AR yang berbeda pula: Cloud Build menulis ke
`us-central1-docker.pkg.dev/cicd-personal-arkan/portfolio-app/*` dengan tag `$SHORT_SHA`, GHA ke
`us-central1-docker.pkg.dev/config-agentic-ubuntu/portfolio-app/*` dengan tag full SHA. Image yang
serve traffic berasal dari GHA.

## Cara mengaktifkan kembali (kalau terpaksa)

`gcloud builds triggers update … --disable` tidak menyediakan flag untuk trigger bertipe GitHub App
connection; gunakan PATCH REST dengan resource penuh:

```bash
TOKEN=$(gcloud auth print-access-token)
RES=projects/cicd-personal-arkan/locations/us-central1/triggers/c0b1a320-6c47-49fe-abcf-4b9fc86626e8
gcloud builds triggers describe c0b1a320-6c47-49fe-abcf-4b9fc86626e8 \
  --region=us-central1 --project=cicd-personal-arkan --format=json > /tmp/trigger.json
jq '. + {disabled: false}' /tmp/trigger.json > /tmp/trigger-on.json   # ganti true untuk mematikan
curl -sS -X PATCH -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  --data @/tmp/trigger-on.json "https://cloudbuild.googleapis.com/v1/$RES"
```

Sebelum menyalakannya: tulis ulang langkah deploy ke `--set-secrets`, dan cabut `secretAccessor`
kalau trigger tidak lagi membutuhkannya.

## Catatan operasional

- **Riwayat run** (snapshot 2026-10-07 13:45 UTC; `CI`/`Watch`/`Deploy` dibaca ulang 14:54 UTC):
  workflow lama `Build, Test and Deploy to Cloud
  Run` 15 run → 9 success, 5 failure, 1 cancelled. `CI` **129** run → **126 success, 3 failure**
  (yang ke-129 adalah `push: main` dari merge dokumen `#61`; gerbang tes memang tidak punya
  filter path). `Deploy to Cloud Run` **44** run → 37 success, 6 failure, 1 cancelled, dan 44 itu
  = 42 `push` + 2 `workflow_dispatch` (failure termasuk drill rollback #18 yang memang merusak
  produksi dengan sengaja). `Watch` 9 run → 8 success, 1 failure = 3 `schedule` + 6
  `workflow_dispatch`.
  **Cara mengukur yang benar (dan koreksi atas caraku sebelumnya):** tarik SEMUA baris lewat
  `per_page=100` + `page=N`, lalu `group_by(.conclusion)`. Angkanya menutup persis di ketiga
  workflow (126+3=129, 37+6+1=44, 8+1=9). Yang kutulis di bullet ini sebelumnya —"`?status=X` lalu
  baca `total_count`"— baru terbukti tidak stabil: `ci.yml?status=success&per_page=1` mengembalikan
  **117** satu kali, lalu **126** tiga kali berturut-turut pada selang menit yang sama. Penyebab
  selisih 9 itu tidak kujelaskan; yang jelas `total_count` tersaring bukan angka yang layak
  dipakai sendirian. Yang tetap tidak berubah: menjumlahkan `conclusion` dari SATU halaman
  `?per_page=100` memberi angka yang salah begitu totalnya > 100 (terjadi pada `CI` diukurannya
  100 vs 127 — karena itu paginasi wajib, bukan opsional).
- **Merge dokumen tidak men-deploy — sekarang terukur tiga kali, dua dari sisi berlawanan.**
  `#59` (dua file `.md`, `ad767c6`) menghasilkan **0 run** `deploy.yml`: `total_count` 43 → 43.
  Kasus kontrolnya pada jam yang sama: `#60` (isi `go-backend/mailer/*`) men-sulut `Deploy #44`,
  43 → 44. Sampel ketiga: `#61` (dua file `.md`, mendarat sebagai `10fc112`, 1 orang tua) →
  `deploy.yml` **44 → 44** dan **0 run pada SHA itu**, sementara `ci.yml` 128 → **129** dan
  `CI #129` hijau. Produksi memang tidak berubah dan itu kucek, bukan kuasumsikan: revisi live
  tetap `portfolio-be-00040-p45` / `portfolio-fe-00039-7n5`, image backend tetap
  `sha256:feb1177138…`, `/api/health` 200. Sebelumnya merge isi `.md` saja membangun ulang dan
  mengganti produksi (lihat run workflow lama pada `2501378`/`2d024ab`), karena workflow lama
  menyulut `push: main` tanpa filter.
- **Men-merge lewat REST tanpa `merge_method` = mendapat merge commit.** Default field itu adalah
  `merge` (`gh` tidak tersedia di mesin ini, jadi semua merge di sini panggilan REST). `#58` ku-merge
  tanpa field itu → `main` menyimpan `fad9aaf` dengan 2 orang tua dan pesan `Merge pull request #58 …`;
  `#59`/`#60` dengan `{"merge_method":"squash","sha":"<head>"}` → 1 orang tua. Riwayat `main` yang
  sudah terpublikasi TIDAK ditulis ulang untuk merapikan itu — force-push ke branch terproteksi,
  apalagi SHA yang sudah jadi image produksi, bukan harga yang mau dibayar untuk satu commit rapi.
  Bentuk payload yang dipakai:
  `curl -X PUT --config $CFG -d "{\"merge_method\":\"squash\",\"sha\":\"$SHA\"}" $API/pulls/$N/merge`.
- **Pemilik path API — baca ini sebelum menyebut sebuah endpoint "hilang".** URL `/api/*` yang
  sama belum tentu dilayani service yang sama:

  | path | siapa yang menjawab | sumber |
  |---|---|---|
  | `/api/cv`, `/api/github-profile`, `/api/github-repos` | **frontend** (route handler) | `nextjs-frontend/src/app/api/*/route.ts` |
  | `/api/login`, `/api/auth/*`, `/api/contact`, `/api/admin/*`, `/api/certificates*`, `/api/experience*`, `/api/health` | **backend**, lewat rewrite FE | `next.config.ts:9-17` → `main.go:371-395`, `524`, `543`, `563` |
  | `/api/projects`, `/api/admin/projects` | tidak ada di mana pun | `main.go:352` menuntutnya 404, bukan 401 |

  Konsekuensi yang sudah menipu aku sekali: `GET <backend-url>/api/cv` menjawab **404** dan itu
  perilaku yang benar. Langkah verifikasi `deploy.yml` memakai `<fe>/api/cv` karena di sanalah
  jalur render Puppeteer itu hidup.
- **Skala**: `min-instances` tidak di-set (⇒ 0) dan `autoscaling.knative.dev/maxScale=3` pada kedua
  revision template, `containerConcurrency=80`, `startup-cpu-boost=true`. Hanya backend yang
  memakai connector: `run.googleapis.com/vpc-access-connector=portfolio-connector` +
  `vpc-access-egress=all-traffic` di anotasi *revision*-nya (bukan anotasi service — cek di sini
  lewat `--format=json | jq`, karena `--flatten` mencetak kolom kosong). Cold start terukur:
  `/api/certificates` 1,7 s; `/api/cv` 13,9 s cold / 5,8 s warm. Sejak #53 angka "warm" itu bercampur
  oleh dua lapisan yang berbeda di dalam proses: singleflight + cache 60 s. Terukur 2026-10-07 dari URL
  publik: render **5,572 s**, lalu hit dalam jendela cache **2,204 s** (byte identik), dan hit yang sama
  di runner CI **12 ms** — jadi latency yang sampai pengunjung didominasi jaringan/lapisan Cloud Run,
  bukan lagi oleh Chromium. Dibaca ulang setelah `Deploy #44` (revisi baru, cache dingin): render
  **5,539 s** → hit **1,800 s**, byte tetap identik. **Koreksi penting dari log `run.googleapis.com/requests`
  (2026-10-07):** angka 16,384 s yang sempat kutulis di sini sebagai "harga replika dingin"
  **salah label**. Server-side, permintaan itu 13,104 s pada instance yang sudah hidup 31 menit;
  yang benar adalah **render pertama pada sebuah instance = 13,1–15,3 s (4 sampel) vs render
  berikutnya pada instance yang sama = 4,0–4,8 s (5 sampel)** — dua kelompok yang tidak tumpang
  tindih. Start kontainer sendiri terukur 4,689 s (`/` pertama instance baru), dan itu jarang
  terjadi: 2.509 dari 2.534 permintaan `portfolio-fe` 09:00:05–15:59:43 UTC adalah uptime checks
  (satu tiap 10,03 detik) sehingga kontainer praktis tidak pernah scale ke nol. Selisih klien−server
  juga terukur: 16,384↔13,104 s (3,28 s), 2,228↔0,034 s (2,19 s), 5,504↔3,985 s (1,52 s).
  Konsekuensinya butir **standby replika** (TODO.md **S13**) kehilangan alasannya: yang ±9 s itu ada
  di dalam kontainer yang sudah hidup (`puppeteer.launch()`/`browser.close()` per render,
  `route.ts:45-69`), dan yang menghapusnya adalah render pemanasan saat boot, bukan replika standby.
  Angka lengkap + dua hal yang belum terisolasi: TODO.md §14. Yang tidak berubah: replika baru
  memulai dengan cache kosong.
- **Artifact Registry: retensi sudah kebijakan aktif, bukan wacana.** Repo `portfolio-app`
  (`us-central1`) memegang dua policy: `keep-recent-5` (`KEEP`, `mostRecentVersions.keepCount = 5`) dan
  `delete-older-than-3d` (`DELETE`, `olderThan = 259200s`, `tagState = ANY`). `cleanupPolicyDryRun`
  sudah dicabut — sebelumnya itulah sebabnya kebijakan yang terpasang tidak pernah menghapus apa pun.
  Terukur 2026-10-07 04:15 UTC: `backend` 33 → **28** versi, `frontend` 32 → **28**; bila dihitung dari
  snapshot 2026-10-06 16:09 UTC, 22 versi lama selamat di tiap repo (= **11 terhapus di be, 10 di fe**)
  dan 6 push baru per service masuk setelahnya, semuanya di dalam jendela 3 hari sehingga dilindungi.
  Dua digest lama yang sedang dipakai produksi (`sha256:0a9528af…` be, `sha256:6d26e722…` fe) **masih ada**
  — itu yang membuat titik rollback tidak hilang; revisi live selalu versi terbaru karena deploy push
  tag full SHA dan deploy by digest. Penghapusan AR **asinkron** ("approximately one day"), jadi jumlah
  versi yang kamu baca menit ini boleh saja masih lebih banyak dari yang seharusnya.
- **Empat jebakan cara membaca AR** (semuanya keluar dari kesalahan pengukuranku sendiri, bukan teori):

  ```bash
  AR=us-central1-docker.pkg.dev/config-agentic-ubuntu/portfolio-app
  # (1) kolom tabelnya `DIGEST`, property objeknya `version`. `value(digest)` => KOSONG, selalu.
  gcloud artifacts docker images list $AR/backend --format 'value(version)'        # benar
  # (2) region/repo yang benar di atas. `europe-west2` / `arkfazone-*` => NOT_FOUND, dan `grep -c`
  #     atas stdout kosong menghasilkan "0" yang gampang salah dibaca sebagai "registry kosong".
  # (3) `Repository Size` HANYA muncul di output manusiawi `describe`; `--format json` tidak punya
  #     kunci size. Dan dua surface tidak sepakat: 04:15 UTC `describe` 12863,964 MB vs `list` 12268,032 MB.
  # (4) JEBAKAN TZ: `CREATE_TIME` di tabel itu waktu lokal (UTC+7), field `createTime` itu UTC —
  #     digest 074584ae: tabel 2026-10-05T00:51:20, JSON 2026-10-04T17:51:20Z. Filter umur untuk
  #     memeriksa jendela 72 jam wajib dibaca dari field JSON, tidak hasilnya bergeser 7 jam.
  ```

  yang masih terbuka: `Repository Size` (12.863,964 MB) kini **lebih besar** daripada penjumlahan
  `imageSizeBytes` per versi (11.275,56 MB), padahal di baseline relasinya terbalik (10.636,582 <
  11.690,79 = dedup layer). Belum terjelaskan, sengaja tidak kutulis sebabnya — TODO.md §12 butir **S5a**.
- **Cloud SQL `portfolio-pg`** (diverifikasi ulang 16:52 UTC): Postgres 15, tier `db-f1-micro`,
  `availabilityType=ZONAL` (tanpa HA), IP **PRIVATE** saja, backup harian **enabled** — 7 backup
  tersimpan, semuanya `SUCCESSFUL`; terbaru mulai `2026-10-04T04:50:41Z` selesai `04:52:13Z` (91 s).
  **PITR: AKTIF — dan kalimatku kemarin ("PITR ternyata OFF") salah.** Diperiksa ulang 2026-10-05
  01:47 UTC, `gcloud sql instances describe portfolio-pg --format=json` mengeluarkan
  `pointInTimeRecoveryEnabled=true`, `replicationLogArchivingEnabled=true`,
  `transactionLogRetentionDays=7`, `retainedBackups=7`, `backupTier=STANDARD`, jendela `03:00`.
  Sebab kesalahanku murni cara membaca, dan jebakan ini layak dicatat karena bisa menipu siapa pun:
  field-nya ada di `settings.backupConfiguration.pointInTimeRecoveryEnabled`, **tidak** bersarang
  satu level lebih dalam. Path keliru mengembalikan `null`, dan `null` itu kutafsirkan sebagai
  "mati", padahal yang mati hanya query-ku:

  ```bash
  # dua pembacaan berdampingan pada instance yang sama, 2026-10-05 01:47 UTC
  gcloud sql instances describe portfolio-pg --project=config-agentic-ubuntu --format=json \
    | jq -c '.settings.backupConfiguration.settings.pointInTimeRecoveryEnabled // "absent"'
  #   -> "absent"   (path yang kupakai kemarin: salah, dan 'absent' bukan 'off')
  gcloud sql instances describe portfolio-pg --project=config-agentic-ubuntu --format=json \
    | jq -c '.settings.backupConfiguration.pointInTimeRecoveryEnabled'
  #   -> true       (path benar)
  ```

  Jadi baseline §1 TODO.md ("PITR on, retainedBackups 7") lebih dekat ke realita daripada koreksiku
  sendiri, dan koreksiku itulah yang harus dicabut. Yang **tetap** belum terbukti: **restore drill
  0×**. PITR aktif adalah konfigurasi, bukan pemulihan; sampai satu clone-from-timestamp benar-benar
  dibuat dan diukur (fase F7 di TODO.md §8), klaim "kalau data rusak bisa dipulihkan ke titik X"
  masih narasi. Yang sudah terukur hari ini: backup harian ada, arsip log transaksi aktif, retensi
  7 hari.
- Kalau butuh men-deploy tanpa menunggu merge: `workflow_dispatch` di `deploy.yml` — tapi ingat ia
  memakai SHA ref yang dipilih, dan `main` tetap tidak boleh menerima push langsung.
