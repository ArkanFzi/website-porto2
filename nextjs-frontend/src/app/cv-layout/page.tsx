"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";

interface Certificate {
  id: string;
  title: string;
  issuer: string;
  date: string;
}

export default function CVLayout() {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [certError, setCertError] = useState("");

  useEffect(() => {
    fetch("/api/certificates")
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        // Halaman ini juga jadi sumber PDF /api/cv: kegagalan baca harus ikut tercetak,
        // jangan menyamar sebagai "belum punya sertifikat".
        if (!res.ok || !Array.isArray(data)) {
          setCertError(typeof data?.error === "string" ? data.error : "Certificates could not be loaded.");
          return;
        }
        setCertificates(data);
      })
      .catch(() => setCertError("Certificates could not be loaded: server unreachable."));
  }, []);

  return (
    <div className="bg-white text-black min-h-screen w-full flex font-sans leading-relaxed">
      {/* Sidebar (Left Column) */}
      <div className="w-[35%] bg-[#f3f3f3] p-12 flex flex-col gap-12">
        {/* Profile Picture */}
        <div className="flex justify-center">
          <div className="w-48 h-48 rounded-full overflow-hidden border-4 border-white shadow-sm relative">
            <Image 
              src="/FotoDiriFix.webp"
              alt="M. Arkan Fauzi" 
              fill
              className="object-cover object-top"
            />
          </div>
        </div>

        {/* Contact */}
        <section>
          <h2 className="text-sm font-bold uppercase tracking-widest border-b border-black/10 pb-2 mb-6">Contact</h2>
          <div className="flex flex-col gap-4 text-[13px]">
            <div className="flex items-center gap-3">
              <span className="w-5 h-5 flex items-center justify-center bg-black rounded-full text-white text-[10px]">P</span>
              <span>+62 812 3231 4845</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-5 h-5 flex items-center justify-center bg-black rounded-full text-white text-[10px]">E</span>
              <span>muhammadarkanfauzi9@gmail.com</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-5 h-5 flex items-center justify-center bg-black rounded-full text-white text-[10px]">L</span>
              <span className="break-words">linkedin.com/in/muhamad-arkan-fauzi-5a6799380</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-5 h-5 flex items-center justify-center bg-black rounded-full text-white text-[10px]">A</span>
              <span>Malang, Indonesia</span>
            </div>
          </div>
        </section>

        {/* Education */}
        <section>
          <h2 className="text-sm font-bold uppercase tracking-widest border-b border-black/10 pb-2 mb-6">Education</h2>
          <div className="flex flex-col gap-6 text-[13px]">
            <div>
              <h3 className="font-bold uppercase leading-tight text-accent-primary">SMKN 6 Malang</h3>
              <p className="text-gray-600 font-medium tracking-tight">Software Engineering</p>
              <p className="text-gray-400 text-xs italic">2024 - Present</p>
            </div>
          </div>
        </section>

        {/* Skills */}
        <section>
          <h2 className="text-sm font-bold uppercase tracking-widest border-b border-black/10 pb-2 mb-6">Tech Stack</h2>
          <div className="text-[12px] flex flex-col gap-4">
            <div>
              <p className="font-bold uppercase text-[10px] text-gray-500 mb-1">Languages & Frameworks</p>
              <p className="flex flex-wrap gap-x-2 gap-y-1">
                <span>C# / .NET</span> • <span>Go</span> • <span>Node.js</span> • <span>PHP / Laravel</span> • <span>Next.js</span> • <span>React</span> • <span>Dart</span> • <span>Tailwind CSS</span>
              </p>
            </div>
            <div>
              <p className="font-bold uppercase text-[10px] text-gray-500 mb-1">Databases & Cloud</p>
              <p className="flex flex-wrap gap-x-2 gap-y-1">
                <span>PostgreSQL</span> • <span>MySQL</span> • <span>MariaDB</span> • <span>SQL Server</span> • <span>Firebase</span>
              </p>
            </div>
            <div>
              <p className="font-bold uppercase text-[10px] text-gray-500 mb-1">Tools</p>
              <p className="flex flex-wrap gap-x-2 gap-y-1">
                <span>Docker</span> • <span>NGINX</span> • <span>Caddy</span> • <span>Figma</span> • <span>Git</span>
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* Main Content (Right Column) */}
      <div className="w-[65%] p-16 pt-20 flex flex-col gap-12">
        {/* Header */}
        <header>
          <h1 className="text-6xl font-serif tracking-tight mb-2">M. Arkan Fauzi</h1>
          <p className="text-2xl font-serif text-gray-700 italic">Full-Stack Developer & System Analyst</p>
          <div className="w-20 h-0.5 bg-black/10 mt-8 mb-8" />
          {/* Nama peran dan periode di bawah diambil apa adanya dari LinkedIn; jangan dinaikkan lagi. */}
          <p className="text-sm leading-relaxed text-gray-700 text-justify">
            Software Engineering student at SMK Negeri 6 Malang who works across the whole path — from analysing
            system requirements to shipping the code that satisfies them. Since May 2026 I have been an apprentice
            Full Stack Engineer at Sekawan Media, maintaining and continuously developing two enterprise-scale
            applications built on a microservices architecture, alongside project work published on GitHub
            (Next.js, Go, PHP / Laravel, C#).
          </p>
        </header>

        {/* Experience */}
        <section>
          <h2 className="text-sm font-bold uppercase tracking-widest border-b border-black/10 pb-2 mb-8">Professional Record</h2>
          <div className="flex flex-col gap-12">
            <div>
              <div className="flex justify-between items-baseline mb-2">
                <h3 className="font-bold uppercase text-[15px]">Full Stack Engineer — Apprenticeship</h3>
                <span className="text-xs text-gray-400 italic">May 2026 - Present</span>
              </div>
              <p className="text-sm font-medium text-gray-600 mb-4 tracking-wide">Sekawan Media · Malang · Hybrid</p>
              <p className="text-[13px] text-gray-700 text-justify">
                Entrusted with the maintenance and continuous development of two enterprise-scale applications built on a
                microservices architecture, including an HRIS and recruitment system. The work runs from requirement
                analysis through backend services to the frontend that consumes them, on code that already serves real users.
              </p>
            </div>
            <div>
              <div className="flex justify-between items-baseline mb-2">
                <h3 className="font-bold uppercase text-[15px]">Software Engineering Student</h3>
                <span className="text-xs text-gray-400 italic">Jun 2024 - Present</span>
              </div>
              <p className="text-sm font-medium text-gray-600 mb-4 tracking-wide">SMK Negeri 6 Malang</p>
              <p className="text-[13px] text-gray-700 text-justify">
                Building a software portfolio through independent projects and team collaborations while studying
                Software Engineering (RPL). The school programme runs alongside an industrial class with Sekawan Media —
                advanced frontend modules and the Teaching Factory (TEFA) programme — producing Laravel, Next.js and C#
                work that is published publicly on GitHub.
              </p>
            </div>
            <div>
              <div className="flex justify-between items-baseline mb-2 text-accent-secondary">
                <h3 className="font-bold uppercase text-[15px]">Semi Finalist — JHIC 2025</h3>
                <span className="text-xs italic opacity-70">Nov 2025</span>
              </div>
              <p className="text-sm font-medium text-gray-600 mb-4 tracking-wide">Jagoan Hosting Infra Competition</p>
              <p className="text-[13px] text-gray-700 text-justify">
                A national-level school website competition organized by Jagoan Hosting in collaboration with Komdigi and Maspion IT. Covering stages through bootcamps (coding, cyber security, design) to the finals, it focuses on enhancing digital literacy and school digital identities. Competing for the official trophy from the Ministry of Communication and Digital of the Republic of Indonesia.
              </p>
            </div>
          </div>
        </section>

        {/* Certificates */}
        <section>
          <h2 className="text-sm font-bold uppercase tracking-widest border-b border-black/10 pb-2 mb-8">Validations / Certificates</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-[13px]">
            {certError ? (
              <p className="text-gray-600 italic col-span-2">{certError}</p>
            ) : certificates.length > 0 ? certificates.map((cert) => (
              <div key={cert.id}>
                <h3 className="font-bold uppercase leading-tight">{cert.title}</h3>
                <p className="text-gray-500">{cert.issuer} | {cert.date}</p>
              </div>
            )) : (
              <p className="text-gray-400 italic">No certifications recorded.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
