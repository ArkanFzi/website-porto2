const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8080";

export interface Experience {
  id: string;
  role: string;
  company: string;
  period: string;
  summary: string;
}

/** Backend mati = TIDAK ADA rekaman, bukan rekaman cadangan yang diketik tangan.
 *  Dulu kegagalan mengambil mengembalikan dua baris stub, dan karena `ChapterDuality`
 *  memberi prioritas mutlak ke jalur itu, stub inilah yang menutupi seluruh isi bab 02
 *  sekaligus mencetak label "VERIFIED EMPLOYMENT" di mesin yang Postgres-nya tidak menjawab. */
export async function daftarPengalaman(): Promise<Experience[]> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/experience`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 60 },
    });

    if (!res.ok) return [];

    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return (data as Experience[]).map((e) => ({
      id: e.id,
      role: e.role,
      company: e.company,
      period: e.period,
      // Backend yang belum ikut ter-deploy belum mengirim kolom ini; tanpa potongan itu
      // bab 02 membaca `undefined` sebagai isi, bukan sebagai "detail belum ada".
      summary: e.summary ?? "",
    }));
  } catch {
    return [];
  }
}
