// Alasan penolakan dari backend sudah berbentuk kalimat yang bisa dibaca admin ("Judul wajib diisi",
// "Gagal menyimpan sertifikat"). Membuangnya dan mengganti dengan "Failed" membuat pengguna
// memperbaiki tebakan, bukan isian yang salah.
export async function readApiError(res: Response): Promise<string | null> {
    try {
        const data = await res.json();
        if (data && typeof data.error === "string") return data.error;
        return null;
    } catch {
        return null;
    }
}
