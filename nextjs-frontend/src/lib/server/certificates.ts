const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8080";

export interface Certificate {
  id: string;
  title: string;
  issuer: string;
  date: string;
  verified?: boolean;
}

export const FALLBACK_CERTIFICATES: Certificate[] = [
  {
    id: "cert-01",
    title: "Semi Finalist — JHIC 2025 (Jagoan Hosting Infra Competition)",
    issuer: "Komdigi & Maspion IT / Jagoan Hosting",
    date: "Nov 2025",
    verified: true,
  },
  {
    id: "cert-02",
    title: "Industrial Class Advanced Frontend & Systems Engineering",
    issuer: "PT Sekawan Media Informatika",
    date: "2024 — 2025",
    verified: true,
  },
  {
    id: "cert-03",
    title: "Cloud & Distributed Backend Systems Specialist",
    issuer: "AWS & Dicoding Academy",
    date: "2024",
    verified: true,
  },
  {
    id: "cert-04",
    title: "Software Engineering Excellence — Teaching Factory (TEFA)",
    issuer: "SMK / Industrial Partner Program",
    date: "2024",
    verified: true,
  },
];

export async function daftarSertifikat(): Promise<Certificate[]> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/certificates`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      return FALLBACK_CERTIFICATES;
    }

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      return FALLBACK_CERTIFICATES;
    }

    return (data as Certificate[]).map((c) => ({
      id: c.id,
      title: c.title,
      issuer: c.issuer,
      date: c.date,
      verified: true,
    }));
  } catch {
    return FALLBACK_CERTIFICATES;
  }
}
