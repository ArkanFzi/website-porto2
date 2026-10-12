// Penanda sesi, BUKAN kredensial. Yang membuktikan siapa kamu adalah cookie HttpOnly
// `porto_sesi` di browser server — ia tidak terbaca document.cookie, jadi skrip yang masuk
// lewat XSS tidak bisa mencurinya. localStorage dulunya menyimpan token JWT utuh selama 24 jam
// dan server tidak punya revokasi apa pun, jadi curian itu tidak bisa diusir.
//
// Nilai ini tetap bisa dipalsukan skrip, dan itu disengaja: yang dipalsukan hanya tampilan
// (spinner vs redirect login). Data admin tidak ikut terbuka karena setiap request masih
// dinilai dari cookie oleh AuthMiddleware.
const PENANDA_SESI = "admin_sesi";

// Kunci lama tempat JWT utuh pernah disimpan. Admin yang masuk sebelum sesi pindah ke cookie
// HttpOnly masih membawanya, dan token itu tetap sah sampai exp — tidak ada gunanya membiarkan
// ia terbaca skrip di browser setelah tidak dipakai lagi.
const KUNCI_LAMA = "admin_token";

export const tandaiSesi = () => {
    if (typeof window !== "undefined") {
        localStorage.setItem(PENANDA_SESI, "1");
        localStorage.removeItem(KUNCI_LAMA);
    }
};

export const adaSesi = (): boolean =>
    typeof window !== "undefined" && localStorage.getItem(PENANDA_SESI) === "1";

export const bersihkanSesi = () => {
    if (typeof window !== "undefined") {
        localStorage.removeItem(PENANDA_SESI);
        localStorage.removeItem(KUNCI_LAMA);
    }
};

// Keluar harus menghapus cookie di sisi server. Menunggu fetch-nya selesai sebelum berpindah
// itu bagian dari pekerjaannya: kalau navigasi membatalkan request ini, penanda lokal sudah
// hilang sementara kredensialnya masih hidup 24 jam — "keluar" yang hanya terlihat keluar.
export const keluarSesi = async () => {
    try {
        await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
    } catch {
        // Server tidak terjangkau: penanda lokal tetap harus hilang, dan cookie kedaluwarsa
        // sendiri paling lama 24 jam.
    }
    bersihkanSesi();
};

export const authFetch = async (url: string, options: RequestInit = {}) => {
    // credentials default "same-origin": permintaan ke /api/* lewat rewrite next.config
    // memang same-origin, jadi cookie sesi ikut terkirim tanpa perlu "include".
    const response = await fetch(url, options);

    if (response.status === 401) {
        bersihkanSesi();
        if (typeof window !== "undefined") {
            window.location.href = "/admin/login";
        }
    }

    return response;
};
