"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Award, Briefcase, Plus, Trash2, ShieldCheck, LogOut, Lock } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AdminDashboard() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<"certificates" | "experiences">("certificates");

    // Auth States
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [authLoading, setAuthLoading] = useState(true);
    const [loginForm, setLoginForm] = useState({ username: "", password: "" });
    const [loginError, setLoginError] = useState("");

    // Data States
    const [certs, setCerts] = useState<any[]>([]);
    const [exps, setExps] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Form States
    const [certForm, setCertForm] = useState({ title: "", issuer: "", date: "" });
    const [expForm, setExpForm] = useState({ role: "", company: "", period: "" });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [cRes, eRes] = await Promise.all([
                fetch(`/api/certificates`),
                fetch(`/api/experience`)
            ]);
            const cData = await cRes.json();
            const eData = await eRes.json();
            setCerts(cData || []);
            setExps(eData || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const token = localStorage.getItem("admin_token");
        if (token) {
            setIsLoggedIn(true);
            fetchData();
        }
        setAuthLoading(false);
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoginError("");
        try {
            const res = await fetch(`/api/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(loginForm)
            });

            const data = await res.json();
            if (res.ok && data.token) {
                localStorage.setItem("admin_token", data.token);
                setIsLoggedIn(true);
                fetchData();
            } else {
                setLoginError(data.error || "Login failed");
            }
        } catch (error) {
            setLoginError("Failed to connect to server");
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("admin_token");
        setIsLoggedIn(false);
    };

    const handleAddCert = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem("admin_token");
            await fetch(`/api/certificates`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(certForm)
            });
            setCertForm({ title: "", issuer: "", date: "" });
            fetchData();
        } catch (e) {
            console.error(e);
        }
    };

    const handleDeleteCert = async (id: string) => {
        if (!confirm("Are you sure you want to delete this certificate?")) return;
        try {
            const token = localStorage.getItem("admin_token");
            await fetch(`/api/certificates/${id}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${token}` }
            });
            fetchData();
        } catch (e) {
            console.error(e);
        }
    };

    const handleAddExp = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem("admin_token");
            await fetch(`/api/experience`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(expForm)
            });
            setExpForm({ role: "", company: "", period: "" });
            fetchData();
        } catch (e) {
            console.error(e);
        }
    };

    const handleDeleteExp = async (id: string) => {
        if (!confirm("Are you sure you want to delete this experience?")) return;
        try {
            const token = localStorage.getItem("admin_token");
            await fetch(`/api/experience/${id}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${token}` }
            });
            fetchData();
        } catch (e) {
            console.error(e);
        }
    };

    if (authLoading) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[#c49a56]"></div>
            </div>
        );
    }

    if (!isLoggedIn) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-6 relative overflow-hidden font-sans">
                {/* Background embellishments */}
                <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                    <div className="absolute top-[20%] left-[10%] w-[500px] h-[500px] bg-[#c49a56]/5 rounded-full blur-[120px]"></div>
                    <div className="absolute bottom-[10%] right-[10%] w-[400px] h-[400px] bg-[#2a8a6a]/5 rounded-full blur-[100px]"></div>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-md bg-[#111] border border-white/10 rounded-2xl p-8 relative z-10 shadow-2xl backdrop-blur-xl"
                >
                    <div className="text-center mb-8">
                        <ShieldCheck className="w-12 h-12 text-[#c49a56] mx-auto mb-4" />
                        <h1 className="text-2xl font-bold tracking-tight">Admin Authorization</h1>
                        <p className="text-white/50 text-sm mt-2">Enter your credentials to access the portfolio dossier controls.</p>
                    </div>

                    <form onSubmit={handleLogin} className="flex flex-col gap-5">
                        {loginError && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg text-center">
                                {loginError}
                            </div>
                        )}
                        <div>
                            <label className="text-xs font-medium text-white/50 mb-1.5 block">Username</label>
                            <input
                                required
                                type="text"
                                value={loginForm.username}
                                onChange={e => setLoginForm({ ...loginForm, username: e.target.value })}
                                className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#c49a56] transition-colors"
                                placeholder="Identifcation"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-white/50 mb-1.5 block">Password</label>
                            <input
                                required
                                type="password"
                                value={loginForm.password}
                                onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
                                className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#c49a56] transition-colors"
                                placeholder="Passcode"
                            />
                        </div>
                        <button type="submit" className="mt-4 bg-[#c49a56] text-black font-bold py-3.5 rounded-lg hover:bg-white transition-colors flex justify-center items-center gap-2">
                            <Lock className="w-4 h-4" /> Authenticate
                        </button>

                        <button type="button" onClick={() => router.push("/")} className="text-white/30 text-xs hover:text-white transition-colors mt-2">
                            ← Return to public site
                        </button>
                    </form>
                </motion.div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col md:flex-row font-sans">

            {/* Sidebar */}
            <aside className="w-full md:w-64 bg-[#111] border-r border-white/5 flex flex-col">
                <div className="p-6 border-b border-white/5 flex items-center gap-3">
                    <ShieldCheck className="w-6 h-6 text-[#2a8a6a]" />
                    <h1 className="font-bold text-lg tracking-tight">System Admin</h1>
                </div>

                <nav className="flex-1 p-4 flex flex-col gap-2">
                    <button
                        onClick={() => setActiveTab("certificates")}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${activeTab === "certificates" ? "bg-[#c49a56]/10 text-[#c49a56]" : "text-white/50 hover:bg-white/5 hover:text-white"}`}
                    >
                        <Award className="w-4 h-4" /> Certificates
                    </button>
                    <button
                        onClick={() => setActiveTab("experiences")}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${activeTab === "experiences" ? "bg-[#ff5500]/10 text-[#ff5500]" : "text-white/50 hover:bg-white/5 hover:text-white"}`}
                    >
                        <Briefcase className="w-4 h-4" /> Experience
                    </button>
                </nav>

                <div className="p-4 border-t border-white/5 gap-2 flex flex-col">
                    <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-white/50 hover:bg-white/5 hover:text-white transition-all font-medium text-sm">
                        <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                    <button onClick={() => router.push("/")} className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-white/50 hover:bg-red-500/10 hover:text-red-500 transition-all font-medium text-sm">
                        Exit Setup
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-6 md:p-12">
                <header className="mb-12">
                    <h2 className="text-3xl font-bold mb-2">
                        {activeTab === "certificates" ? "Manage Certificates" : "Manage Experience"}
                    </h2>
                    <p className="text-white/50">Add, view, or remove entries from the database.</p>
                </header>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

                    {/* Form Section */}
                    <div className="xl:col-span-1">
                        <div className="bg-[#111] border border-white/5 rounded-2xl p-6">
                            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                                <Plus className="w-5 h-5 text-white/50" /> Add New Entry
                            </h3>

                            {activeTab === "certificates" && (
                                <form onSubmit={handleAddCert} className="flex flex-col gap-4">
                                    <div>
                                        <label className="text-xs font-medium text-white/50 mb-1 block">Title</label>
                                        <input required value={certForm.title} onChange={e => setCertForm({ ...certForm, title: e.target.value })} type="text" className="w-full bg-black border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#c49a56] transition-colors" placeholder="e.g. AWS Certified" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-white/50 mb-1 block">Issuer</label>
                                        <input required value={certForm.issuer} onChange={e => setCertForm({ ...certForm, issuer: e.target.value })} type="text" className="w-full bg-black border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#c49a56] transition-colors" placeholder="e.g. Amazon Web Services" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-white/50 mb-1 block">Year/Date</label>
                                        <input required value={certForm.date} onChange={e => setCertForm({ ...certForm, date: e.target.value })} type="text" className="w-full bg-black border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#c49a56] transition-colors" placeholder="e.g. 2024" />
                                    </div>
                                    <button type="submit" className="mt-2 bg-[#c49a56] text-black font-bold py-3 rounded-lg hover:bg-white transition-colors">Save Certificate</button>
                                </form>
                            )}

                            {activeTab === "experiences" && (
                                <form onSubmit={handleAddExp} className="flex flex-col gap-4">
                                    <div>
                                        <label className="text-xs font-medium text-white/50 mb-1 block">Role</label>
                                        <input required value={expForm.role} onChange={e => setExpForm({ ...expForm, role: e.target.value })} type="text" className="w-full bg-black border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#ff5500] transition-colors" placeholder="e.g. Senior Developer" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-white/50 mb-1 block">Company</label>
                                        <input required value={expForm.company} onChange={e => setExpForm({ ...expForm, company: e.target.value })} type="text" className="w-full bg-black border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#ff5500] transition-colors" placeholder="e.g. Google" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-white/50 mb-1 block">Period</label>
                                        <input required value={expForm.period} onChange={e => setExpForm({ ...expForm, period: e.target.value })} type="text" className="w-full bg-black border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#ff5500] transition-colors" placeholder="e.g. 2021 - Present" />
                                    </div>
                                    <button type="submit" className="mt-2 bg-[#ff5500] text-white font-bold py-3 rounded-lg hover:bg-white hover:text-black transition-colors">Save Experience</button>
                                </form>
                            )}
                        </div>
                    </div>

                    {/* List Section */}
                    <div className="xl:col-span-2">
                        {loading ? (
                            <div className="flex justify-center items-center h-48">
                                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-white"></div>
                            </div>
                        ) : (
                            <div className="bg-[#111] border border-white/5 rounded-2xl overflow-hidden">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-black/50 text-white/40 uppercase font-mono text-xs border-b border-white/5">
                                        <tr>
                                            <th className="px-6 py-4 font-medium">{activeTab === "certificates" ? "Title / Issuer" : "Role / Company"}</th>
                                            <th className="px-6 py-4 font-medium hidden md:table-cell">Date / Period</th>
                                            <th className="px-6 py-4 font-medium text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {activeTab === "certificates" && certs.map((c) => (
                                            <tr key={c.id} className="hover:bg-white/5 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-white/90">{c.title}</div>
                                                    <div className="text-white/40 mt-1">{c.issuer}</div>
                                                </td>
                                                <td className="px-6 py-4 hidden md:table-cell text-white/60">
                                                    {c.date}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button onClick={() => handleDeleteCert(c.id)} className="p-2 text-white/30 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {activeTab === "experiences" && exps.map((e) => (
                                            <tr key={e.id} className="hover:bg-white/5 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-white/90">{e.role}</div>
                                                    <div className="text-white/40 mt-1">{e.company}</div>
                                                </td>
                                                <td className="px-6 py-4 hidden md:table-cell text-white/60">
                                                    {e.period}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button onClick={() => handleDeleteExp(e.id)} className="p-2 text-white/30 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                {(activeTab === "certificates" && certs.length === 0) || (activeTab === "experiences" && exps.length === 0) ? (
                                    <div className="p-12 text-center text-white/30 font-medium">No records found.</div>
                                ) : null}
                            </div>
                        )}
                    </div>

                </div>
            </main>
        </div>
    );
}
