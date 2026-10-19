# Base image di-pin ke versi DAN digest supaya image yang dibangun CI identik dengan yang
# dibangun deploy. Yang TIDAK bisa dipin di sini adalah `apk add chromium` di stage runner:
# repositori Alpine menghapus versi lama, jadi pin versi paket akan merusak build beberapa
# minggu kemudian. Chromium datang dari repositori pada tanggal build — batas yang perlu
# diketahui, bukan detail yang tersembunyi. Dependabot ekosistem `docker` menutup pin base.
FROM node:26-alpine@sha256:6f08a523443ddedf52941874c203475b0ad503e859ad70cb26ab8be9a517dbd5 AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG BACKEND_URL
ENV BACKEND_URL=${BACKEND_URL:-http://localhost:8080}
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Install Chromium & fonts for Puppeteer PDF generation
#
# Percobaan ulang ada karena satu kegagalan build yang nyata: `apk add` keluar dengan
# galat `so:libzstd.so.1 (no such package)` padahal paket itu ada di repositori. Yang
# rusak bukan paketnya tapi indeks cermin Alpine yang kebagian permintaan saat sedang
# disinkronkan. `--no-cache` membuat tiap percobaan mengambil indeks dari awal, jadi
# satu percobaan ulang biasanya sudah lewat.
#
# Batasnya tiga percobaan, bukan loop tak berhingga: kegagalan yang bertahan berarti
# indeksnya memang buruk atau paketnya benar-benar hilang, dan build harus tetap merah
# supaya itu terlihat, bukan disembunyikan.
RUN set -eu; \
    gagal=0; \
    until apk add --no-cache \
        chromium \
        nss \
        freetype \
        harfbuzz \
        ca-certificates \
        ttf-freefont; do \
      gagal=$((gagal + 1)); \
      if [ "$gagal" -ge 3 ]; then \
        echo "apk add gagal pada $gagal percobaan; hentikan, ini bukan kejadian indeks sesaat"; \
        exit 1; \
      fi; \
      echo "apk add percobaan $((gagal + 1)) gagal — ambil indeks baru lalu coba lagi"; \
      sleep $((gagal * 5)); \
    done

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
RUN mkdir .next
RUN chown nextjs:nodejs .next

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
