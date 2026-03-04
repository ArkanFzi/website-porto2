"use client";

import React, { useState } from "react";

const Contact: React.FC = () => {
  const [form, setForm] = useState({ name: "", email: "", message: "" });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const sub = encodeURIComponent(`Portofolio — dari ${form.name}`);
    const body = encodeURIComponent(`Nama: ${form.name}\nEmail: ${form.email}\n\nPesan:\n${form.message}`);
    window.open(`mailto:arkan@example.com?subject=${sub}&body=${body}`, "_self");
  };

  return (
    <section id="contact" className="relative w-full min-h-[90vh] bg-[#0c1410] text-white flex items-center justify-center py-20 overflow-hidden">

      {/* Optional faint background texture or image */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-10 mix-blend-overlay pointer-events-none"
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?q=80&w=2000&auto=format&fit=crop')" }}
      />
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#0c1410] to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#0c1410] to-transparent z-10 pointer-events-none" />

      {/* Main Container - Split Layout */}
      <div className="relative z-20 w-full max-w-[1400px] mx-auto px-8 lg:px-20 grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-start pt-10">

        {/* Left Col: Glowing Title & Description */}
        <div className="flex flex-col max-w-xl">
          <div className="flex items-center mb-16 relative">
            <h2
              className="text-[clamp(60px,8vw,120px)] font-bold uppercase tracking-tight leading-[0.9] text-white"
              style={{
                fontFamily: "var(--f-sans)",
                textShadow: "0 0 10px rgba(255,255,255,0.8), 0 0 20px rgba(255,255,255,0.4), 0 0 30px rgba(255,255,255,0.2)"
              }}
            >
              CONTACT<br />US
            </h2>
            {/* The glowing line next to US */}
            <div className="h-[4px] bg-white w-24 md:w-32 ml-4 mt-auto mb-4 md:mb-6 shadow-[0_0_15px_rgba(255,255,255,0.9)] rounded-full" />
          </div>

          <p className="text-[#a0a0a0] text-[13px] md:text-[14px] leading-[1.8] font-medium max-w-[450px]" style={{ fontFamily: "var(--f-sans)" }}>
            This is placeholder content intended to fill this space until the final copy is ready. The purpose of this text is to give you a better idea of how the layout will look once the real content is in place. You can replace it with your actual words, descriptions, or stories at any time.
          </p>
        </div>

        {/* Right Col: The Form */}
        <div className="flex flex-col w-full max-w-xl lg:ml-auto lg:pt-8 w-full">
          <div className="mb-10 w-full">
            <h3 className="text-[20px] md:text-[24px] tracking-wide mb-3 text-[#e8e9e4]">
              Let's Stay in Touch
            </h3>
            <p className="text-[#808080] text-[13px]">
              We want to hear your questions, suggestions, or concerns.
            </p>
          </div>

          <form onSubmit={onSubmit} className="flex flex-col gap-8 w-full">

            <div className="relative flex flex-col w-full">
              <label className="text-[12px] text-[#a0a0a0] mb-2 font-medium">Name</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Name"
                className="w-full bg-transparent border-b border-white/30 pb-3 text-[14px] text-white placeholder-white/20 focus:outline-none focus:border-white transition-colors py-1"
              />
            </div>

            <div className="relative flex flex-col w-full">
              <label className="text-[12px] text-[#a0a0a0] mb-2 font-medium">Email</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="Email"
                className="w-full bg-transparent border-b border-white/30 pb-3 text-[14px] text-white placeholder-white/20 focus:outline-none focus:border-white transition-colors py-1"
              />
            </div>

            <div className="relative flex flex-col w-full min-h-[140px]">
              <label className="text-[12px] text-[#a0a0a0] mb-2 font-medium">Message</label>
              <textarea
                required
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="Message"
                className="w-full bg-transparent border-b border-white/30 pb-3 text-[14px] text-white shadow-none resize-none min-h-[60px] placeholder-white/20 focus:outline-none focus:border-white transition-colors py-1 flex-grow"
              />
              {/* Resize handle decoration (optional detail from image) */}
              <div className="absolute bottom-1 right-0 w-3 h-3 border-b border-r border-white/30 pointer-events-none" />
            </div>

            <button
              type="submit"
              className="w-full bg-white text-black font-semibold text-[14px] py-4 mt-6 hover:bg-gray-200 transition-colors"
              style={{ fontFamily: "var(--f-sans)" }}
            >
              Send
            </button>

          </form>
        </div>

      </div>

    </section>
  );
};

export default Contact;
