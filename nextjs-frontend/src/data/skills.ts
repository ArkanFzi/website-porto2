// ─────────────────────────────────────────────────────────────────────────────
// Static skills data — edit this file to update your skills section.
// ─────────────────────────────────────────────────────────────────────────────

export interface Skill {
    id: number;
    name: string;
    category: string;
    proficiency: number;
}

export const staticSkills: Skill[] = [
    // Backend
    { id: 1, name: "C# / .NET", category: "Backend", proficiency: 85 },
    { id: 2, name: "Node.js", category: "Backend", proficiency: 75 },
    { id: 3, name: "PostgreSQL", category: "Backend", proficiency: 80 },
    { id: 4, name: "REST API Design", category: "Backend", proficiency: 85 },
    { id: 5, name: "Redis", category: "Backend", proficiency: 65 },

    // Frontend
    { id: 6, name: "Next.js", category: "Frontend", proficiency: 90 },
    { id: 7, name: "React", category: "Frontend", proficiency: 88 },
    { id: 8, name: "TypeScript", category: "Frontend", proficiency: 82 },
    { id: 9, name: "Three.js / R3F", category: "Frontend", proficiency: 70 },
    { id: 10, name: "TailwindCSS", category: "Frontend", proficiency: 90 },

    // DevOps & Tools
    { id: 11, name: "Docker", category: "DevOps", proficiency: 75 },
    { id: 12, name: "Git / GitHub", category: "DevOps", proficiency: 88 },
    { id: 13, name: "Linux", category: "DevOps", proficiency: 72 },
    { id: 14, name: "Caddy / Nginx", category: "DevOps", proficiency: 65 },
];
