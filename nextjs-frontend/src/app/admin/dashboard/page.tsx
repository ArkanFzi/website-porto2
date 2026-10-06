"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/lib/auth";
import { readApiError } from "@/lib/apiError";
import { Mail, Trash2, Calendar } from "lucide-react";

interface ContactMsg {
    id: string;
    name: string;
    email: string;
    subject: string;
    body: string;
    createdAt: string;
    updatedAt: string;
}

export default function DashboardPage() {
    const [messages, setMessages] = useState<ContactMsg[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [deleteError, setDeleteError] = useState("");
    const [hidden, setHidden] = useState(0);

    const fetchMessages = async () => {
        try {
            setLoading(true);
            setError("");
            const res = await authFetch("/api/admin/contact");
            const data = await res.json().catch(() => null);
            if (!res.ok || !Array.isArray(data)) {
                setError(typeof data?.error === "string" ? data.error : "Failed to load messages");
                return;
            }
            setMessages(data);
            // Inbox memotong pada 500 baris terbaru. Tanpa menyebut sisanya, admin yang punya
            // 603 pesan mengira 500 teratas adalah seluruh kotak masuk.
            const total = Number(res.headers.get("X-Total-Count"));
            const returned = Number(res.headers.get("X-Returned-Count"));
            setHidden(Number.isFinite(total) && Number.isFinite(returned) && total > returned ? total - returned : 0);
        } catch (err) {
            console.error(err);
            setError("Failed to load messages");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMessages();
    }, []);

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this message?")) return;
        try {
            const res = await authFetch(`/api/admin/contact/${id}`, { method: "DELETE" });
            if (!res.ok) {
                // 400/404/500 selama ini hilang tanpa jejak: pesan masih terlihat di layar
                // padahal sudah tidak ada (atau belum terhapus) di database.
                setDeleteError((await readApiError(res)) ?? "Pesan tidak terhapus.");
                return;
            }
            setDeleteError("");
            // muat ulang, bukan buang dari array lokal: total & sisa yang terpotong ikut
            // menyesuaikan, kalau tidak banner pemotongan langsung salah setelah satu hapus.
            await fetchMessages();
        } catch (err) {
            console.error(err);
            setDeleteError("Pesan tidak terhapus: server tidak terjangkau.");
        }
    };

    if (loading) {
        return <div className="text-gray-400">Loading inbox...</div>;
    }

    return (
        <div className="space-y-6 max-w-5xl">
            <div className="flex items-center gap-3 border-b border-red-900/30 pb-4">
                <Mail className="text-accent-primary" size={28} />
                <h1 className="text-3xl font-bold text-white">Inbox</h1>
            </div>

            {deleteError && (
                <div className="text-red-400 p-4 bg-red-900/10 rounded-xl border border-red-900/30">{deleteError}</div>
            )}

            {hidden > 0 && !error && (
                <div className="text-sm p-3 rounded-xl bg-amber-900/10 border border-amber-900/30 text-amber-200">
                    Menampilkan {messages.length} pesan terbaru; {hidden} pesan lebih lama tidak dikirim server.
                </div>
            )}

            {error ? (
                <div className="text-red-400 p-4 bg-red-900/10 rounded-xl">{error}</div>
            ) : messages.length === 0 ? (
                <div className="text-gray-500 py-10 text-center">No messages yet.</div>
            ) : (
                <div className="grid gap-4">
                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className="bg-[#0f0505] border border-red-900/20 rounded-xl p-6 hover:border-accent-primary/50 transition-colors"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-200">{msg.name}</h3>
                                    <a href={`mailto:${msg.email}`} className="text-accent-primary text-sm hover:underline">
                                        {msg.email}
                                    </a>
                                </div>
                                <div className="flex items-center gap-4 text-xs text-gray-500">
                                    <span className="flex items-center gap-1">
                                        <Calendar size={14} />
                                        {new Date(msg.createdAt).toLocaleString()}
                                    </span>
                                    <button
                                        onClick={() => handleDelete(msg.id)}
                                        className="text-red-900 hover:text-red-500 transition-colors"
                                        title="Delete Message"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                            <p className="text-gray-300 whitespace-pre-wrap text-sm leading-relaxed bg-[#050000] p-4 rounded-lg border border-red-900/10">
                                {msg.body}
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
