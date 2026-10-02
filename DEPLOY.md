# Jalur Deploy

**GitHub Actions (`.github/workflows/deploy.yml`) adalah satu-satunya jalur deploy** ke Cloud Run
untuk `portfolio-be` dan `portfolio-fe` di project `config-agentic-ubuntu` (region `us-central1`).
Keputusan ini diambil 2026-10-02 setelah audit terhadap pipeline kedua.

## Pipeline Cloud Build sudah dimatikan

Trigger `porto2-build-main` (`c0b1a320-6c47-49fe-abcf-4b9fc86626e8`, Cloud Build regional
`us-central1`, terhubung ke GitHub lewat connection `arkan-github` → repo `website-porto2`,
filter push `^main$`) berstatus **disabled**. Jangan diaktifkan lagi tanpa membaca bagian
"Cara mengaktifkan kembali" di bawah.

Dua alasan:

1. **Konflik permanen dengan pipeline GHA.** Cloud Run membedakan env var literal dan mount
   Secret Manager sebagai dua tipe berbeda. Setelah GHA memasang `--set-secrets`, langkah Cloud
   Build yang memakai `--set-env-vars` ditolak:
   `Cannot update environment variable [DATABASE_URL] to string literal because it has already
   been set with a different type.`
2. **Pola secret yang lebih lama.** Langkah Cloud Build menyalin nilai secret ke memori build
   (`gcloud secrets versions access latest --secret=portfolio-database-url ...`) lalu
   menyemboyongkannya ke `--set-env-vars`. GHA memakai `--set-secrets` sehingga nilai secret tidak
   pernah lewat shell build.

Keduanya menargetkan AR yang berbeda pula: Cloud Build menulis ke
`us-central1-docker.pkg.dev/cicd-personal-arkan/portfolio-app/*` dengan tag `$SHORT_SHA`, GHA ke
`us-central1-docker.pkg.dev/config-agentic-ubuntu/portfolio-app/*` dengan tag full SHA. Image yang
serve traffic berasal dari GHA.

## Postur IAM setelah pencabutan

| Principal | Peran |
|---|---|
| `github-cd@config-agentic-ubuntu.iam.gserviceaccount.com` | `run.admin`, `artifactregistry.writer`, `cloudsql.client`, `iam.serviceAccountUser`, `secretmanager.secretAccessor` — dipakai workflow lewat Workload Identity Federation |
| `486641216758-compute@developer.gserviceaccount.com` | `secretmanager.secretAccessor` pada 5 secret `portfolio-*` — SA runtime Cloud Run, yang membaca secret saat container start |
| `985349644251-compute@developer.gserviceaccount.com` | hanya `roles/cloudbuild.builds.builder` di `cicd-personal-arkan`. `roles/editor` serta `run.admin` / `iam.serviceAccountUser` / `vpcaccess.user` di `config-agentic-ubuntu` dan akses kelima secret sudah dicabut |

## Cara mengaktifkan kembali (kalau terpaksa)

`gcloud builds triggers update ... --disable` tidak menyediakan flag untuk trigger bertipe
GitHub App connection; gunakan PATCH REST dengan resource penuh:

```bash
TOKEN=$(gcloud auth print-access-token)
RES=projects/cicd-personal-arkan/locations/us-central1/triggers/c0b1a320-6c47-49fe-abcf-4b9fc86626e8
gcloud builds triggers describe c0b1a320-6c47-49fe-abcf-4b9fc86626e8 \
  --region=us-central1 --project=cicd-personal-arkan --format=json > /tmp/trigger.json
jq '. + {disabled: false}' /tmp/trigger.json > /tmp/trigger-on.json   # ganti true untuk mematikan
curl -sS -X PATCH -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  --data @/tmp/trigger-on.json "https://cloudbuild.googleapis.com/v1/$RES"
```

Sebelum menyalakannya: tulis ulang langkah deploy ke `--set-secrets`, dan cabut lagi
`secretAccessor` kalau trigger tidak lagi membutuhkannya.

## Catatan operasional

Push ke `main` menjalankan build + deploy production (job `test` → `job deploy`, dengan
`concurrency` `cancel-in-progress` dan rollback otomatis ke image sebelumnya kalau smoke test
backend gagal).
