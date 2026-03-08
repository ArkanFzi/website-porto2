"use client";

import React, { useEffect, useState } from "react";
import TimedCarousel, { CarouselItem } from "@/components/Dossier/TimedCarousel";
import SuperCTA from "@/components/Dossier/SuperCTA";
import { Building2, Calendar } from "lucide-react";

interface Experience {
    id: string;
    role: string;
    company: string;
    period: string;
}

const EXP_BACKGROUNDS = [
    "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&q=80&w=2000",
    "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=2000",
    "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&q=80&w=2000",
    "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=2000"
];

export default function ExperiencePage() {
  const [items, setItems] = useState<CarouselItem[]>([]);
  const [allExp, setAllExp] = useState<Experience[]>([]);

  useEffect(() => {
    fetch("http://localhost:8080/api/experience")
      .then((r) => r.ok ? r.json() : [])
      .then((data: Experience[]) => {
        setAllExp(data);

        const mappedItems: CarouselItem[] = data.slice(0, 5).map((exp, idx) => {
            return {
                id: exp.id,
                title: exp.role,
                subtitle: exp.company,
                imageUrl: EXP_BACKGROUNDS[idx % EXP_BACKGROUNDS.length],
                metrics: (
                    <div className="flex items-center gap-6 mt-4 text-[#ff5500]">
                        <span className="flex items-center gap-2 font-mono text-xl tracking-widest"><Building2 className="w-5 h-5" /> {exp.company}</span>
                        <span className="flex items-center gap-2 font-mono text-xl tracking-widest text-[#ff5500]/70"><Calendar className="w-5 h-5" /> {exp.period}</span>
                    </div>
                )
            };
        });
        setItems(mappedItems);
      })
      .catch((e) => console.error(e));
  }, []);

  return (
    <main className="w-full bg-[#111111] min-h-screen font-sans selection:bg-[#ff5500]/30">
      <TimedCarousel 
          items={items} 
          backHref="/dossier" 
          categoryName="Experience" 
          autoPlayInterval={6500} 
      />

      {/* Deep Dive Timeline Section */}
      <section className="max-w-4xl mx-auto px-6 md:px-12 py-32 text-white relative z-10 bg-[#111]">
            <div className="mb-24 text-center">
                <span className="text-[#ff5500] font-mono text-sm tracking-widest uppercase mb-4 block">Archive</span>
                <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter">Career History</h2>
                <div className="w-24 h-1 bg-[#ff5500] mx-auto mt-8 opacity-50"></div>
            </div>

            <div className="relative border-l-2 border-white/10 ml-4 md:ml-8 space-y-16">
                {allExp.map((exp) => (
                    <div 
                        key={exp.id} 
                        className="relative pl-8 md:pl-16 group"
                    >
                        {/* Timeline Node */}
                        <div className="absolute left-[-9px] top-2 w-4 h-4 rounded-full bg-[#111] border-2 border-white/20 group-hover:border-[#ff5500] group-hover:shadow-[0_0_15px_#ff5500] transition-all z-10" />
                        
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                            <div>
                                <h3 className="text-2xl font-bold text-white group-hover:text-[#ff5500] transition-colors">
                                    {exp.role}
                                </h3>
                                <div className="flex flex-wrap items-center gap-4 text-sm font-medium text-white/50 mt-3">
                                    <span className="flex items-center gap-1.5 text-white/90">
                                        <Building2 className="w-4 h-4 text-white/40" />
                                        {exp.company}
                                    </span>
                                    <span className="w-1 h-1 rounded-full bg-white/20"></span>
                                    <span className="flex items-center gap-1.5 text-[#ff5500]/90 font-mono tracking-widest">
                                        <Calendar className="w-4 h-4" />
                                        {exp.period}
                                    </span>
                                </div>
                                <p className="text-white/40 mt-6 leading-relaxed max-w-2xl">
                                    Bertanggung jawab penuh atas siklus hidup pengembangan perangkat lunak, merancang arsitektur sistem yang optimal, serta memastikan standar kualitas kode tertinggi selama masa bakti di {exp.company}.
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
      </section>

      <SuperCTA />
    </main>
  );
}
