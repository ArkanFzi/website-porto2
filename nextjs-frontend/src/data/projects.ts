// ─────────────────────────────────────────────────────────────────────────────
// Static project data — edit this file to curate your portfolio projects.
// These are merged with live GitHub repos in the Projects section.
// ─────────────────────────────────────────────────────────────────────────────

export interface StaticProject {
    id: string;
    title: string;
    description: string;
    technologies: string;
    imageUrl: string;
    projectUrl: string;
    githubUrl: string;
}

export const staticProjects: StaticProject[] = [
    {
        id: "static-1",
        title: "Website Portofolio",
        description:
            "Portfolio interaktif dengan efek 3D, Aurora Borealis background, dan animasi sinematik. Dibangun dengan Next.js 15 + Three.js.",
        technologies: "Next.js, Three.js, TypeScript, TailwindCSS",
        imageUrl: "",
        projectUrl: "",
        githubUrl: "https://github.com/ArkanFzi/website-portofolio",
    },
    {
        id: "static-2",
        title: "Lumera Shop",
        description:
            "Platform e-commerce modern dengan fitur keranjang belanja, sistem pembayaran, dan dashboard admin.",
        technologies: "TypeScript, React, Node.js",
        imageUrl: "",
        projectUrl: "",
        githubUrl: "https://github.com/ArkanFzi/Lumera-Shop",
    },
    {
        id: "static-3",
        title: "Platform Kos",
        description:
            "Sistem manajemen kos-kosan yang memudahkan pengelola dan penyewa dalam bertransaksi secara digital.",
        technologies: "TypeScript, Prisma, PostgreSQL",
        imageUrl: "",
        projectUrl: "",
        githubUrl: "https://github.com/ArkanFzi/platfrom-kos",
    },
];
