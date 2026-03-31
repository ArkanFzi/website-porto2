import React from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

export default function SuperCTA() {
  return (
    <section className="w-full bg-[#111] text-white py-32 md:py-48 px-8 md:px-16 lg:px-24 flex flex-col items-center justify-center text-center relative overflow-hidden shrink-0">
        
        {/* Decorative Grid Background */}
        <div className="absolute inset-0 z-0 opacity-20 pointer-events-none" 
             style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} 
        />
        
        <div className="relative z-10 max-w-6xl mx-auto flex flex-col items-center">
            <h2 className="text-5xl md:text-7xl lg:text-[7vw] font-black uppercase tracking-tighter leading-[0.85] mb-12 text-transparent bg-clip-text bg-gradient-to-b from-white to-white/40 drop-shadow-lg">
                Let&apos;s Build Something <br/><span className="text-[#c49a56]">Unique</span> Bersama
            </h2>
            
            <p className="text-white/60 text-lg md:text-2xl max-w-2xl mb-16 font-medium">
                Punya ide gila, tantangan teknis kompleks, atau proyek impian yang butuh dieksekusi sempurna? 
            </p>

            <div className="flex flex-col sm:flex-row gap-6">
                <Link 
                    href="/contact"
                    className="group relative inline-flex items-center justify-center px-10 py-5 font-bold uppercase tracking-widest text-black bg-white overflow-hidden rounded-full transition-transform hover:scale-105"
                >
                    <span className="absolute w-0 h-0 transition-all duration-500 ease-out bg-[#c49a56] rounded-full group-hover:w-full group-hover:h-56"></span>
                    <span className="relative flex items-center gap-3">
                        Mulai Diskusi <ArrowUpRight className="w-5 h-5 group-hover:rotate-45 transition-transform" />
                    </span>
                </Link>
                
                <a 
                    href="/api/cv" 
                    className="inline-flex items-center justify-center px-10 py-5 font-bold uppercase tracking-widest text-white border border-white/20 hover:border-white/60 hover:bg-white/5 rounded-full transition-all"
                >
                    Unduh CV (PDF)
                </a>
            </div>
        </div>
        
    </section>
  );
}
