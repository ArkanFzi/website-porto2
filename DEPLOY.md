# Jalur Deploy

**GitHub Actions adalah satu-satunya jalur deploy** ke Cloud Run untuk `portfolio-be` dan
`portfolio-fe` di project `config-agentic-ubuntu` (region `us-central1`). Ada tiga workflow, dan
masing-masing membuktikan hal yang berbeda:

| Workflow | Pemicu | Isi | Kredensial GCP |
|---|---|---|---|
| `ci.yml` (nama: **CI**) | `pull_request: [main]`, `push: [main]`, `workflow_dispatch` | `go` (gofmt/vet/build/test), `web` (lint, `tsc --noEmit`, `next build`, tripwire kontrak), `api` (Postgres 15 service container + binary Go asli, assertion isi JSON + round-trip tulis/hapus dengan JWT) | **tidak ada** — `permissions: contents: read`, tanpa `id-token` |
| `deploy.yml` (nama: **Deploy to Cloud Run**) | `push: [main]` dengan `paths-ignore`, `workflow_dispatch` | build + push by digest, deploy, alokasi traffic eksplisit, verifikasi isi respons, rollback | WIF ke `github-cd@…` (`contents: read`, `id-token: write`) |
| `watch.yml` (nama: **Watch**) | `schedule` 02:37 UTC + `workflow_dispatch` | probe konten produksi (domain publik + run.app), cek drift `main` vs deploy terakhir, tripwire kontrak, branch layu; satu baris per hari | **tidak ada** — `contents: read` + `actions: read`, tanpa `id-token`. Satu-satunya kredensialnya `GITHUB_TOKEN` bawaan run (dijadikan `GH_TOKEN` supaya `gh` di runner mau jalan), scope-nya persis dua permission itu. Lihat bagiannya di bawah |

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
contexts: ["go", "web", "api"]   strict: false   approvals: 0   dismiss_stale_reviews: true
```

Nama context-nya `go`/`web`/`api` (nama job), bukan `CI / go`; diverifikasi lewat
`GET /repos/…/commits/{sha}/check-runs` sebelum disimpan, bukan ditebak. `strict` masih `false`,
itu sebabnya `ci.yml` juga tersulut `push: main`: merge commit (`b6ad3ce`, `4629fa2`, `a74e014`,
`39eae21`) ikut diverifikasi setelah masuk, walau PR-nya di-setujui pada SHA yang lebih lama.

Bukti gerbang ini benar-benar menutup (bukan sekadar terpasang): PR #4 (`spasi/uji-gerbang`,
`9d0a3f1`) dengan sengaja rusak → `go: failure`, `web: failure`, `api: failure`,
`mergeable_state: "blocked"`, dan percobaan merge menjawab **HTTP 405 — "3 of 3 required status
checks are failing."** `main` tidak bergerak dan SHA rusak itu tidak pernah punya run `deploy.yml`.

## Gerbang deploy: apa yang dibuktikan

`deploy.yml` berjalan berurutan; setiap langkah punya bukti di log run:

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
     karena `main.go` mengabaikan error GORM di 13 titik, jadi `200 + null` adalah kegagalan nyata;
   - `GET /` → > 5 KB dan tidak mengandung `Application error` (halaman error Next.js);
   - `GET <fe>/api/health` dan `<fe>/api/certificates` → rantai rewrite fe→be hidup;
   - `GET <fe>/api/cv` → magic byte `%PDF-` (jalur Puppeteer, ~16 s cold, 774 803 byte).
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

`watch.yml` jalan setiap hari 02:37 UTC dan menulis satu baris ke ringkasan run. Ia **bukan
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
3. **Tripwire kontrak** terhadap sumber `main` hari itu, dan daftar branch yang tip-nya lebih tua
   dari 7 hari (informasi saja, tidak ada yang dihapus).

Yang **tidak** bisa dibuktikannya, dan itu pilihan, bukan kelalaian: Watch tidak punya kredensial
GCP, jadi ia tidak membaca `status.traffic`. Kalau seseorang mem-pin traffic dengan tangan
(kegagalan yang benar-benar terjadi di run #16), production bisa tetap serve revisi lama sementara
Watch hijau — soalnya commit yang di-serve memang masih punya run deploy hijau. Yang menutup celah
itu hanya `cloudrun.sh serving` di dalam `deploy.yml`. Menambah pemeriksaan itu ke workflow terjadwal
berarti memberi akses cloud ke jalur tanpa ulasan PR; itu keputusan §6, bukan sesuatu yang kusisipkan
sendiri.

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
| `env: GH_TOKEN: ${{ github.token }}` di job `watch` | token bawaan run, scope-nya persis `permissions:` workflow (`contents: read`, `actions: read`). Ini bukan kredensial cloud: tidak ada `id-token`, tidak ada WIF, dan token mati sendiri saat run selesai |
| langkah drift memisahkan `rc != 0` dari "daftar run kosong" | pesan sebelumnya ("daftar run deploy.yml kosong") menuduh pemicu deploy hilang padahal yang gagal adalah `gh api`. Sekarang: `gh api gagal (rc=…): <stderr>` vs `tidak ada satu pun run deploy.yml dengan event=push` |
| langkah *Branch layu* tidak lagi melaporkan `0 branch` saat `gh` gagal | ini false-clean yang paling berbahaya di antara ketiganya: stderr `gh` tercetak di log, tapi barisnya tetap `INFO|0 branch > 168 jam`. Sekarang daftar ref diambil lebih dulu; kalau rc != 0 atau kosong, barisnya `KUNING|daftar ref cabang tidak terbaca (rc=…)` — tetap tidak gerbang (langkah ini informasi saja), tapi tidak lagi mengaku bersih |

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

## Postur IAM (diverifikasi ulang 2026-10-04, 16:45 dan 16:52 UTC)

| Principal | Peran | Catatan |
|---|---|---|
| `github-cd@config-agentic-ubuntu.iam.gserviceaccount.com` | `run.admin`, `artifactregistry.writer`, `cloudsql.client`, `iam.serviceAccountUser`, `secretmanager.secretAccessor` (project-level) | dipakai workflow lewat Workload Identity Federation. Kunci: **hanya 1 `SYSTEM_MANAGED`** — kunci statis `USER_MANAGED` yang ada di baseline §1 TODO.md (valid sampai 2028-09-22) sudah tidak ada |
| `486641216758-compute@developer.gserviceaccount.com` | **`roles/editor` + `roles/pubsub.publisher` se-proyek** | SA runtime kedua service (`spec.template.spec.serviceAccountName` kosong → default compute SA). Ini **hutang**, bukan desain: dokumen ini pernah mengklaim SA hanya memegang `secretmanager.secretAccessor` pada 5 secret `portfolio-*`. Klaim itu salah dan tidak cocok dengan `gcloud projects get-iam-policy` |
| `allUsers` | `roles/run.invoker` pada **kedua service** | situs memang publik; binding-nya di IAM service, bukan project |
| `985349644251-compute@developer.gserviceaccount.com` | `roles/cloudbuild.builds.builder` di `cicd-personal-arkan` saja | `run.admin`/`iam.serviceAccountUser`/`vpcaccess.user`/`editor` + akses 5 secret di `config-agentic-ubuntu` sudah dicabut saat pipeline Cloud Build dimatikan |

Tiga perintah yang menghasilkan tabel di atas, supaya klaimnya bisa diulang orang lain:

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
```

