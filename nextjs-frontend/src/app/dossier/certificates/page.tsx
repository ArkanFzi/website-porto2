"use client";

import React, { useEffect, useState } from "react";
import TimedCarousel, { CarouselItem } from "@/components/Dossier/TimedCarousel";
import SuperCTA from "@/components/Dossier/SuperCTA";
import { Award, ShieldCheck } from "lucide-react";

interface Certificate {
    id: string;
    title: string;
    issuer: string;
    date: string;
}

const CERT_BACKGROUNDS = [
    "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=2000",
    "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&q=80&w=2000",
    "https://images.unsplash.com/photo-1557683311-eac922347aa1?auto=format&fit=crop&q=80&w=2000",
    "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&q=80&w=2000"
];

export default function CertificatesPage() {
    const [items, setItems] = useState<CarouselItem[]>([]);
    const [allCerts, setAllCerts] = useState<Certificate[]>([]);

    useEffect(() => {
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/certificates`)
            .then((r) => r.ok ? r.json() : [])
            .then((data: Certificate[]) => {
                setAllCerts(data);

                const mappedItems: CarouselItem[] = data.slice(0, 5).map((cert, idx) => {
                    return {
                        id: cert.id,
                        title: cert.title,
                        subtitle: cert.issuer,
                        imageUrl: CERT_BACKGROUNDS[idx % CERT_BACKGROUNDS.length],
                        metrics: (
                            <div className="flex items-center gap-4 mt-4 text-[#c49a56]">
                                <Award className="w-8 h-8" />
                                <span className="font-mono text-2xl tracking-widest">{cert.date}</span>
                            </div>
                        )
                    };
                });
                setItems(mappedItems);
            })
            .catch((e) => console.error(e));
    }, []);

    return (
        <main className="w-full bg-[#111111] min-h-screen font-sans selection:bg-[#c49a56]/30">
            <TimedCarousel
                items={items}
                backHref="/dossier"
                categoryName="Certificates"
                autoPlayInterval={5000}
            />

            {/* Deep Dive Skills Grid & List */}
            <section className="max-w-7xl mx-auto px-6 md:px-12 py-32 text-white border-b border-white/5 relative z-10 bg-[#111]">
                <div className="mb-16">
                    <span className="text-[#c49a56] font-mono text-sm tracking-widest uppercase mb-4 block">Validation</span>
                    <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter">Full Record</h2>
                    <div className="flex gap-8 mt-8 border-b border-white/10 pb-4 text-sm font-mono text-white/40 uppercase tracking-widest">
                        <span className="flex-1">Certification Name</span>
                        <span className="w-48 hidden md:block">Issuing Authority</span>
                        <span className="w-32 text-right">Date Earned</span>
                    </div>
                </div>

                <div className="flex flex-col">
                    {allCerts.map((cert) => (
                        <div
                            key={cert.id}
                            className="flex flex-wrap md:flex-nowrap items-center gap-4 py-6 border-b border-white/5 hover:bg-white/5 transition-colors group px-4 -mx-4 rounded-xl cursor-default"
                        >
                            <div className="flex-1 min-w-[200px]">
                                <h3 className="text-xl font-bold text-white group-hover:text-[#c49a56] transition-colors flex items-center gap-3">
                                    <ShieldCheck className="w-5 h-5 text-[#c49a56]/50" />
                                    {cert.title}
                                </h3>
                            </div>
                            <div className="w-full md:w-48 text-sm font-mono text-white/50 hidden md:block">
                                {cert.issuer}
                            </div>
                            <div className="w-32 text-right text-white/40 font-mono tracking-widest">
                                {cert.date}
                            </div>
                            <button className="w-24 flex justify-end">
                                <span className="px-4 py-1.5 border border-white/10 rounded-full text-xs uppercase tracking-wider text-white/50 hover:text-white hover:border-white/50 transition-colors">
                                    Verify
                                </span>
                            </button>
                        </div>
                    ))}
                </div>
            </section>

            <SuperCTA />
        </main>
    );
}
