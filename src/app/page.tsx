'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Home() {
  const [loaded, setLoaded] = useState(false);
  const [hovering, setHovering] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="relative min-h-screen bg-[#08080a] text-white overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-[-40%] left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full opacity-[0.07]"
        style={{ background: 'radial-gradient(circle, #d4a853 0%, transparent 70%)' }} />
      <div className="absolute bottom-[-30%] right-[-10%] w-[600px] h-[600px] rounded-full opacity-[0.04]"
        style={{ background: 'radial-gradient(circle, #d4a853 0%, transparent 70%)' }} />

      {/* Grid texture */}
      <div className="absolute inset-0 opacity-[0.03]"
        style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

      {/* Nav */}
      <nav className={`relative z-10 flex justify-between items-center px-8 md:px-16 py-6 transition-all duration-1000 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border border-[#d4a853]/40 rotate-45 flex items-center justify-center">
            <div className="w-3 h-3 bg-[#d4a853] rotate-0" />
          </div>
          <span className="text-sm tracking-[0.3em] text-[#d4a853]/80 font-light">ZAAHI</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-[11px] tracking-[0.2em] text-white/40">
          <span className="hover:text-white/80 transition cursor-pointer">PLATFORM</span>
          <span className="hover:text-white/80 transition cursor-pointer">VISION</span>
          <span className="hover:text-white/80 transition cursor-pointer">TECHNOLOGY</span>
          <Link href="/register" className="text-[#d4a853]/70 hover:text-[#d4a853] transition">JOIN</Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="relative z-10 flex flex-col items-center justify-center min-h-[80vh] px-6">
        {/* Eyebrow */}
        <div className={`transition-all duration-1000 delay-300 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-[1px] bg-gradient-to-r from-transparent to-[#d4a853]/50" />
            <span className="text-[10px] tracking-[0.4em] text-[#d4a853]/60 uppercase">Dubai · UAE · 2026</span>
            <div className="w-12 h-[1px] bg-gradient-to-l from-transparent to-[#d4a853]/50" />
          </div>
        </div>

        {/* Title */}
        <h1 className={`text-center transition-all duration-1000 delay-500 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <span className="block text-[clamp(4rem,12vw,10rem)] font-extralight tracking-[-0.02em] leading-[0.85]"
            style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
            ZAAHI
          </span>
        </h1>

        {/* Divider */}
        <div className={`my-8 transition-all duration-1000 delay-700 ${loaded ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-0'}`}>
          <div className="w-24 h-[1px] bg-gradient-to-r from-transparent via-[#d4a853]/40 to-transparent" />
        </div>

        {/* Subtitle */}
        <p className={`text-center max-w-xl transition-all duration-1000 delay-[800ms] ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <span className="block text-[13px] md:text-[15px] tracking-[0.15em] text-white/30 leading-relaxed font-light">
            CIVILIZATIONAL INFRASTRUCTURE
          </span>
          <span className="block text-[13px] md:text-[15px] tracking-[0.15em] text-white/30 leading-relaxed font-light mt-1">
            FOR REAL ESTATE
          </span>
        </p>

        {/* Description */}
        <p className={`text-center max-w-md mt-6 text-[12px] leading-[1.8] text-white/20 font-light transition-all duration-1000 delay-[900ms] ${loaded ? 'opacity-100' : 'opacity-0'}`}>
          From one land plot in Dubai to every parcel on Earth.
          <br />
          AI agents. 3D metaverse. Autonomous construction.
        </p>

        {/* CTA */}
        <div className={`mt-12 transition-all duration-1000 delay-[1100ms] ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <Link
            href="/register"
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => setHovering(false)}
            className="group relative inline-flex items-center gap-4 px-10 py-4 border border-[#d4a853]/30 hover:border-[#d4a853]/60 transition-all duration-500 rounded-none"
          >
            <div className={`absolute inset-0 bg-[#d4a853]/5 transition-all duration-500 ${hovering ? 'opacity-100' : 'opacity-0'}`} />
            <span className="relative text-[11px] tracking-[0.3em] text-[#d4a853]/80 group-hover:text-[#d4a853] transition-colors">
              ENTER ZAAHI
            </span>
            <svg className={`relative w-4 h-4 text-[#d4a853]/40 group-hover:text-[#d4a853]/80 transition-all duration-500 ${hovering ? 'translate-x-1' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>

        {/* Stats */}
        <div className={`mt-20 grid grid-cols-3 gap-8 md:gap-16 transition-all duration-1000 delay-[1300ms] ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          {[
            { value: '85', label: 'KNOWLEDGE NODES' },
            { value: '3', label: 'AI AGENTS' },
            { value: '21', label: 'REVENUE STREAMS' },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl md:text-3xl font-extralight text-white/60"
                style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
                {stat.value}
              </div>
              <div className="mt-2 text-[8px] md:text-[9px] tracking-[0.25em] text-white/20">{stat.label}</div>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className={`relative z-10 flex flex-col items-center py-12 transition-all duration-1000 delay-[1500ms] ${loaded ? 'opacity-100' : 'opacity-0'}`}>
        <div className="flex items-center gap-6 text-[9px] tracking-[0.2em] text-white/15">
          <span>LAND</span>
          <span className="text-[#d4a853]/30">◆</span>
          <span>METAVERSE</span>
          <span className="text-[#d4a853]/30">◆</span>
          <span>ROBOTICS</span>
          <span className="text-[#d4a853]/30">◆</span>
          <span>SOVEREIGN</span>
        </div>
        <p className="mt-6 text-[9px] tracking-[0.15em] text-white/10">
          10% OF EVERY DOLLAR → BUILDING ROBOTS THAT BUILD THE FUTURE
        </p>
      </footer>
    </div>
  );
}
