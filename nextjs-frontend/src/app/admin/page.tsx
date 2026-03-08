"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Award, Briefcase, Plus, Trash2, ShieldCheck, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"certificates" | "experiences">("certificates");
  
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
            fetch("http://localhost:8080/api/certificates"),
            fetch("http://localhost:8080/api/experience")
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
    fetchData();
  }, []);

  const handleAddCert = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
        await fetch("http://localhost:8080/api/certificates", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
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
        await fetch(`http://localhost:8080/api/certificates/${id}`, { method: "DELETE" });
        fetchData();
    } catch (e) {
        console.error(e);
    }
  };

  const handleAddExp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
        await fetch("http://localhost:8080/api/experience", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
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
        await fetch(`http://localhost:8080/api/experience/${id}`, { method: "DELETE" });
        fetchData();
    } catch (e) {
        console.error(e);
    }
  };

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

        <div className="p-4 border-t border-white/5">
            <button onClick={() => router.push("/")} className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-white/50 hover:bg-red-500/10 hover:text-red-500 transition-all font-medium text-sm">
                <LogOut className="w-4 h-4" /> Exit Setup
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
                                <input required value={certForm.title} onChange={e => setCertForm({...certForm, title: e.target.value})} type="text" className="w-full bg-black border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#c49a56] transition-colors" placeholder="e.g. AWS Certified" />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-white/50 mb-1 block">Issuer</label>
                                <input required value={certForm.issuer} onChange={e => setCertForm({...certForm, issuer: e.target.value})} type="text" className="w-full bg-black border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#c49a56] transition-colors" placeholder="e.g. Amazon Web Services" />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-white/50 mb-1 block">Year/Date</label>
                                <input required value={certForm.date} onChange={e => setCertForm({...certForm, date: e.target.value})} type="text" className="w-full bg-black border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#c49a56] transition-colors" placeholder="e.g. 2024" />
                            </div>
                            <button type="submit" className="mt-2 bg-[#c49a56] text-black font-bold py-3 rounded-lg hover:bg-white transition-colors">Save Certificate</button>
                        </form>
                    )}

                    {activeTab === "experiences" && (
                        <form onSubmit={handleAddExp} className="flex flex-col gap-4">
                            <div>
                                <label className="text-xs font-medium text-white/50 mb-1 block">Role</label>
                                <input required value={expForm.role} onChange={e => setExpForm({...expForm, role: e.target.value})} type="text" className="w-full bg-black border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#ff5500] transition-colors" placeholder="e.g. Senior Developer" />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-white/50 mb-1 block">Company</label>
                                <input required value={expForm.company} onChange={e => setExpForm({...expForm, company: e.target.value})} type="text" className="w-full bg-black border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#ff5500] transition-colors" placeholder="e.g. Google" />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-white/50 mb-1 block">Period</label>
                                <input required value={expForm.period} onChange={e => setExpForm({...expForm, period: e.target.value})} type="text" className="w-full bg-black border border-white/10 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-[#ff5500] transition-colors" placeholder="e.g. 2021 - Present" />
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
