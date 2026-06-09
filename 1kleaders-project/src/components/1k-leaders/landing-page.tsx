'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import type { Page } from './types';

interface Props { navigate: (page: Page) => void; }

export default function LandingPage({ navigate }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuOpen && menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const navLinkClass = 'text-white no-underline font-medium text-sm hover:opacity-70 transition-opacity cursor-pointer';

  return (
    <div className="min-h-screen flex flex-col" style={{ fontFamily: 'var(--font-manrope), Manrope, sans-serif', backgroundColor: '#111' }}>

      {/* ── Navbar ── */}
      <nav
        ref={menuRef}
        className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-[#111]/95 backdrop-blur-md shadow-lg' : ''}`}
        style={{ paddingTop: scrolled ? '1rem' : '2.5rem', paddingBottom: scrolled ? '1rem' : '2.5rem', paddingLeft: '5vw', paddingRight: '5vw' }}
      >
        <div className="flex items-center justify-between">
          {/* Logo */}
          <button onClick={() => navigate('landing')} className="bg-transparent border-none cursor-pointer p-0 h-10 flex items-center">
            <img src="/logo-light-mid.png" alt="1KLeaders" className="h-full object-contain" />
          </button>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#about" className={navLinkClass} style={{ fontFamily: 'var(--font-rethink-sans), Rethink Sans, sans-serif' }}>What We Do</a>
            <a href="#offer" className={navLinkClass} style={{ fontFamily: 'var(--font-rethink-sans), Rethink Sans, sans-serif' }}>What We Offer</a>
            <a href="#cta" className={navLinkClass} style={{ fontFamily: 'var(--font-rethink-sans), Rethink Sans, sans-serif' }}>Join Us</a>
            <button
              onClick={() => navigate('login')}
              className="text-white font-medium bg-transparent border border-white/30 rounded px-4 py-2 text-sm hover:border-white transition-colors cursor-pointer"
              style={{ fontFamily: 'var(--font-rethink-sans), Rethink Sans, sans-serif' }}
            >
              Sign In
            </button>
            <button
              onClick={() => navigate('waitlist')}
              className="bg-gradient-to-r from-[#e33b5f] to-[#E65F5C] text-white px-5 py-2 rounded font-bold border-none cursor-pointer inline-flex items-center gap-2 hover:opacity-90 transition-opacity text-sm"
              style={{ fontFamily: 'var(--font-rethink-sans), Rethink Sans, sans-serif' }}
            >
              Get Started <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Hamburger */}
          <button
            className="md:hidden flex flex-col gap-[5px] p-2 cursor-pointer bg-transparent border-none"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <span className={`block w-6 h-[2px] bg-white transition-all duration-300 ${menuOpen ? 'rotate-45 translate-y-[7px]' : ''}`} />
            <span className={`block w-6 h-[2px] bg-white transition-all duration-300 ${menuOpen ? 'opacity-0' : ''}`} />
            <span className={`block w-6 h-[2px] bg-white transition-all duration-300 ${menuOpen ? '-rotate-45 -translate-y-[7px]' : ''}`} />
          </button>
        </div>

        {/* Mobile menu */}
        <div className={`md:hidden overflow-hidden transition-all duration-300 ${menuOpen ? 'max-h-96 mt-4' : 'max-h-0'}`}>
          <div className="flex flex-col gap-1 bg-[#1a1a1a] rounded-lg p-4">
            <a href="#about" onClick={() => setMenuOpen(false)} className="text-white py-3 border-b border-white/10 text-sm font-medium" style={{ fontFamily: 'var(--font-rethink-sans), Rethink Sans, sans-serif' }}>What We Do</a>
            <a href="#offer" onClick={() => setMenuOpen(false)} className="text-white py-3 border-b border-white/10 text-sm font-medium" style={{ fontFamily: 'var(--font-rethink-sans), Rethink Sans, sans-serif' }}>What We Offer</a>
            <a href="#cta" onClick={() => setMenuOpen(false)} className="text-white py-3 border-b border-white/10 text-sm font-medium" style={{ fontFamily: 'var(--font-rethink-sans), Rethink Sans, sans-serif' }}>Join Us</a>
            <div className="flex gap-3 pt-3">
              <button onClick={() => navigate('login')} className="flex-1 text-white text-sm font-medium bg-transparent border border-white/30 rounded py-2 hover:border-white transition-colors">Sign In</button>
              <button onClick={() => navigate('waitlist')} className="flex-1 bg-gradient-to-r from-[#e33b5f] to-[#E65F5C] text-white text-sm font-bold rounded py-2 border-none cursor-pointer">Get Started</button>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative min-h-screen flex flex-col justify-end pb-[12vh]" style={{ paddingLeft: '5vw' }}>
        {/* Video background */}
        <div className="absolute inset-0 z-0 overflow-hidden bg-[#111]">
          <video
            autoPlay muted loop playsInline preload="auto"
            className="w-full h-full object-cover opacity-60"
            onError={(e) => { (e.target as HTMLVideoElement).style.display = 'none'; }}
          >
            <source src="https://1kleaders.com/_app/immutable/assets/landing.4cecc8fc.mp4" type="video/mp4" />
          </video>
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#111] via-[#111]/40 to-transparent" />
        </div>

        <div className="relative z-10 flex flex-col gap-[2.5vh]">
          <p
            className="text-white text-[1.2rem] md:text-[1.5rem] tracking-[0.3rem] uppercase"
            style={{ fontFamily: 'var(--font-manrope), Manrope, sans-serif' }}
          >
            1000 leaders
          </p>
          <h1
            className="text-white font-bold leading-[1.05] w-[90%] md:w-[75%]"
            style={{ fontFamily: 'var(--font-rethink-sans), Rethink Sans, sans-serif', fontSize: 'clamp(3rem, 7vw, 5.5rem)' }}
          >
            Not your typical venture builder<br />
            We <span className="bg-gradient-to-r from-[#E65F5C] to-[#e33b5f] bg-clip-text text-transparent">Invent</span>
          </h1>
        </div>
      </section>

      {/* Coloured Split Bar */}
      <div className="w-full bg-[#f07969]" style={{ height: '6vh', minHeight: '2.5rem' }} />

      {/* ── About / What We Do ── */}
      <section id="about" className="bg-[#141414]" style={{ padding: '18vh 8vw 12vh' }}>
        <div className="relative overflow-hidden">
          {/* Background decorator */}
          <div
            className="absolute top-[10%] left-[-5%] w-[110%] text-center pointer-events-none select-none uppercase whitespace-nowrap z-0"
            style={{
              fontFamily: 'Humane, var(--font-rethink-sans), sans-serif',
              fontWeight: 700,
              color: 'transparent',
              WebkitTextStrokeColor: 'rgba(255,255,255,0.05)',
              WebkitTextStrokeWidth: '2px',
              fontSize: '42vw',
              lineHeight: '1',
              letterSpacing: '-0.02em',
            }}
          >
            1K Leaders
          </div>

          <div className="relative z-10 mb-[10vh]">
            <h2
              className="text-white font-bold w-full lg:w-[70%]"
              style={{ fontFamily: 'var(--font-rethink-sans), Rethink Sans, sans-serif', fontSize: 'clamp(2.2rem, 4.5vw, 3.5rem)', letterSpacing: '-1px' }}
            >
              Transforming ideas into scalable startups.
            </h2>
          </div>

          <div className="relative z-10 flex flex-col lg:flex-row gap-12 lg:gap-0" style={{ marginRight: '-8vw' }}>
            <div className="lg:basis-[35%] flex flex-col gap-[4vh] text-white">
              <p className="text-[1.1rem] leading-[160%]" style={{ fontFamily: 'var(--font-manrope), Manrope, sans-serif' }}>Through dedicated regional expertise and advisory.</p>
              <p className="text-[1.1rem] leading-[160%]" style={{ fontFamily: 'var(--font-manrope), Manrope, sans-serif' }}>Driven by collective professionals, leaders, advisors, and investors.</p>
            </div>
            <div className="lg:basis-[65%] overflow-hidden rounded-[0.7rem]">
              <img
                src="https://1kleaders.com/_app/immutable/assets/about.e36c9797.jpg"
                alt="About 1K Leaders"
                className="w-full h-[60vh] object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── What We Offer / USP ── */}
      <section id="offer" className="bg-[#141414]" style={{ padding: '18vh 8vw 14vh' }}>
        <h2
          className="text-white font-bold mb-[13vh]"
          style={{ fontFamily: 'var(--font-rethink-sans), Rethink Sans, sans-serif', fontSize: 'clamp(2.2rem, 4.5vw, 3.5rem)', letterSpacing: '-1px' }}
        >
          We are more than just a platform.
        </h2>

        <div className="flex flex-col lg:flex-row gap-[8vw]">
          {/* Vertical decorator — desktop only */}
          <div className="hidden lg:flex items-center lg:basis-[28%]">
            <div style={{ writingMode: 'vertical-lr', userSelect: 'none' }}>
              <span style={{
                fontFamily: 'Humane, var(--font-rethink-sans), sans-serif',
                fontWeight: 700,
                color: 'transparent',
                WebkitTextStrokeColor: 'rgba(255,255,255,0.06)',
                WebkitTextStrokeWidth: '2px',
                fontSize: '22vw',
                lineHeight: '0.85',
              }}>1KLeaders</span>
            </div>
          </div>

          <div className="flex flex-col gap-[8vh] lg:basis-[72%] text-white">
            <p className="text-[1.1rem] leading-[160%]" style={{ fontFamily: 'var(--font-manrope), Manrope, sans-serif' }}>
              We are a rocket ship for your entrepreneurial spirit, fueled by your vision and guided by our expertise.
            </p>
            <p className="uppercase tracking-[0.18rem] text-sm opacity-70" style={{ fontFamily: 'var(--font-manrope), Manrope, sans-serif' }}>
              Benefit from our exclusive partnership program
            </p>

            {[
              {
                title: 'Embrace a holistic ecosystem',
                content: "We are committed to fostering an environment that nurtures growth and innovation. You will be able to connect with builders, entrepreneurs, professionals, advisors, and thought leaders across diverse industries and expertise levels. This dynamic network brings together doers and experts to thrive into an interconnected setting.",
              },
              {
                title: 'Realize your potential while sustaining your career aspirations',
                content: "We understand the importance of stability in the pursuit of excellence. Who says you can't have the best of both worlds? Our unique model allows you to keep your career engine running while fueling your dream machine. It's not about choosing one path—it's about paving a new one, parallel to the road you're already on.",
              },
              {
                title: 'Capitalize on our dedicated advisory team',
                content: "Expert guidance is key to navigating the path to success. Our members gain access to expertly handpicked and perfectly synched seasoned professionals from various industries. Collaborate with advisors that are committed to providing personalized support, strategic insights, and the wisdom you need to overcome challenges and achieve your goals.",
              },
            ].map((usp) => (
              <div key={usp.title}>
                <div className="border-b border-white/20 pb-4 mb-6">
                  <h4 className="font-bold" style={{ fontFamily: 'var(--font-rethink-sans), Rethink Sans, sans-serif', fontSize: 'clamp(1.5rem, 2.5vw, 2.1rem)' }}>
                    {usp.title}
                  </h4>
                </div>
                <p className="leading-[170%] opacity-80 lg:w-[65%]" style={{ fontFamily: 'var(--font-manrope), Manrope, sans-serif' }}>
                  {usp.content}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA / Join As ── */}
      <section id="cta" className="bg-[#f6f6f6]" style={{ padding: '15vh 5vw 12vh' }}>
        <h2
          className="text-[#222] font-bold mb-[10vh] w-full lg:w-[65%]"
          style={{ fontFamily: 'var(--font-rethink-sans), Rethink Sans, sans-serif', fontSize: 'clamp(2.2rem, 4vw, 3.4rem)', letterSpacing: '-1px' }}
        >
          Turn insights into outcomes and expertise into advancement.
        </h2>

        <div className="flex flex-col lg:flex-row gap-[5vw] mb-[8vh]">
          {[
            {
              img: 'https://1kleaders.com/_app/immutable/assets/cta-1.823953b9.jpg',
              tag: 'passionate dreamers',
              title: 'Co-Founders & Idea Owners',
              desc: 'Innovate, collaborate, co-found. If you are passionate about problem-solving or challenging the status quo with ideas big and small, join 1K Leaders as a co-founder, whether part-time or full-time and let us turn your ambition into action.',
              action: 'idea-owner-login' as Page,
            },
            {
              img: 'https://1kleaders.com/_app/immutable/assets/cta-2.c59c7df4.jpg',
              tag: 'ambitious professionals',
              title: 'Field Experts & Subject Matter Experts',
              desc: 'Share knowledge and expertise. If you are a passionate professional or seasoned expert, your insight and experience can guide, mentor, and inspire. Join 1K Leaders to lead transformation and ignite our network.',
              action: 'partner-login' as Page,
            },
            {
              img: 'https://1kleaders.com/_app/immutable/assets/cta-3.6e413efe.jpg',
              tag: 'future visionary',
              title: 'Angel Investors & Venture Capitals',
              desc: 'Invest time and money. If you are enthusiastic about sharing wisdom and willing to dedicate your time, you can ignite measurable transformation and yield quantifiable returns. Join the 1K Leaders ecosystem to mentor, guide, and invest with us.',
              action: 'partner-login' as Page,
            },
          ].map((cta) => (
            <div
              key={cta.title}
              className="flex flex-col flex-1 min-w-0 cursor-pointer group"
              onClick={() => navigate(cta.action)}
            >
              <img
                src={cta.img}
                alt={cta.title}
                className="w-full object-cover rounded-[0.5rem] mb-6 group-hover:scale-[1.02] transition-transform duration-300"
                style={{ height: 'clamp(220px, 35vh, 340px)' }}
              />
              <p className="uppercase tracking-[0.15rem] text-xs text-[#555353] mb-2" style={{ fontFamily: 'var(--font-manrope), Manrope, sans-serif' }}>{cta.tag}</p>
              <h4
                className="text-[#222] font-bold mb-4"
                style={{ fontFamily: 'var(--font-rethink-sans), Rethink Sans, sans-serif', fontSize: 'clamp(1.5rem, 2.2vw, 2rem)' }}
              >
                {cta.title}
              </h4>
              <p className="leading-[180%] text-[#444] text-sm flex-1" style={{ fontFamily: 'var(--font-manrope), Manrope, sans-serif' }}>{cta.desc}</p>
            </div>
          ))}
        </div>

        <div className="flex justify-center">
          <button
            onClick={() => navigate('waitlist')}
            className="bg-gradient-to-r from-[#e33b5f] to-[#E65F5C] text-white px-7 py-3 rounded font-bold border-none cursor-pointer inline-flex items-center gap-2 hover:opacity-90 transition-opacity"
            style={{ fontFamily: 'var(--font-rethink-sans), Rethink Sans, sans-serif' }}
          >
            Join the Waitlist <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-[#111] border-b-[5px] border-[#f07969]" style={{ padding: '13vh 10vw 6vh' }}>
        <div className="flex flex-col gap-[3vh] mb-[10vh]">
          <h2
            className="text-white font-bold"
            style={{ fontFamily: 'var(--font-rethink-sans), Rethink Sans, sans-serif', fontSize: 'clamp(2.2rem, 4.5vw, 3.5rem)', letterSpacing: '-1px' }}
          >
            Invent, Build, <span className="bg-gradient-to-r from-[#E65F5C] to-[#e33b5f] bg-clip-text text-transparent">Scale...</span>
          </h2>
          <div className="flex flex-row items-center gap-8 flex-wrap">
            <a href="https://www.linkedin.com/company/1kleaders/" target="_blank" rel="noopener noreferrer" className="hover:opacity-70 transition-opacity">
              <img src="https://1kleaders.com/_app/immutable/assets/linkedin.5df475a4.png" alt="LinkedIn" className="h-8" />
            </a>
            <img src="/logo-light.png" alt="1KLeaders Logo" className="h-10 object-contain" />
            <a
              href="mailto:info@1kleaders.com"
              className="text-white uppercase tracking-[0.15rem] text-sm no-underline hover:opacity-70 transition-opacity"
              style={{ fontFamily: 'var(--font-manrope), Manrope, sans-serif' }}
            >
              info@1kleaders.com
            </a>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-t border-[#333] pt-6 gap-3">
          <p className="text-[#7e7e7e] text-sm" style={{ fontFamily: 'var(--font-manrope), Manrope, sans-serif' }}>
            &copy; 2026 - 1000 Leaders Holding Limited, All Rights Reserved
          </p>
          <ul className="list-none flex gap-4 m-0 p-0">
            <li className="text-[#555353] text-sm" style={{ fontFamily: 'var(--font-manrope), Manrope, sans-serif' }}>1K Leaders</li>
          </ul>
        </div>
      </footer>
    </div>
  );
}
