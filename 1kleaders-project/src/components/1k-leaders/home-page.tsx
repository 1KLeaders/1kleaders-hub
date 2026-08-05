'use client';
import { useEffect, useRef, useState } from 'react';

export default function HomePage() {
  const [navActive,       setNavActive]       = useState(false);
  const [navDark,         setNavDark]         = useState(true);
  const [navBg,           setNavBg]           = useState(false);
  const [mobileOpen,      setMobileOpen]      = useState(false);
  const [landingActive,   setLandingActive]   = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Entrance animation
    const t1 = setTimeout(() => setNavActive(true), 100);
    const t2 = setTimeout(() => setLandingActive(true), 300);

    const onScroll = () => {
      const scrollY = window.scrollY;
      const heroH   = heroRef.current?.offsetHeight ?? window.innerHeight;
      setNavDark(scrollY < heroH * 0.85);
      setNavBg(scrollY > 60);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => {
      clearTimeout(t1); clearTimeout(t2);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rethink+Sans:wght@400;500;700;800&family=Manrope:wght@200;300;400;500;600;700;800&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0');

        @font-face {
          font-family: Humane;
          src: url('https://1kleaders.com/_app/immutable/assets/humane-bold.5dfbda44.woff2') format('woff2');
          font-weight: 700;
        }

        * { padding: 0; margin: 0; box-sizing: border-box; }
        html, body { overflow-x: hidden; background-color: #fbfbfb; }

        .lk-root { font-family: Manrope, sans-serif; font-size: 0.9rem; color: #222; overflow-x: hidden; }
        .lk-root h1, .lk-root h2, .lk-root h4 { font-family: 'Rethink Sans', sans-serif; font-weight: 700; color: #222; }
        .lk-root h1 { font-size: 4.1rem; }
        .lk-root h2 { font-size: 3.4rem; letter-spacing: -1px; }
        .lk-root h4 { font-size: 2.2rem; }
        .lk-root p { font-size: 1rem; line-height: 1.6; }
        .lk-root p.medium { font-size: 1.17rem; }
        .lk-root .tag { font-family: Manrope, sans-serif; text-transform: uppercase; letter-spacing: 0.15rem; }
        @media (max-width: 500px) {
          .lk-root h1 { font-size: 9vw; }
          .lk-root h2 { font-size: 8.5vw; }
          .lk-root h4 { font-size: 7.5vw; }
          .lk-root p.medium { font-size: 4vw; }
          .lk-root p { font-size: 3.5vw; }
        }

        /* ── NAV ── */
        .lk-nav {
          position: fixed; top: 0; left: 0; width: 100%;
          padding: 7vh 5vw;
          display: flex; flex-direction: row; justify-content: space-between; align-items: center;
          z-index: 100;
          transform: translate3d(0, -100%, 0);
          transition: padding 0.5s ease, transform 1s cubic-bezier(0.76, 0, 0.24, 1);
        }
        .lk-nav.active { transform: translateZ(0); }
        .lk-nav.with-bg { padding: 2vh 5vw; }
        .lk-nav-bg {
          position: absolute; top: 0; left: 0; width: 100%; height: 0;
          z-index: -1; opacity: 0;
          transition: opacity 0.5s ease, height 0.3s ease, background-color 0.3s ease;
          background-color: rgba(251,251,251,0.8);
          backdrop-filter: blur(30px) grayscale(50%);
          -webkit-backdrop-filter: blur(30px) grayscale(50%);
        }
        .lk-nav.with-bg .lk-nav-bg { opacity: 1; height: 100%; }
        .lk-nav.dark .lk-nav-bg { background-color: rgba(20,20,20,0.8) !important; }
        .lk-nav-logo { background: none; border: none; cursor: pointer; height: 4.2rem; }
        .lk-nav-logo img { height: 100%; transition: filter 0.3s ease; }
        .lk-nav.dark .lk-nav-logo img { filter: invert(100%); }
        .lk-nav-links { display: flex; flex-direction: row; align-items: center; gap: 2.5rem; list-style: none; }
        .lk-nav-links li a {
          font-family: 'Rethink Sans', sans-serif; font-size: 1rem; font-weight: 500;
          text-decoration: none; color: #222; transition: color 0.3s ease;
          position: relative;
        }
        .lk-nav-links li a:not(.lk-btn)::after,
        .lk-nav-links li a:not(.lk-btn)::before {
          content: ''; position: absolute; bottom: -1px; height: 2px; background-color: #555353;
        }
        .lk-nav-links li a:not(.lk-btn)::after { left: 0; width: 0%; }
        .lk-nav-links li a:not(.lk-btn)::before { right: 0; width: 100%; }
        .lk-nav-links li a:not(.lk-btn):hover::after { width: 100%; transition: width 0.8s ease; }
        .lk-nav-links li a:not(.lk-btn):hover::before { width: 0%; transition: width 0.5s ease; }
        .lk-nav.dark .lk-nav-links li a { color: #fff !important; }
        .lk-nav.dark .lk-nav-links li a:not(.lk-btn)::after,
        .lk-nav.dark .lk-nav-links li a:not(.lk-btn)::before { background-color: rgba(255,255,255,0.4); }

        /* ── BUTTON ── */
        .lk-btn {
          background: linear-gradient(30deg, #e33b5f, #E65F5C);
          color: #fff !important; padding: 0.8rem 1.7rem; border-radius: 0.3rem;
          text-decoration: none; font-weight: 700; font-family: 'Rethink Sans', sans-serif;
          display: inline-flex; align-items: center; border: none; cursor: pointer;
          position: relative; transition: opacity 0.2s ease;
        }
        .lk-btn::after, .lk-btn::before {
          content: 'arrow_forward'; font-family: 'Material Symbols Outlined';
          font-weight: 400; font-size: 1.2rem; line-height: 1.1;
          display: inline-block; overflow: hidden;
          transition: width 0.3s ease, margin 0.3s ease;
        }
        .lk-btn::after  { margin-left: 0.5rem; width: 1.1rem; }
        .lk-btn::before { margin-right: 0; width: 0; }
        .lk-btn:hover::after  { margin-left: 0; width: 0; }
        .lk-btn:hover::before { margin-right: 0.5rem; width: 1.1rem; }

        /* ── HAMBURGER ── */
        .lk-hb { display: none; }
        .lk-hb-btn { background: none; border: none; cursor: pointer; z-index: 21; position: relative; }
        .lk-hb-icon { display: flex; flex-direction: column; gap: 6px; width: 3vh; height: 3vh; transition: gap 0.5s ease; }
        .lk-hb-icon span { display: block; height: 2px; width: 100%; background-color: #222; transition: 0.5s ease; }
        .lk-nav.dark .lk-hb-icon span { background-color: #fff; }
        .lk-hb-btn.open .lk-hb-icon { gap: 0; }
        .lk-hb-btn.open .lk-hb-icon span:nth-child(1) { transform: translateY(100%) rotate(-45deg); }
        .lk-hb-btn.open .lk-hb-icon span:nth-child(2) { width: 0; }
        .lk-hb-btn.open .lk-hb-icon span:nth-child(3) { transform: translateY(-100%) rotate(45deg); }
        .lk-mask { overflow: hidden; height: 0; transition: height 0.3s ease; position: absolute; left: 0; top: 100%; width: 100%; }
        .lk-mask.open { height: calc(100vh - 100%); }
        @media (max-width: 780px) {
          .lk-hb { display: block; }
          .lk-nav-ul { flex-direction: column !important; align-items: flex-start !important; padding: 0 10vw; gap: 5vh !important; }
          .lk-nav-ul li a { font-size: 7vw; font-family: Manrope, sans-serif; }
          .lk-nav-ul .lk-btn { margin-top: 10vh; background: none; font-weight: 700;
            background: -webkit-linear-gradient(#E65F5C, #e33b5f);
            -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
          .lk-nav.mobileOpen .lk-nav-bg { opacity: 1 !important; height: 100vh !important; }
          .lk-nav-desktop { display: none !important; }
        }

        /* ── HERO ── */
        .lk-hero {
          width: 100%; position: relative;
          display: flex; flex-direction: column; justify-content: flex-end;
          padding: 0 5vw 10vh; gap: 10vh;
          padding-top: 60vh; margin-top: 100vh;
          transition: margin-top 1s cubic-bezier(0.76, 0, 0.24, 1);
          min-height: 100vh;
        }
        .lk-hero.active { margin-top: 0; }
        .lk-hero-text { display: flex; flex-direction: column; gap: 2vh; text-shadow: 0 0 10px rgba(0,0,0,0.5); }
        .lk-hero-text .tag { color: #fff !important; font-size: 1.5rem; letter-spacing: 0.3rem; }
        .lk-hero-text h1 { color: #fff !important; width: 85%; }
        @media (max-width: 1120px) { .lk-hero-text h1 { width: 100%; } }
        .lk-hero-video {
          position: absolute; top: 0; left: 0; width: 100%; height: 100%;
          z-index: -1; overflow: hidden; background-color: #000;
        }
        .lk-hero-video video { width: 100%; height: 100%; object-fit: cover; opacity: 0.8; }

        /* Animated word cycle */
        .lk-word {
          display: inline-block;
          background: linear-gradient(90deg, #E65F5C, #e33b5f);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          animation: wordCycle 6s infinite;
        }
        @keyframes wordCycle {
          0%,30%   { opacity: 1; transform: translateY(0); }
          35%      { opacity: 0; transform: translateY(-20px); }
          36%      { opacity: 0; transform: translateY(20px); }
          65%,95%  { opacity: 1; transform: translateY(0); }
          100%     { opacity: 1; }
        }

        /* ── COLOUR SPLIT ── */
        .lk-split { width: 100%; background-color: #f07969; height: 6vh; }

        /* ── DARK SECTIONS ── */
        .lk-dark { background-color: #141414; }

        /* ── ABOUT ── */
        .lk-about {
          background-color: #141414; padding: 20vh 8vw 0; display: flex;
          flex-direction: column; gap: 10vh; position: relative; overflow: hidden;
        }
        .lk-about-decorator {
          position: absolute; top: 20%; left: 0; white-space: nowrap;
          font-family: Humane, sans-serif; font-weight: 700;
          font-size: 48vw; line-height: 100%; color: transparent;
          -webkit-text-stroke: 2px rgba(255,255,255,0.07);
          pointer-events: none; user-select: none; text-transform: uppercase;
          z-index: 0;
        }
        .lk-about-title h2 { color: #fff; width: 75%; position: relative; z-index: 1; }
        @media (max-width: 1120px) { .lk-about-title h2 { width: 100%; } }
        .lk-about-flex { display: flex; flex-direction: row; margin-right: -8vw; position: relative; z-index: 1; }
        .lk-about-text { flex-basis: 30%; display: flex; flex-direction: column; gap: 4vh; }
        .lk-about-text p { color: #fff; line-height: 150%; width: 80%; }
        .lk-about-img { flex-basis: 60%; overflow: hidden; }
        .lk-about-img img { width: 100%; height: 80%; object-fit: cover; border-radius: 0.7rem; }
        @media (max-width: 1120px) {
          .lk-about-flex { flex-direction: column; margin-right: 0; gap: 5rem; }
          .lk-about-text p { width: 100%; }
        }

        /* ── USP ── */
        .lk-usp-section {
          background-color: #141414; padding: 20vh 8vw 0;
          display: flex; flex-direction: column; gap: 13vh;
        }
        .lk-usp-section > h2 { color: #fff; }
        .lk-usp-wrapper {
          display: flex; flex-direction: row; gap: 10vw; position: relative; padding-bottom: 10vh;
        }
        .lk-usp-decorator-col {
          position: relative; flex-basis: 30%;
          writing-mode: vertical-lr;
        }
        .lk-usp-decorator-text {
          font-family: Humane, sans-serif; font-weight: 700;
          font-size: 25vw; line-height: 70%; color: transparent;
          -webkit-text-stroke: 2px rgba(255,255,255,0.07);
          user-select: none; text-transform: uppercase;
        }
        .lk-usp-content { flex-basis: 70%; display: flex; flex-direction: column; gap: 10vh; color: #fff; }
        .lk-usp-item-header { padding: 0.5rem 0; border-bottom: 1px solid rgba(255,255,255,0.3); margin-bottom: 2.5rem; }
        .lk-usp-item-header h4 { color: #fff; }
        .lk-usp-item-body { width: 60%; }
        .lk-usp-item-body p { color: #fff; line-height: 150%; }
        @media (max-width: 1120px) {
          .lk-usp-decorator-col { display: none; }
          .lk-usp-content { flex-basis: 100%; }
          .lk-usp-item-body { width: 100%; }
        }

        /* ── CTA ── */
        .lk-cta { background-color: #f6f6f6; padding-top: 17vh; overflow: hidden; }
        .lk-cta-title { padding: 0 5vw; width: 70%; }
        @media (max-width: 1120px) { .lk-cta-title { width: 100%; } }
        .lk-cta-wrapper { padding: 10vh 5vw; display: flex; flex-direction: column; gap: 5vh; }
        .lk-cta-items { display: flex; flex-direction: row; gap: 5vw; justify-content: space-evenly; }
        @media (max-width: 1120px) { .lk-cta-items { flex-direction: column; gap: 5rem; } }
        .lk-cta-item { display: flex; flex-direction: column; gap: 3.5vh; flex: 1 1 0; }
        .lk-cta-item img { width: 100%; height: 40vh; border-radius: 0.4rem; object-fit: cover; margin-bottom: 3vh; }
        .lk-cta-item-info { display: flex; flex-direction: column; gap: 1vh; }
        .lk-cta-item p { line-height: 180%; }
        .lk-cta-center { display: flex; justify-content: center; }

        /* ── FOOTER ── */
        .lk-footer {
          background-color: #111; padding: 15vh 10vw 7vh;
          display: flex; flex-direction: column; gap: 10vh;
          border-bottom: 5px solid #f07969;
        }
        .lk-footer-top { display: flex; flex-direction: column; gap: 3vh; }
        .lk-footer-top h2 { color: #fff; }
        .lk-footer-top h2 .gradient {
          background: -webkit-linear-gradient(#E65F5C, #e33b5f);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }
        .lk-footer-links { display: flex; flex-direction: row; align-items: center; gap: 2rem; }
        .lk-footer-links img.linkedin { height: 2.2rem; transition: opacity 0.3s ease; }
        .lk-footer-links img.linkedin:hover { opacity: 0.8; }
        .lk-footer-links img.logo { height: 3rem; filter: invert(100%); }
        .lk-footer-links a { color: #fff; font-size: 1rem; font-family: Manrope, sans-serif; text-decoration: none; }
        .lk-footer-bottom { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #333; padding-top: 2vh; }
        .lk-footer-bottom p { color: #7e7e7e; font-size: 0.9rem; }
        .lk-footer-bottom ul { list-style: none; display: flex; gap: 1rem; }
        .lk-footer-bottom ul li { color: #fff; font-size: 0.9rem; }
        @media (max-width: 700px) { .lk-footer-bottom { flex-direction: column; gap: 2vh; } }

        /* ── SCROLL ANIMATIONS ── */
        .lk-reveal { opacity: 0; transform: translateY(40px); transition: opacity 0.9s ease, transform 0.9s cubic-bezier(0.16,1,0.3,1); }
        .lk-reveal.visible { opacity: 1; transform: translateY(0); }
        .lk-reveal-delay-1 { transition-delay: 0.1s; }
        .lk-reveal-delay-2 { transition-delay: 0.2s; }
        .lk-reveal-delay-3 { transition-delay: 0.35s; }
      `}</style>

      <div className="lk-root">
        {/* ── NAV ── */}
        <nav className={`lk-nav ${navActive ? 'active' : ''} ${navDark ? 'dark' : ''} ${navBg ? 'with-bg' : ''} ${mobileOpen ? 'mobileOpen' : ''}`}>
          <div className="lk-nav-bg" />
          <button className="lk-nav-logo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <img src="/site-assets/logo.svg" alt="1K Leaders" />
          </button>
          <div style={{ display: 'flex', flexDirection: 'row', position: 'relative' }}>
            {/* Hamburger */}
            <button className={`lk-hb-btn ${mobileOpen ? 'open' : ''}`} onClick={() => setMobileOpen(o => !o)}>
              <div className="lk-hb-icon"><span/><span/><span/></div>
            </button>
            {/* Mobile mask */}
            <div className={`lk-mask ${mobileOpen ? 'open' : ''}`}>
              <ul className="lk-nav-links lk-nav-ul">
                <li><a href="#what-we-do" onClick={() => setMobileOpen(false)}>What We Do</a></li>
                <li><a href="#what-we-offer" onClick={() => setMobileOpen(false)}>What We Offer</a></li>
                <li><a href="#join" onClick={() => setMobileOpen(false)}>Join Us</a></li>
                <li><a href="https://app.1kleaders.com" className="lk-btn">Get Started</a></li>
              </ul>
            </div>
            {/* Desktop */}
            <ul className="lk-nav-links lk-nav-desktop" style={{ display: 'flex' }}>
              <li><a href="#what-we-do">What We Do</a></li>
              <li><a href="#what-we-offer">What We Offer</a></li>
              <li><a href="#join">Join Us</a></li>
              <li><a href="https://app.1kleaders.com" className="lk-btn">Get Started</a></li>
            </ul>
          </div>
        </nav>

        {/* ── HERO ── */}
        <div ref={heroRef} className={`lk-hero ${landingActive ? 'active' : ''}`} id="what-we-do">
          <div className="lk-hero-video">
            <video autoPlay muted loop playsInline preload="auto">
              <source src="/site-assets/landing.mp4" type="video/mp4" />
            </video>
          </div>
          <div className="lk-hero-text">
            <p className="tag">1000 leaders</p>
            <h1 className="title">
              Not your typical venture builder<br />
              We <span className="lk-word" id="lk-cycling-word">Invent</span>
            </h1>
          </div>
        </div>

        {/* ── COLOUR SPLIT ── */}
        <div className="lk-split" />

        {/* ── ABOUT ── */}
        <section className="lk-about" id="what-we-offer">
          <div className="lk-about-decorator">1K Leaders</div>
          <div className="lk-about-title lk-reveal">
            <h2>Transforming ideas into scalable startups.</h2>
          </div>
          <div className="lk-about-flex">
            <div className="lk-about-text lk-reveal lk-reveal-delay-1">
              <p className="medium">Through dedicated regional expertise and advisory.</p>
              <p className="medium">Driven by collective professionals, leaders, advisors, and investors.</p>
            </div>
            <div className="lk-about-img lk-reveal lk-reveal-delay-2">
              <img src="/site-assets/about.jpg" alt="1K Leaders team" />
            </div>
          </div>
          <div className="lk-usp-section">
            <h2 className="lk-reveal">We are more than just a platform.</h2>
            <div className="lk-usp-wrapper">
              <div className="lk-usp-decorator-col">
                <span className="lk-usp-decorator-text">1KLeaders</span>
              </div>
              <div className="lk-usp-content">
                <p className="med lk-reveal" style={{ color: '#fff', fontSize: '1.17rem' }}>
                  We are a rocket ship for your entrepreneurial spirit, fueled by your vision and guided by our expertise.
                </p>
                <p className="tag lk-reveal" style={{ color: '#fff' }}>Benefit from our exclusive partnership program</p>
                {[
                  {
                    title: 'Embrace a holistic ecosystem',
                    body: 'We are committed to fostering an environment that nurtures growth and innovation. You will be able to connect with builders, entrepreneurs, professionals, advisors, and thought leaders across diverse industries and expertise levels. This dynamic network brings together doers and experts to thrive into an interconnected setting.',
                  },
                  {
                    title: 'Realize your potential while sustaining your career aspirations',
                    body: "We understand the importance of stability in the pursuit of excellence. Who says you can't have the best of both worlds? Our unique model allows you to keep your career engine running while fueling your dream machine. It's not about choosing one path—it's about paving a new one, parallel to the road you're already on.",
                  },
                  {
                    title: 'Capitalize on our dedicated advisory team',
                    body: 'Expert guidance is key to navigating the path to success. Our members gain access to expertly handpicked and perfectly synched seasoned professionals from various industries. Collaborate with advisors that are committed to providing personalized support, strategic insights, and the wisdom you need to overcome challenges and achieve your goals.',
                  },
                ].map((u, i) => (
                  <div key={i} className={`lk-reveal lk-reveal-delay-${i + 1}`}>
                    <div className="lk-usp-item-header"><h4>{u.title}</h4></div>
                    <div className="lk-usp-item-body"><p>{u.body}</p></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="lk-cta" id="join">
          <div className="lk-cta-title lk-reveal">
            <h2>Turn insights into outcomes and expertise into advancement.</h2>
          </div>
          <div className="lk-cta-wrapper">
            <div className="lk-cta-items">
              {[
                {
                  img:   '/site-assets/cta-1.jpg',
                  tag:   'passionate dreamers',
                  title: 'Co-Founders & Idea Owners',
                  body:  "Innovate, collaborate, co-found. If you are passionate about problem-solving or challenging the status quo with ideas big and small, join 1K Leaders as a co-founder, whether part-time or full-time and let us turn your ambition into action.",
                },
                {
                  img:   '/site-assets/cta-2.jpg',
                  tag:   'ambitious professionals',
                  title: 'Field Experts & Subject Matter Experts',
                  body:  'Share knowledge and expertise. If you are a passionate professional or seasoned expert, your insight and experience can guide, mentor, and inspire. Join 1K Leaders to lead transformation and ignite our network.',
                },
                {
                  img:   '/site-assets/cta-3.jpg',
                  tag:   'Future visionary',
                  title: 'Angel Investors & Venture Capitals',
                  body:  'Invest time and money. If you are enthusiastic about sharing wisdom and willing to dedicate your time, you can ignite measurable transformation and yield quantifiable returns. Join the 1K Leaders ecosystem to mentor, guide, and invest with us.',
                },
              ].map((c, i) => (
                <div key={i} className={`lk-cta-item lk-reveal lk-reveal-delay-${i + 1}`}>
                  <img src={c.img} alt={c.title} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1vh' }}>
                    <p className="tag" style={{ color: '#e33b5f', fontSize: '0.75rem' }}>{c.tag}</p>
                    <h4 style={{ fontSize: '1.4rem' }}>{c.title}</h4>
                  </div>
                  <p>{c.body}</p>
                </div>
              ))}
            </div>
            <div className="lk-cta-center">
              <a href="https://app.1kleaders.com" className="lk-btn">Join the Waitlist</a>
            </div>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer className="lk-footer">
          <div className="lk-footer-top">
            <h2>Invent, Build, <span className="gradient">Scale...</span></h2>
            <div className="lk-footer-links">
              <a href="https://www.linkedin.com/company/1kleaders/" target="_blank" rel="noopener noreferrer">
                <img className="linkedin" src="/site-assets/linkedin.png" alt="LinkedIn" />
              </a>
              <img className="logo" src="/site-assets/logo.svg" alt="1K Leaders" />
              <a href="mailto:info@1kleaders.com">info@1kleaders.com</a>
            </div>
          </div>
          <div className="lk-footer-bottom">
            <p>© 2026 - 1000 Leaders Holding Limited, All Rights Reserved</p>
            <ul><li>1K Leaders</li></ul>
          </div>
        </footer>
      </div>

      <ScrollReveal />
      <WordCycler />
    </>
  );
}

// Scroll reveal — watches .lk-reveal elements
function ScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.lk-reveal');
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } });
    }, { threshold: 0.15 });
    els.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);
  return null;
}

// Cycles the hero word: Invent → Build → Scale
function WordCycler() {
  const words = ['Invent', 'Build', 'Scale'];
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % words.length), 3000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    const el = document.getElementById('lk-cycling-word');
    if (el) el.textContent = words[idx];
  }, [idx]);
  return null;
}
