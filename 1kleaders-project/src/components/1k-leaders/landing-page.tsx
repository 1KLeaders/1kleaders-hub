'use client';
import { Button } from '@/components/ui/button';
import { ArrowRight, Users, Lightbulb, Handshake, TrendingUp, Shield, Globe, Rocket } from 'lucide-react';
import type { Page } from './types';

interface Props { navigate: (page: Page) => void; }

export default function LandingPage({ navigate }: Props) {
  return (
    <div className="min-h-screen flex flex-col" style={{ fontFamily: 'var(--font-manrope), Manrope, sans-serif' }}>
      {/* Navbar */}
      <nav className="fixed top-0 left-0 w-full z-50 transition-all duration-500" id="main-nav">
        <div className="px-[5vw] py-[7vh] flex items-center justify-between transition-all duration-500" id="nav-inner">
          <button className="h-[4.2rem] bg-transparent border-none cursor-pointer" onClick={() => navigate('landing')}>
            <img src="/logo-dark.png" alt="1KLeaders" className="h-full transition-all duration-300 object-contain" />
          </button>
          <div className="hidden md:flex items-center gap-10">
            <a href="#about" className="text-[#222] font-medium no-underline relative hover:after:content-[''] hover:after:absolute hover:after:bottom-[-1px] hover:after:left-0 hover:after:w-full hover:after:h-[2px] hover:after:bg-[#555353] transition-colors" style={{ fontFamily: 'var(--font-rethink-sans), Rethink Sans, sans-serif' }}>What We Do</a>
            <a href="#offer" className="text-[#222] font-medium no-underline relative hover:after:content-[''] hover:after:absolute hover:after:bottom-[-1px] hover:after:left-0 hover:after:w-full hover:after:h-[2px] hover:after:bg-[#555353] transition-colors" style={{ fontFamily: 'var(--font-rethink-sans), Rethink Sans, sans-serif' }}>What We Offer</a>
            <a href="#cta" className="text-[#222] font-medium no-underline relative hover:after:content-[''] hover:after:absolute hover:after:bottom-[-1px] hover:after:left-0 hover:after:w-full hover:after:h-[2px] hover:after:bg-[#555353] transition-colors" style={{ fontFamily: 'var(--font-rethink-sans), Rethink Sans, sans-serif' }}>Join Us</a>
            <button onClick={() => navigate('login')} className="text-[#222] font-medium bg-transparent border-none cursor-pointer hover:text-[#e33b5f] transition-colors" style={{ fontFamily: 'var(--font-rethink-sans), Rethink Sans, sans-serif' }}>
              Sign In
            </button>
            <button onClick={() => navigate('waitlist')} className="bg-gradient-to-r from-[#e33b5f] to-[#E65F5C] text-white px-[1.7rem] py-[0.8rem] rounded-[0.3rem] font-bold border-none cursor-pointer inline-flex items-center gap-2 hover:opacity-90 transition-opacity" style={{ fontFamily: 'var(--font-rethink-sans), Rethink Sans, sans-serif' }}>
              Get Started <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <div className="md:hidden flex items-center gap-3">
            <button className="text-[#222] font-medium bg-transparent border-none cursor-pointer text-sm" onClick={() => navigate('login')}>Sign In</button>
            <button className="bg-gradient-to-r from-[#e33b5f] to-[#E65F5C] text-white px-4 py-2 rounded font-bold border-none cursor-pointer" onClick={() => navigate('waitlist')}>Join</button>
          </div>
        </div>
      </nav>

      {/* Hero - Full screen with video background */}
      <section className="relative min-h-screen flex flex-col justify-end pb-[10vh] pt-[60vh]">
        <div className="absolute inset-0 bg-black z-[-1]">
          <div className="w-full h-full bg-gradient-to-br from-[#141414] via-[#1a1a1a] to-[#0a0a0a] opacity-90" />
        </div>
        <div className="px-[5vw]">
          <div className="flex flex-col gap-[2vh]" style={{ textShadow: '0px 0px 10px rgba(0,0,0,0.5)' }}>
            <p className="text-white text-[1.5rem] tracking-[0.3rem] uppercase" style={{ fontFamily: 'var(--font-manrope), Manrope, sans-serif' }}>1000 leaders</p>
            <h1 className="text-white text-[4.1rem] md:text-[5rem] font-bold leading-tight w-[85%]" style={{ fontFamily: 'var(--font-rethink-sans), Rethink Sans, sans-serif' }}>
              Not your typical venture builder<br />
              We <span className="bg-gradient-to-r from-[#E65F5C] to-[#e33b5f] bg-clip-text text-transparent">Invent</span>
            </h1>
          </div>
        </div>
      </section>

      {/* Coloured Split Bar */}
      <div className="w-full bg-[#f07969] h-[6vh]" />

      {/* About / What We Do */}
      <section id="about" className="bg-[#141414] px-[8vw] pt-[20vh] pb-[10vh]">
        <div className="relative overflow-hidden">
          {/* Decorator */}
          <div className="absolute top-[20%] left-0 w-full text-center pointer-events-none select-none uppercase whitespace-nowrap z-[-1]" style={{ fontFamily: 'Humane, sans-serif', fontWeight: 700, color: 'transparent', WebkitTextStrokeColor: 'rgba(255,255,255,0.07)', WebkitTextStrokeWidth: '2px', fontSize: '48vw', lineHeight: '100%' }}>
            1K Leaders
          </div>

          <div className="mb-[10vh]">
            <h2 className="text-white text-[3.4rem] tracking-[-1px] font-bold w-[75%]" style={{ fontFamily: 'var(--font-rethink-sans), Rethink Sans, sans-serif' }}>
              Transforming ideas into scalable startups.
            </h2>
          </div>

          <div className="flex flex-col lg:flex-row mr-[-8vw] gap-16 lg:gap-0">
            <div className="lg:basis-[30%]">
              <div className="flex flex-col gap-[4vh] text-white">
                <p className="text-[1.17rem] leading-[150%] lg:w-[80%]" style={{ fontFamily: 'var(--font-manrope), Manrope, sans-serif' }}>Through dedicated regional expertise and advisory.</p>
                <p className="text-[1.17rem] leading-[150%] lg:w-[80%]" style={{ fontFamily: 'var(--font-manrope), Manrope, sans-serif' }}>Driven by collective professionals, leaders, advisors, and investors.</p>
              </div>
            </div>
            <div className="lg:basis-[60%] overflow-hidden">
              <img src="https://1kleaders.com/_app/immutable/assets/about.e36c9797.jpg" alt="About 1K Leaders" className="w-full h-[80%] object-cover rounded-[0.7rem]" />
            </div>
          </div>
        </div>
      </section>

      {/* What We Offer / USP */}
      <section id="offer" className="bg-[#141414] flex flex-col gap-[13vh] px-[8vw] pt-[20vh]">
        <h2 className="text-white text-[3.4rem] tracking-[-1px] font-bold" style={{ fontFamily: 'var(--font-rethink-sans), Rethink Sans, sans-serif' }}>
          We are more than just a platform.
        </h2>

        <div className="flex flex-col lg:flex-row gap-[10vw] w-full relative pb-[10vh]">
          {/* Vertical Decorator */}
          <div className="hidden lg:block relative lg:basis-[30%]">
            <div className="whitespace-nowrap" style={{ writingMode: 'vertical-lr' }}>
              <span style={{ fontFamily: 'Humane, sans-serif', fontWeight: 700, color: 'transparent', WebkitTextStrokeColor: 'rgba(255,255,255,0.07)', WebkitTextStrokeWidth: '2px', fontSize: '25vw', lineHeight: '70%' }}>1KLeaders</span>
            </div>
          </div>

          <div className="flex flex-col gap-[10vh] lg:basis-[70%] text-white">
            <p className="text-[1.17rem] leading-[150%]" style={{ fontFamily: 'var(--font-manrope), Manrope, sans-serif' }}>We are a rocket ship for your entrepreneurial spirit, fueled by your vision and guided by our expertise.</p>
            <p className="uppercase tracking-[0.15rem] text-sm" style={{ fontFamily: 'var(--font-manrope), Manrope, sans-serif' }}>Benefit from our exclusive partnership program</p>

            {[
              {
                title: 'Embrace a holistic ecosystem',
                content: 'We are committed to fostering an environment that nurtures growth and innovation. You will be able to connect with builders, entrepreneurs, professionals, advisors, and thought leaders across diverse industries and expertise levels. This dynamic network brings together doers and experts to thrive into an interconnected setting.'
              },
              {
                title: 'Realize your potential while sustaining your career aspirations',
                content: 'We understand the importance of stability in the pursuit of excellence. Who says you can\'t have the best of both worlds? Our unique model allows you to keep your career engine running while fueling your dream machine. It\'s not about choosing one path—it\'s about paving a new one, parallel to the road you\'re already on.'
              },
              {
                title: 'Capitalize on our dedicated advisory team',
                content: 'Expert guidance is key to navigating the path to success. Our members gain access to expertly handpicked and perfectly synched seasoned professionals from various industries. Collaborate with advisors that are committed to providing personalized support, strategic insights, and the wisdom you need to overcome challenges and achieve your goals.'
              },
            ].map((usp) => (
              <div key={usp.title} className="group">
                <div className="py-2 border-b border-white/30 mb-10">
                  <h4 className="text-[2.2rem] font-bold" style={{ fontFamily: 'var(--font-rethink-sans), Rethink Sans, sans-serif' }}>{usp.title}</h4>
                </div>
                <div className="lg:w-[60%]">
                  <p className="leading-[150%]" style={{ fontFamily: 'var(--font-manrope), Manrope, sans-serif' }}>{usp.content}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section - Join as */}
      <section id="cta" className="flex flex-col overflow-hidden pt-[17vh] bg-[#f6f6f6]">
        <div className="px-[5vw] w-full lg:w-[70%] box-border mb-10">
          <h2 className="text-[#222] text-[3.4rem] tracking-[-1px] font-bold" style={{ fontFamily: 'var(--font-rethink-sans), Rethink Sans, sans-serif' }}>
            Turn insights into outcomes and expertise into advancement.
          </h2>
        </div>

        <div className="w-full px-[5vw] py-[10vh] box-border flex flex-col gap-[5vh]">
          <div className="w-full gap-[5vw] flex flex-col lg:flex-row justify-evenly">
            {[
              {
                img: 'https://1kleaders.com/_app/immutable/assets/cta-1.823953b9.jpg',
                tag: 'passionate dreamers',
                title: 'Co-Founders & Idea Owners',
                desc: 'Innovate, collaborate, co-found. If you are passionate about problem-solving or challenging the status quo with ideas big and small, join 1K Leaders as a co-founder, whether part-time or full-time and let us turn your ambition into action.',
                action: 'idea-owner-login' as Page
              },
              {
                img: 'https://1kleaders.com/_app/immutable/assets/cta-2.c59c7df4.jpg',
                tag: 'ambitious professionals',
                title: 'Field Experts & Subject Matter Experts',
                desc: 'Share knowledge and expertise. If you are a passionate professional or seasoned expert, your insight and experience can guide, mentor, and inspire. Join 1K Leaders to lead transformation and ignite our network.',
                action: 'partner-login' as Page
              },
              {
                img: 'https://1kleaders.com/_app/immutable/assets/cta-3.6e413efe.jpg',
                tag: 'future visionary',
                title: 'Angel Investors & Venture Capitals',
                desc: 'Invest time and money. If you are enthusiastic about sharing wisdom and willing to dedicate your time, you can ignite measurable transformation and yield quantifiable returns. Join the 1K Leaders ecosystem to mentor, guide, and invest with us.',
                action: 'partner-login' as Page
              },
            ].map((cta) => (
              <div key={cta.title} className="flex flex-col justify-between gap-[3.5vh] flex-1 min-w-0 cursor-pointer group" onClick={() => navigate(cta.action)}>
                <div>
                  <img src={cta.img} alt={cta.title} className="w-full h-[40vh] rounded-[0.4rem] object-cover mb-[3vh] group-hover:scale-[1.02] transition-transform duration-300" />
                  <div className="flex flex-col gap-[1vh]">
                    <p className="uppercase tracking-[0.15rem] text-sm text-[#555353]" style={{ fontFamily: 'var(--font-manrope), Manrope, sans-serif' }}>{cta.tag}</p>
                    <h4 className="text-[2.2rem] font-bold text-[#222]" style={{ fontFamily: 'var(--font-rethink-sans), Rethink Sans, sans-serif' }}>{cta.title}</h4>
                  </div>
                </div>
                <p className="leading-[180%] text-[#222]" style={{ fontFamily: 'var(--font-manrope), Manrope, sans-serif' }}>{cta.desc}</p>
              </div>
            ))}
          </div>

          <div className="flex justify-center">
            <button onClick={() => navigate('waitlist')} className="bg-gradient-to-r from-[#e33b5f] to-[#E65F5C] text-white px-[1.7rem] py-[0.8rem] rounded-[0.3rem] font-bold border-none cursor-pointer inline-flex items-center gap-2 hover:opacity-90 transition-opacity" style={{ fontFamily: 'var(--font-rethink-sans), Rethink Sans, sans-serif' }}>
              Join the Waitlist <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="flex flex-col bg-[#111] w-full box-border px-[10vw] pt-[15vh] pb-[7vh] gap-[10vh] border-b-[5px] border-[#f07969]">
        <div className="flex flex-col gap-[3vh] justify-start">
          <h2 className="text-white text-[3.4rem] tracking-[-1px] font-bold" style={{ fontFamily: 'var(--font-rethink-sans), Rethink Sans, sans-serif' }}>
            Invent, Build, <span className="bg-gradient-to-r from-[#E65F5C] to-[#e33b5f] bg-clip-text text-transparent">Scale...</span>
          </h2>
          <div className="flex flex-row items-center gap-8">
            <a href="https://www.linkedin.com/company/1kleaders/" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
              <img src="https://1kleaders.com/_app/immutable/assets/linkedin.5df475a4.png" alt="LinkedIn" className="h-[2.2rem]" />
            </a>
            <img src="/logo-light.png" alt="1KLeaders Logo" className="h-[3rem] object-contain" />
            <a href="mailto:info@1kleaders.com" className="text-white uppercase tracking-[0.15rem] text-sm no-underline hover:opacity-80 transition-opacity" style={{ fontFamily: 'var(--font-manrope), Manrope, sans-serif' }}>info@1kleaders.com</a>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row justify-between border-t border-[#333333] pt-[2vh]">
          <p className="text-[#7e7e7e] text-[0.9rem]" style={{ fontFamily: 'var(--font-manrope), Manrope, sans-serif' }}>&copy; 2026 - 1000 Leaders Holding Limited, All Rights Reserved</p>
          <ul className="list-none flex flex-row gap-4">
            <li className="text-white text-[0.9rem]" style={{ fontFamily: 'var(--font-manrope), Manrope, sans-serif' }}>1K Leaders</li>
          </ul>
        </div>
      </footer>
    </div>
  );
}
