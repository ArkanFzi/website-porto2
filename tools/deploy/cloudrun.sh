#!/usr/bin/env bash
# Penyaluran traffic Cloud Run. Dipakai deploy.yml karena traffic yang pernah di-pin ke satu
# revisi bernama TIDAK ikut berpindah saat deploy berikutnya: run #16 (2026-10-04) membuat
# portfolio-be-00012-4zs yang sehat sementara 100% traffic masih di portfolio-be-00011-5z8 —
# artefak baru ter-deploy tapi tidak pernah menjawab satu request pun, dan smoke test tetap
# hijau karena yang di-probe adalah URL layanan, bukan revisi yang serve.
#
# Pemakaian:
#   cloudrun.sh allocate <service>   -> pin 100% ke latestCreatedRevisionName, cetak namanya
#   cloudrun.sh serving  <service>   -> cetak "<revisi>=<persen>" untuk setiap alokasi aktif
set -euo pipefail

action="${1:-}"
service="${2:-}"
region="${REGION:?REGION harus di-set}"

case "$action" in
  allocate)
    rev=$(gcloud run services describe "$service" --platform managed --region "$region" \
      --format='value(status.latestCreatedRevisionName)')
    if [ -z "$rev" ]; then
      echo "$service: latestCreatedRevisionName kosong" >&2
      exit 1
    fi
    gcloud run services update-traffic "$service" \
      --to-revisions="$rev=100" --platform managed --region "$region" >&2
    printf '%s\n' "$rev"
    ;;
  serving)
    gcloud run services describe "$service" --platform managed --region "$region" \
      --format='json(status.traffic)' |
      jq -r '.status.traffic[] | "\(.revisionName)=\(.percent)"'
    ;;
  *)
    echo "pemakaian: $0 {allocate|serving} <service>" >&2
    exit 2
    ;;
esac