`--flatten="bindings[].members"` bersama `--format='value(members)'` mencetak kolom kosong;
gcloud menyimpan anggota di field bertype (`members.serviceAccount`, `members.user`), jadi jalur
`--format=json | jq` di atas adalah satu-satunya yang memberi angka yang bisa dipercaya.

Sweep yang masih terbuka (dicatat, belum dikerjakan): ganti SA runtime default-compute dengan SA
khusus yang hanya memegang `secretmanager.secretAccessor` pada 5 secret `portfolio-*`. Selama
`roles/editor` project-level masih melekat di SA yang sama dengan `allUsers → run.invoker`, satu
kerentanan di container frontend punya jalan keluar dari batas aplikasi.

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

- **Riwayat run** (snapshot 2026-10-04 16:45 UTC): workflow lama `Build, Test and Deploy to Cloud
  Run` 15 run → 9 success, 5 failure, 1 cancelled. `CI` 12 run → 11 success, 1 failure (PR #4,
  memang sengaja rusak). `Deploy to Cloud Run` 4 run → 2 success, 1 failure (drill #18), 1 berjalan.
- **Merge dokumen tidak men-deploy** sejak `paths-ignore` terpasang; sebelumnya merge isi `.md`
  saja membangun ulang dan mengganti produksi (lihat run workflow lama pada `2501378`/`2d024ab`).
- **Skala**: `min-instances` tidak di-set (⇒ 0) dan `autoscaling.knative.dev/maxScale=3` pada kedua
  revision template, `containerConcurrency=80`, `startup-cpu-boost=true`. Hanya backend yang
  memakai connector: `run.googleapis.com/vpc-access-connector=portfolio-connector` +
  `vpc-access-egress=all-traffic` di anotasi *revision*-nya (bukan anotasi service — cek di sini
  lewat `--format=json | jq`, karena `--flatten` mencetak kolom kosong). Cold start terukur:
  `/api/certificates` 1,7 s; `/api/cv` 13,9 s cold / 5,8 s warm.
- **Artifact Registry tanpa retention policy**: 17 tag `backend`, 16 tag `frontend` (16/15 pada
  snapshot 16:45; bertambah satu per dua deploy), dan revisi lama adalah target rollback — jangan
  di-prune sebelum mekanisme retensi dipikirkan.
- **Cloud SQL `portfolio-pg`** (diverifikasi ulang 16:52 UTC): Postgres 15, tier `db-f1-micro`,
  `availabilityType=ZONAL` (tanpa HA), IP **PRIVATE** saja, backup harian **enabled** — 7 backup
  tersimpan, semuanya `SUCCESSFUL`; terbaru mulai `2026-10-04T04:50:41Z` selesai `04:52:13Z` (91 s).
  **PITR ternyata OFF**: `settings.pointInTimeRecoveryEnabled` absen di keluaran API, begitu pula
  `gcPitrRetentionSettings` dan `retainedBackups`. Baseline §1 TODO.md menulis "PITR on,
  retainedBackups 7" — keduanya tidak terbukti; "7" hanya kebetulan cocok dengan jumlah baris
  `backups list`, dan waktu `03:00Z` di baris itu adalah epoch dari *id* backup, bukan
  `endTime`-nya. Restore drill: **0×**. Konsekuensinya: tanpa PITR, hanya ada snapshot harian —
  pulih ke titik di tengah hari tidak mungkin, dan maksimum satu hari data bisa hilang.
- Kalau butuh men-deploy tanpa menunggu merge: `workflow_dispatch` di `deploy.yml` — tapi ingat ia
  memakai SHA ref yang dipilih, dan `main` tetap tidak boleh menerima push langsung.
