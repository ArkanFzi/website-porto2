"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";

const Contact: React.FC = () => {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [isHovered, setIsHovered] = useState(false);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const sub = encodeURIComponent(`Portofolio — dari ${form.name}`);
    const body = encodeURIComponent(
      `Nama: ${form.name}\nEmail: ${form.email}\n\nPesan:\n${form.message}`
    );
    window.open(`mailto:arkan@example.com?subject=${sub}&body=${body}`, "_self");
  };

  return (
    <section id="contact" className="relative w-full min-h-screen bg-[#0c1410] text-white flex flex-col items-center justify-center py-20 lg:py-32 overflow-hidden">

      {/* Dynamic Background */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-10 mix-blend-overlay pointer-events-none transition-opacity duration-1000"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?q=80&w=2000&auto=format&fit=crop')",
          opacity: isHovered ? 0.2 : 0.05
        }}
      />

      {/* Ambient Glows */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#c49a56]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-[#1a5c3a]/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Massive Edge-to-Edge Typography Background */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden opacity-5">
        <h2 className="text-[25vw] font-black uppercase tracking-tighter leading-none whitespace-nowrap text-white" style={{ fontFamily: "var(--f-sans)" }}>
          GET IN TOUCH
        </h2>
      </div>

      <div className="relative z-20 w-full max-w-[1200px] mx-auto px-6 md:px-12 flex flex-col text-center lg:text-left pt-10">

        {/* Subtle Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex items-center gap-4 mb-16 lg:mb-24 justify-center lg:justify-start"
        >
          <div className="h-[1px] bg-[#c49a56] w-12" />
          <span className="text-[10px] md:text-[12px] uppercase tracking-[0.4em] font-bold text-[#c49a56]" style={{ fontFamily: "var(--f-sans)" }}>
            Let's Collaborate
          </span>
        </motion.div>

        {/* The Conversational "Mad Libs" Form */}
        <form onSubmit={onSubmit} className="w-full relative">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="text-[clamp(32px,5vw,72px)] leading-[1.4] md:leading-[1.5]"
            style={{ fontFamily: "var(--f-serif)" }}
          >
            <span className="text-white/70 italic mr-2 md:mr-4">Hello Arkan! My name is </span>

            <div className="inline-block relative">
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="your name"
                className="inline-input focus:outline-none bg-transparent text-white border-b-2 border-white/20 focus:border-[#c49a56] transition-colors pb-1 md:pb-2 text-center w-[clamp(150px,25vw,350px)] placeholder-white/20 not-italic"
                style={{ fontFamily: "var(--f-sans)" }}
              />
            </div>

            <span className="text-white/70 italic mx-2 md:mx-4">, and my email address is </span>

            <div className="inline-block relative">
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="your email"
                className="inline-input focus:outline-none bg-transparent text-white border-b-2 border-white/20 focus:border-[#c49a56] transition-colors pb-1 md:pb-2 text-center w-[clamp(200px,30vw,450px)] placeholder-white/20 not-italic"
                style={{ fontFamily: "var(--f-sans)" }}
              />
            </div>

            <span className="text-white/70 italic mx-2 md:mx-4">. I want to talk to you about </span>

            <div className="inline-block relative w-full lg:w-auto mt-4 lg:mt-0 lg:ml-2">
              <input
                type="text"
                required
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="your visionary project idea..."
                className="inline-input focus:outline-none bg-transparent text-white border-b-2 border-white/20 focus:border-[#c49a56] transition-colors pb-1 md:pb-2 text-left lg:text-center w-full lg:w-[clamp(400px,40vw,800px)] placeholder-white/20 not-italic"
                style={{ fontFamily: "var(--f-sans)" }}
              />
            </div>

            <span className="text-white/70 italic ml-2">.</span>
          </motion.div>

          {/* Magnetic Submit Button */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="mt-20 md:mt-32 flex justify-center lg:justify-end lg:pr-10"
          >
            <button
              type="submit"
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              className="group relative flex items-center justify-center w-32 h-32 md:w-48 md:h-48 rounded-full border border-white/20 bg-black/40 backdrop-blur-md hover:bg-white hover:border-white transition-all duration-500 overflow-hidden isolate"
            >
              {/* Button text */}
              <span
                className="relative z-10 text-[11px] md:text-[13px] uppercase tracking-[0.3em] font-bold text-white group-hover:text-black transition-colors duration-500"
                style={{ fontFamily: "var(--f-sans)" }}
              >
                Send<br />Message
              </span>

              {/* Hover expanding circle fill */}
              <div className="absolute inset-0 bg-white scale-0 group-hover:scale-100 rounded-full origin-center transition-transform duration-500 ease-[cubic-bezier(0.19,1,0.22,1)] -z-10" />

              {/* Outer gold ring on hover */}
              <div className="absolute -inset-4 border border-[#c49a56] rounded-full scale-50 opacity-0 group-hover:scale-100 group-hover:opacity-30 transition-all duration-700 ease-out" />
            </button>
          </motion.div>

        </form>
      </div>

    </section>
  );
};

export default Contact;
