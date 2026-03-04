"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/lib/auth";
import { Briefcase, RefreshCw, Edit, Trash2, Github, Eye, EyeOff } from "lucide-react";

interface Project {
    id: number;
    title: string;
    description: string;
    technologies: string;
    imageUrl: string;
    projectUrl: string;
    githubUrl: string;
    githubRepoId: number | null;
    starsCount: number;
    forksCount: number;
    isVisible: boolean;
}

export default function ProjectsPage() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);

    // Form State
    const [editingId, setEditingId] = useState<number | null>(null);
    const [formData, setFormData] = useState<Partial<Project>>({
        title: "", description: "", technologies: "", imageUrl: "", projectUrl: "", githubUrl: "", isVisible: true
    });

    const fetchProjects = async () => {
        try {
            setLoading(true);
            const res = await authFetch("/api/admin/projects");
            if (res.ok) setProjects(await res.json());
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProjects();
    }, []);

    const handleSync = async () => {
        try {
            setSyncing(true);
            const res = await authFetch("/api/admin/sync-github", { method: "POST" });
            if (res.ok) {
                alert("GitHub Synchronization Complete!");
                await fetchProjects();
            } else {
                alert("Failed to sync with GitHub");
            }
        } finally {
            setSyncing(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Delete this project completely?")) return;
        const res = await authFetch(`/api/admin/projects/${id}`, { method: "DELETE" });
        if (res.ok) fetchProjects();
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (editingId) {
            await authFetch(`/api/admin/projects/${editingId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });
        } else {
            await authFetch("/api/admin/projects", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });
        }
        setEditingId(null);
        setFormData({ title: "", description: "", technologies: "", imageUrl: "", projectUrl: "", githubUrl: "", isVisible: true });
        fetchProjects();
    };

    const editProject = (p: Project) => {
        setEditingId(p.id);
        setFormData(p);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="space-y-8 max-w-6xl">
            <div className="flex items-center justify-between border-b border-red-900/30 pb-4">
                <div className="flex items-center gap-3">
                    <Briefcase className="text-accent-primary" size={28} />
                    <h1 className="text-3xl font-bold text-white">Manage Projects</h1>
                </div>
                <button
                    onClick={handleSync}
                    disabled={syncing}
                    className="flex items-center gap-2 bg-[#050000] border border-accent-primary/50 text-accent-primary hover:bg-accent-primary/10 px-4 py-2 rounded-lg transition-colors font-medium text-sm disabled:opacity-50"
                >
                    <RefreshCw size={16} className={syncing ? "animate-spin" : ""} />
                    {syncing ? "Syncing API..." : "Force GitHub Sync"}
                </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSave} className="bg-[#0a0000] border border-red-900/30 p-6 rounded-xl space-y-4">
                <h2 className="text-xl font-bold text-white mb-4">
                    {editingId ? "Edit Project" : "Add New Project"}
                </h2>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Title</label>
                        <input required type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="w-full bg-black border border-red-900/30 rounded px-3 py-2 text-sm text-white focus:outline-accent-primary" />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Technologies (Comma separated)</label>
                        <input required type="text" value={formData.technologies} onChange={e => setFormData({ ...formData, technologies: e.target.value })} className="w-full bg-black border border-red-900/30 rounded px-3 py-2 text-sm text-white focus:outline-accent-primary" />
                    </div>
                    <div className="col-span-2">
                        <label className="block text-xs text-gray-400 mb-1">Description</label>
                        <textarea required rows={3} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full bg-black border border-red-900/30 rounded px-3 py-2 text-sm text-white focus:outline-accent-primary" />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Image URL</label>
                        <input type="text" value={formData.imageUrl} onChange={e => setFormData({ ...formData, imageUrl: e.target.value })} className="w-full bg-black border border-red-900/30 rounded px-3 py-2 text-sm text-white focus:outline-accent-primary" />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Live Project Route</label>
                        <input type="text" value={formData.projectUrl} onChange={e => setFormData({ ...formData, projectUrl: e.target.value })} className="w-full bg-black border border-red-900/30 rounded px-3 py-2 text-sm text-white focus:outline-accent-primary" />
                    </div>
                    <div className="col-span-2 relative">
                        <label className="block text-xs text-gray-400 mb-1 flex items-center gap-2"><Github size={14} /> GitHub Repo URL (Required for Sync)</label>
                        <input type="text" value={formData.githubUrl} onChange={e => setFormData({ ...formData, githubUrl: e.target.value })} placeholder="https://github.com/ArkanFzi/repo" className="w-full bg-black border border-red-900/30 rounded px-3 py-2 text-sm text-white focus:outline-accent-primary" />
                    </div>
                    <div className="col-span-2 flex items-center gap-2 mt-2">
                        <input type="checkbox" id="visible" checked={formData.isVisible} onChange={e => setFormData({ ...formData, isVisible: e.target.checked })} className="accent-red-600" />
                        <label htmlFor="visible" className="text-sm text-gray-300">Visible on Public Portfolio</label>
                    </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-red-900/30">
                    <button type="submit" className="bg-accent-primary hover:bg-red-600 text-white px-6 py-2 rounded-lg text-sm font-bold transition-colors">
                        {editingId ? "Update Project" : "Create Project"}
                    </button>
                    {editingId && (
                        <button type="button" onClick={() => { setEditingId(null); setFormData({ title: "", description: "", technologies: "", imageUrl: "", projectUrl: "", githubUrl: "", isVisible: true }); }} className="bg-gray-800 hover:bg-gray-700 text-white px-6 py-2 rounded-lg text-sm transition-colors">
                            Cancel Edit
                        </button>
                    )}
                </div>
            </form>

            {/* List */}
            <div className="grid gap-4">
                {projects.map(p => (
                    <div key={p.id} className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${!p.isVisible ? "bg-black/50 border-gray-800" : "bg-[#0f0505] border-red-900/20"}`}>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <h3 className={`font-bold ${!p.isVisible ? "text-gray-500" : "text-white"}`}>{p.title}</h3>
                                {!p.isVisible ? <EyeOff size={14} className="text-gray-500" /> : <Eye size={14} className="text-accent-primary" />}
                            </div>
                            <p className="text-xs text-gray-500 mb-2">{p.technologies}</p>

                            {p.githubUrl && (
                                <div className="flex gap-3 text-xs font-mono text-gray-400">
                                    <span className="flex items-center gap-1"><Github size={12} /> Repo Linked</span>
                                    {p.githubRepoId && <span className="text-yellow-500">★ {p.starsCount}</span>}
                                    {p.githubRepoId && <span className="text-blue-400">⑂ {p.forksCount}</span>}
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-3">
                            <button onClick={() => editProject(p)} className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"><Edit size={18} /></button>
                            <button onClick={() => handleDelete(p.id)} className="p-2 hover:bg-red-500/10 rounded-lg text-red-900 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
