const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8080";

export interface Perjalanan {
    id: string;
    year: string;
    title: string;
    body: string;
    linkLabel: string;
    linkHref: string;
}

// Entri perjalanan hidup di backend Go, sama seperti yang dilakukan rewrite di
// next.config.ts. Diambil dari sumber aslinya, bukan lewat "/api/journey" milik
// frontend sendiri, supaya render server tidak melakukan request HTTP ke container-nya.
export async function daftarPerjalanan(): Promise<Perjalanan[]> {
    const res = await fetch(`${BACKEND_URL}/api/journey`, {
        headers: { Accept: "application/json" },
        next: { revalidate: 60 },
    });

    if (!res.ok) throw new Error(`Journey API error: ${res.status}`);

    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return (data as (Perjalanan & { sortOrder: number })[]).map((e) => ({
        id: e.id,
        year: e.year,
        title: e.title,
        body: e.body,
        linkLabel: e.linkLabel,
        linkHref: e.linkHref,
    }));
}
