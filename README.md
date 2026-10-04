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

| Fitur | Status |
|---|---|
| Halaman utama, seksi About/Projects, animasi scroll, menu mobile | jalan |
| Elemen 3D (`@react-three/fiber` + `drei`), partikel, latar video | jalan |
| `GET /api/certificates`, `GET /api/experience` (di-proxy frontend ke backend) | jalan |
| `GET /api/health` — cek koneksi ke Postgres | jalan |
| `/api/cv` — PDF dari halaman `/cv-layout` lewat Puppeteer | jalan, tapi **tanpa daftar sertifikat** |
| `/api/github-repos`, `/api/github-profile` | jalan |
| Form kontak | **stub** — `src/app/api/contact/route.ts` menahan POST, menunda 1 s lalu menjawab `success: true`; tidak ada rewrite untuk `/api/contact` di `next.config.ts`, jadi `POST /api/contact` + `mailer` di Go tidak pernah menerima trafik |
| Halaman admin (`/admin`, `/admin/projects`, `/admin/dashboard`) | **mati** — `/admin/login` memanggil `POST /api/auth/login` yang tidak ada di backend, jadi token tidak pernah terbit; `/admin/projects` + `/admin/dashboard` memanggil `/api/admin/*` dan `GET/DELETE /api/contact/:id` yang juga tidak ada; `/admin/page.tsx` menulis dengan `fetch` biasa tanpa header `Authorization` |
| Login admin (`POST /api/login` + JWT) | ada di backend, belum dipakai jalur yang hidup |

`/api/cv` kosong daftar sertifikatnya karena `src/app/cv-layout/page.tsx` memanggil
`http://localhost:8080` secara hardcoded — origin itu tidak ada di dalam container frontend.
Perbaikan produk (kontak, admin, CV, `seedData()` yang ikut jalan di produksi, `AutoMigrate` saat
container start) dijadwalkan sebagai **M11**; gerbang CI/CD-nya (M10) sudah lebih dulu dibangun,
lihat [TODO.md](TODO.md).

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
- **`gomail`** untuk SMTP — kode-nya ada, tapi belum tersambung ke form kontak dan secret SMTP
  (`EMAIL_USER`/`EMAIL_PASS`) belum terpasang di produksi
- Rute: `POST /api/login`, `GET /api/certificates`, `GET /api/experience`, `GET /api/health`
  (publik) + `POST`/`DELETE` untuk kedua koleksi (butuh Bearer token)

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
│   └── deploy.yml          # Build + deploy + verifikasi + rollback
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
go run .
```

`DATABASE_URL` kosong → jatuh ke default `host=localhost … port=5433` di `main.go`.
`JWT_SECRET` dan `ADMIN_PASS` **wajib** ada; kalau kosong proses langsung `log.Fatalf`.
Saat start, backend menjalankan `AutoMigrate` dan `seedData()` — kalau tabel kosong, tiga sertifikat
dan dua pengalaman kerja fiktif ikut dimasukkan. Perilaku itu dijadwalkan hilang di M11; untuk
sekarang, hapus barisnya langsung lewat `psql`.

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
```

---

## Deploy

Push ke `main` **tidak diperbolehkan** — `main` hanya menerima perubahan lewat pull request yang
required check-nya (`go`, `web`, `api`) sudah hijau. Merge ke `main` menjalankan `deploy.yml`, yang
membangun image by digest, menyalakan traffic ke revisi baru secara eksplisit, lalu memverifikasi
isi respons kedua layanan; kalau verifikasi gagal, traffic kedua layanan dikembalikan ke revisi
sebelumnya. Detail, postur IAM, dan alasan Cloud Build dimatikan: [DEPLOY.md](DEPLOY.md).

---

## Kontak

**M. Arkan Fauzi** — Software Engineer

- [GitHub](https://github.com/ArkanFzi)
- [LinkedIn](https://www.linkedin.com/in/muhamad-arkan-fauzi-5a6799380/) — sama dengan tautan yang
  dipakai `src/app/components/Navigation.tsx:8`; `cv-layout/page.tsx:53` menulis versi teks tanpa
  angka di ujung, jadi keduanya memang tidak identik di situs ini
- Email: muhammadarkanfauzi9@gmail.com

*Built with ☕ by Arkan.*
