const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8080";

export interface Experience {
  id: string;
  role: string;
  company: string;
  period: string;
}

export const FALLBACK_EXPERIENCES: Experience[] = [
  {
    id: "exp-01",
    role: "Systems Architect & Fullstack Engineer",
    company: "Freelance & Independent Client Solutions",
    period: "2023 — Present",
  },
  {
    id: "exp-02",
    role: "Industrial Class Software Engineer",
    company: "Sekawan Media Teaching Factory (TEFA)",
    period: "2024 — 2025",
  },
];

export async function daftarPengalaman(): Promise<Experience[]> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/experience`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      return FALLBACK_EXPERIENCES;
    }

    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) {
      return FALLBACK_EXPERIENCES;
    }

    return (data as Experience[]).map((e) => ({
      id: e.id,
      role: e.role,
      company: e.company,
      period: e.period,
    }));
  } catch {
    return FALLBACK_EXPERIENCES;
  }
}
