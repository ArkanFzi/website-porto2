"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/lib/auth";
import { Mail, Trash2, Calendar } from "lucide-react";

interface ContactMsg {
    id: number;
    name: string;
    email: string;
    message: string;
    submittedDate: string;
}

export default function DashboardPage() {
    const [messages, setMessages] = useState<ContactMsg[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const fetchMessages = async () => {
        try {
            setLoading(true);
            const res = await authFetch("/api/contact");
            if (!res.ok) throw new Error("Failed to load messages");
            const data = await res.json();
            setMessages(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMessages();
    }, []);

    const handleDelete = async (id: number) => {
        if (!confirm("Delete this message?")) return;
        try {
            const res = await authFetch(`/api/contact/${id}`, { method: "DELETE" });
            if (res.ok) setMessages((prev) => prev.filter((m) => m.id !== id));
        } catch (err) {
            alert("Failed to delete message");
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
                                        {new Date(msg.submittedDate).toLocaleString()}
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
                                {msg.message}
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
