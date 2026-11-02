# Base image di-pin ke versi DAN digest. `golang:alpine` + `alpine:latest` berarti image yang
# dibangun hari ini tidak dijamin sama dengan image yang dibangun bulan depan, dan tidak ada
# yang bisa membuktikan mana yang jalan di produksi. Dependabot untuk ekosistem `docker`
# sudah ditambahkan supaya pin ini tidak membusuk dalam diam.
FROM golang:1.27-alpine@sha256:f92b6ef800e499660581efdabdf25d9d817a9d124eaf900924f0504e7e27e12d AS builder

WORKDIR /app

# Download dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# `RUN go mod tidy` DIBUANG. tidy mengubah go.mod/go.sum saat image dibangun, jadi dependensi
# yang berjalan bisa beda dari yang diuji job `go` — dan perubahan itu tidak pernah lewat CI.
# Sekarang build menuntut go.sum yang sudah benar; kalau tidak cocok, `go build` yang gagal,
# bukan image yang senyap berubah isi.
RUN CGO_ENABLED=0 GOOS=linux go build -o main .

FROM alpine:3.24@sha256:be2656061b536c1883c4034790e21d0a09c5aaaf51968b89368a3c0371ea2c9a
WORKDIR /app

# Install tzdata so Postgres driver can resolve TimeZone=Asia/Jakarta
RUN apk add --no-cache tzdata

# Tanpa USER, proses berjalan sebagai root di dalam kontainer. 65534 adalah uid yang juga
# dipakai default Cloud Run, jadi ini bukan perilaku baru — hanya tidak lagi root.
COPY --from=builder /app/main .
EXPOSE 8080

USER 65534:65534

# ENTRYPOINT, bukan CMD: dengan CMD ["./main"], `docker run <image> -migrate` mengirim
# "-migrate" sebagai nama program dan kontainer mati di exec: NOT_FOUND. Cloud Run tidak
# berubah perilakunya — perintah akhirnya tetap ./main tanpa argumen.
ENTRYPOINT ["./main"]
