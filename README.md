# M. Arkan Fauzi — Portfolio

Portofolio satu halaman dengan elemen 3D, transisi scroll, dan API kecil untuk sertifikat +
pengalaman kerja. Frontend Next.js, backend Go, keduanya jalan di Cloud Run dengan Cloud SQL
(Postgres) sebagai basis datanya.

![Next.js](https://img.shields.io/badge/Next.js-black?style=for-the-badge&logo=next.js&logoColor=white)
![Go](https://img.shields.io/badge/Go-00ADD8?style=for-the-badge&logo=go&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Three.js](https://img.shields.io/badge/Three.js-black?style=for-the-badge&logo=three.js&logoColor=white)
![Framer](https://img.shields.io/badge/Framer-black?style=for-the-badge&logo=framer&logoColor=blue)

Live: <https://arkfazone-portofolio.elarisnoir.my.id>

---

## Status fitur

Ditulis apa adanya, karena sebagian situs ini belum berfungsi dan daftarnya dijaga otomatis oleh
[`tools/ci/api-baseline.json`](tools/ci/api-baseline.json). Selama sebuah jalur masih mati, CI ikut
mengetahuinya; kalau diperbaiki tanpa memperbarui baseline, CI justru merah.

**Kolom di bawah adalah hasil audit sebelum M11.** Yang sudah berubah sejak itu: form kontak menulis
ke `contact_messages` dan menjawab `201 {id}`; `/api/cv` ikut memuat daftar sertifikat;
`/admin/dashboard` membaca + menghapus kotak masuk lewat `GET`/`DELETE /api/admin/contact` ber-JWT,
dan `POST /api/auth/login` akhirnya ada; `seedData()` + `AutoMigrate` tidak lagi jalan saat start.
Yang masih mati persis seperti tertulis: lima rute `/api/admin/projects` dan empat tulis
`/api/certificates` + `/api/experience` dari `/admin/page.tsx` (fetch polos tanpa `Authorization`).

| Fitur | Status |
|---|---|
| Halaman utama, seksi About/Projects, animasi scroll, menu mobile | jalan |
| Elemen 3D (`@react-three/fiber` + `drei`), partikel, latar video | jalan |
| `GET /api/certificates`, `GET /api/experience` (di-proxy frontend ke backend) | jalan |
| `GET /api/health` — cek koneksi ke Postgres | jalan |
| `/api/cv` — PDF dari halaman `/cv-layout` lewat Puppeteer | jalan, tapi **tanpa daftar sertifikat** |
| `/api/github-repos`, `/api/github-profile` | jalan |
| Form kontak | **jalan penuh** — `Contact.tsx` mengirim ke `POST /api/contact` di Go, pesan masuk ke `contact_messages` dan dijawab `201 {id}`; stub lama `src/app/api/contact/route.ts` (menahan 1 s lalu menjawab `success: true` tanpa menulis apa pun) sudah dihapus. Notifikasi email **terbukti hidup di produksi**: POST 2026-10-06 00:51 UTC menjawab `201` dalam 28,75 ms dan 3,171 s kemudian mencetak `contact 4e8d174a-…: email terkirim ke muhammadarkanfauzi9@gmail.com`, pesannya sampai ke Gmail. Kalau kredensial hilang, #31 membuat jalurnya berhenti **sebelum** socket dibuka dan tercatat sebagai `email dilewati` — bukan disamarkan jadi kegagalan Gmail. **`Reply-To` sekarang dipasang** (#37, `29757ca`): tombol Balas membalas ke alamat pengunjung, dan nilai yang bukan alamat tidak pernah masuk header (gerbang `mail.ParseAddress` di dalam paket, dengan 6 input jahat sebagai test). Yang masih tersisa dari baris ini: `subject` dibakar di `Contact.tsx:24` sebagai `Visionary Project : <nama>` — bukan pilihan pengunjung, dan header `Reply-To` pada pesan yang benar-benar datang baru terbukti oleh satu POST produksi lagi |
| Halaman admin (`/admin`, `/admin/projects`, `/admin/dashboard`) | **sebagian hidup** — `POST /api/auth/login` sekarang ada di backend (token terbit) dan `/admin/dashboard` membaca + menghapus kotak masuk lewat `GET`/`DELETE /api/admin/contact` yang ber-JWT (401 untuk siapa pun tanpa token, terukur di produksi); yang tetap mati: lima rute `/api/admin/projects` dan empat tulis `/api/certificates` + `/api/experience` dari `/admin/page.tsx` (fetch polos tanpa `Authorization`) |
| Login admin (`POST /api/auth/login` + JWT) | **dipakai** — `/admin/login` memanggilnya; `POST /api/login` yang lama masih terdaftar dan menunjuk handler yang sama, jadi keduanya menerbitkan token yang sama |

`/api/cv` dulu kosong daftar sertifikatnya karena `src/app/cv-layout/page.tsx` memanggil
`http://localhost:8080` secara hardcoded — origin itu tidak ada di dalam container frontend.
Perbaikan produk (kontak, admin, CV, `seedData()` yang ikut jalan di produksi, `AutoMigrate` saat
container start) dijadwalkan sebagai **M11** — kontak, inbox admin, CV dan jalur start sudah mendarat
(PR #22, #24, #25, #27, #29, #31 untuk jalur email yang tidak butuh kredensial, dan #33 untuk memasang
`EMAIL_USER`/`EMAIL_PASS` sebagai secret berversi di revisi produksi). **Satu POST lewat form publik**
(2026-10-06 00:51 UTC) membuktikan SMTP menerima, lalu **#38** (`e99cf67`) membuang bentuk kredensial dari
`ci.yml` dan **#37** (`29757ca`) memasang `Reply-To`. Yang tersisa dari M11 cuma **lima dead path admin** dan
**migration berversi**; satu klausa E13 masih menunggu login-mu: hitungan `+1` di `/admin/dashboard`.
Termasuk di dalamnya: **13 error gorm yang dibuang itu sekarang nol**, diukur oleh
`go-backend/cmd/audit-ignored` (13 → 6 → 0 pada `c78cb19` / `0204b70` / `bf11c2d`) dan dikunci jadi langkah
CI yang bisa merah, bersama satu `r.Run` yang dulu keluar dengan `rc=0` walaupun portnya sudah dipakai.
Akibat yang bisa dirasakan: `GET /api/certificates`, `GET /api/experience`, kedua `POST`/`DELETE`-nya dan
inbox admin menjawab **500** kalau DB gagal — sebelum PR #29 yang sama itu menjawab `200 + null` atau
`201` dengan `id=""`. Gerbang CI/CD-nya (M10) sudah lebih dulu dibangun, lihat [TODO.md](TODO.md).

---

## Tech stack

### Frontend (`nextjs-frontend/`)

- **Next.js 16** (App Router, `output: "standalone"`), React 19, TypeScript 5
- **Tailwind CSS v4** — lewat plugin `@tailwindcss/postcss`; **tidak ada `tailwind.config.*`**,
  token tema berada di `src/app/globals.css`
- **Framer Motion 12** — transisi halaman, scroll reveal, magnetic button
- **@react-three/fiber 9 + @react-three/drei 10** — canvas 3D
- **Lucide React** — ikon
- **Puppeteer 24** — `/api/cv` merender `/cv-layout` menjadi PDF (Chromium dipasang di image-nya)
- Toast/notifikasi buatan sendiri, bukan pustaka

### Backend (`go-backend/`)

- **Go 1.25**, **Gin** (HTTP), **GORM** + `gorm.io/driver/postgres`
- **JWT** (`golang-jwt/v5`, HS256, kedaluwarsa 24 jam) untuk rute `/api/certificates` dan
  `/api/experience` yang protected
- **`gomail`** untuk SMTP — tersambung ke form kontak dan **terbukti mengirim di produksi** sejak #33
  (`EMAIL_USER` ← `portfolio-email-user`, `EMAIL_PASS` ← `portfolio-email-pass`, keduanya lewat
  `--set-secrets` di `deploy.yml`). Kalau keduanya hilang: `SendEmail` mengembalikan `ErrNotConfigured`
  **sebelum** ada socket, dan `main.go` mencatatnya sebagai `email dilewati` ber-id pesan. `From` selalu = akun yang diautentikasi
  (Gmail menolak `From` yang bukan pengirimnya); dulu nilai ini dibakar sebagai literal alamat pribadi.
  Sejak #37 ada **`Reply-To`** (`29757ca`) — `SendEmail(to, replyTo, subject, body)`,
  dan header hanya dipasang kalau `mail.ParseAddress` lolos. Klaimku sendiri soal kenapa gerbang ini ada
  sempat salah: gomail sudah menetralkan CRLF di nilai header lewat RFC 2047 (terukur: satu baris
  encoded-word, tidak pernah jadi header kedua), jadi gerbangnya soal kebersihan alamat, bukan CVE
- Rute: `POST /api/login`, `POST /api/auth/login`, `GET /api/certificates`, `GET /api/experience`,
  `GET /api/health`, `POST /api/contact` (publik) + `GET /api/admin/contact`,
  `DELETE /api/admin/contact/:id`, `POST`/`DELETE` untuk kedua koleksi (butuh Bearer token)

### Infrastruktur

- **Cloud Run** — `portfolio-be` (8080, 512 Mi) dan `portfolio-fe` (3000, 1 Gi), region `us-central1`
- **Cloud SQL** Postgres 15 (`portfolio-pg`, `db-f1-micro`, ZONAL tanpa HA, IP privat) — backup
  harian aktif, **PITR mati**; lewat VPC connector `portfolio-connector` dengan
  `--vpc-egress all-traffic`
- **Artifact Registry** `portfolio-app` (container, `us-central1`)
- **Secret Manager** — `portfolio-database-url`, `portfolio-jwt-secret`, `portfolio-admin-pass`,
  `portfolio-admin-email`, `portfolio-cors-origins`; di-mount ke Cloud Run dengan `--set-secrets`,
  tidak pernah disalin ke log build
- **GitHub Actions** — satu-satunya jalur deploy, lihat [DEPLOY.md](DEPLOY.md)

---

## Struktur repository

```text
website-porto2/
├── go-backend/             # API Go (single binary, main.go + mailer/)
├── nextjs-frontend/
│   ├── src/app/            # App Router: page.tsx, layout.tsx, globals.css
│   │   ├── admin/          # Halaman admin (status: mati — lihat tabel di atas)
│   │   ├── api/            # Route handler: contact, cv, github-profile, github-repos
│   │   ├── components/     # Seksi halaman: Hero, About, Projects, Contact, …
│   │   ├── cv-layout/      # Halaman yang dirender Puppeteer jadi PDF
│   │   └── dossier/        # Halaman kedua
│   ├── src/components/     # Tiga/ (canvas 3D), UI/ (card, button, toast), Admin/, Dossier/
│   ├── src/data/           # Konten statis
│   ├── src/lib/            # Utilitas
│   └── next.config.ts      # rewrite /api/* -> backend, dibaca BACKEND_URL
├── tools/
│   ├── ci/                 # api-contract-check.mjs + api-baseline.json (ratchet kontrak API)
│   └── deploy/             # cloudrun.sh (penyaluran traffic Cloud Run)
├── .github/workflows/
│   ├── ci.yml              # Gerbang: go, web, api — wajib hijau sebelum merge
│   ├── deploy.yml          # Build + deploy + verifikasi + rollback
│   └── watch.yml           # Pemantau harian: probe produksi, drift, tripwire (02:37 UTC)
├── DEPLOY.md               # Jalur deploy, postur IAM, mekanisme rollback
└── TODO.md                 # Milestone M10 (gerbang) & M11 (produk), hasil terukur
```

---

## Menjalankan secara lokal

Prasyarat: Node 20+, Go 1.25+, dan sebuah Postgres. Backend memakai `godotenv`, jadi `.env`
di `go-backend/` dibaca otomatis kalau ada.

### 1. Backend

```bash
cd go-backend
cat > .env <<'ENV'
DATABASE_URL=host=localhost user=postgres password=<sandi-postgres-lokal> dbname=portfolio_db port=5432 sslmode=disable TimeZone=Asia/Jakarta
JWT_SECRET=ganti-dengan-nilai-acak-32-byte
ADMIN_USER=admin
ADMIN_PASS=ganti-dengan-sandi-lokal
ADMIN_EMAIL=kamu@example.com
CORS_ORIGINS=http://localhost:3000
ENV
go run . -migrate
go run .
```

`DATABASE_URL` kosong → jatuh ke default `host=localhost … port=5433` di `main.go`.
`JWT_SECRET` dan `ADMIN_PASS` **wajib** ada; kalau kosong proses langsung `log.Fatalf`.

Skema **tidak** dibuat lagi saat container start, dan backend tidak menyisipkan data apa pun.
Sekali di awal — dan setiap kali model berubah — siapkan skema secara eksplisit:

```bash
go run . -migrate
```

Setelah itu `go run .` menolak boot kalau salah satu dari `certificates`, `experiences`,
`contact_messages` belum ada, dengan pesan yang menyebut tabel mana yang kurang. Datamu diisi lewat
`psql` atau API admin; tiga sertifikat dan dua pengalaman kerja fiktif yang dulu ikut muncul di
produksi tidak dibuat lagi.

### 2. Frontend

```bash
cd nextjs-frontend
npm install
BACKEND_URL=http://localhost:8080 npm run dev
```

`BACKEND_URL` dibakar saat build ke `rewrites()` di `next.config.ts`; default-nya
`http://localhost:8080`. Buka <http://localhost:3000>.

### 3. Cek yang sama dengan CI

```bash
cd nextjs-frontend && npm run lint && npx tsc --noEmit
node tools/ci/api-contract-check.mjs          # ratchet kontrak API (harus sesuai baseline)
cd go-backend && gofmt -l . && go vet ./...   # gofmt harus kosong
go test ./...                                 # sekarang ada isinya: paket mailer
go run ./cmd/audit-ignored .                  # rc=0: nol error gorm / r.Run yang dibuang
```

---

## Deploy

Push ke `main` **tidak diperbolehkan** — `main` hanya menerima perubahan lewat pull request yang
required check-nya (`go`, `web`, `api`) sudah hijau. Merge ke `main` menjalankan `deploy.yml`, yang
membangun image by digest, menyalakan traffic ke revisi baru secara eksplisit, lalu memverifikasi
isi respons kedua layanan; kalau verifikasi gagal, traffic kedua layanan dikembalikan ke revisi
sebelumnya. Detail, postur IAM, dan alasan Cloud Build dimatikan: [DEPLOY.md](DEPLOY.md).

Karena container tidak lagi membuat tabel saat start, perubahan model menuntut satu langkah sebelum
traffic dipindah: jalankan image yang sama dengan `-migrate` memakai `DATABASE_URL` produksi (yang
di Secret Manager, bukan yang ditulis di mana pun). Kalau langkah itu terlewat, revisi baru menolak
boot — kegagalan yang terdengar di deploy, bukan di request pengunjung.

---

## Kontak

**M. Arkan Fauzi** — Software Engineer

- [GitHub](https://github.com/ArkanFzi)
- [LinkedIn](https://www.linkedin.com/in/muhamad-arkan-fauzi-5a6799380/) — sama dengan tautan yang
  dipakai `src/app/components/Navigation.tsx:8`; `cv-layout/page.tsx:53` menulis versi teks tanpa
  angka di ujung, jadi keduanya memang tidak identik di situs ini
- Email: muhammadarkanfauzi9@gmail.com

*Built with ☕ by Arkan.*
