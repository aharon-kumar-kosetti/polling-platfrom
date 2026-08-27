import React from 'react';
import { Link } from 'react-router-dom';
import { buttonClasses } from '../components/ui/Button';
import hostLoginBg from '../assets/host-login-bg.jpg';

const LandingPage = () => {
  return (
    <div className="bg-surface text-on-surface font-body-md h-[calc(100vh-80px)] overflow-hidden flex flex-col antialiased selection:bg-secondary-container selection:text-on-secondary-container">
      {/* Main Content Canvas */}
      <main className="flex-grow flex flex-col justify-center relative overflow-hidden">
        {/* Background Ambient Blobs */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none opacity-40">
          <div className="absolute top-[-10%] right-[-5%] w-[40vw] h-[40vw] rounded-full bg-secondary-container blur-3xl opacity-30 mix-blend-multiply"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-surface-variant blur-3xl opacity-50 mix-blend-multiply"></div>
        </div>

        <div className="max-w-7xl mx-auto w-full px-container-padding md:px-[48px] lg:px-[64px] py-8 flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-section-gap h-full">
          {/* Left Text Content */}
          <div className="w-full lg:w-1/2 flex flex-col gap-6 lg:gap-8 relative z-10 items-center lg:items-start animate-slideUp">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-on-surface/10 bg-surface-container-lowest paper-border shadow-sm self-center lg:self-start">
              <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
              <span className="font-label-md text-label-md text-on-surface-variant select-none">V 2.0 Now Live</span>
            </div>

            <h1 className="font-display-lg text-display-lg lg:text-display-sm xl:text-display-lg text-center lg:text-left select-none">
              Engage your audience with <span className="text-secondary">QuizCore</span>
            </h1>
            <p className="font-body-lg text-body-lg text-center lg:text-left max-w-lg">
              Create interactive sessions, live polls, and real-time quizzes to make your presentations unforgettable.
            </p>

            {/* Action Buttons — canonical button definitions */}
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto mt-2 self-center lg:self-start">
              <Link to="/login" className={buttonClasses('primary', 'lg', 'w-full sm:w-auto')}>
                <span className="material-symbols-outlined text-[20px]">podium</span>
                Host a Session
              </Link>
              <Link to="/join" className={buttonClasses('outline', 'lg', 'w-full sm:w-auto')}>
                Join a Session
                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
              </Link>
            </div>
          </div>

          {/* Right Visual Composition (Editorial / Zine Style) */}
          <div className="w-full lg:w-1/2 relative hidden lg:flex min-h-[400px] lg:min-h-0 lg:h-full max-h-[640px] items-center justify-center animate-slideUp" style={{ animationDelay: '120ms' }}>
            {/* Main Image Card */}
            <div className="relative w-[85%] max-w-[460px] aspect-[4/5] max-h-full rounded-[24px] overflow-hidden paper-border soft-shadow bg-surface-container-lowest z-10 transform rotate-1 transition-transform hover:rotate-0 duration-500 scale-95">
              <div className="w-full h-full bg-cover bg-center" style={{backgroundImage: `url(${hostLoginBg})`}}></div>

              {/* Glassmorphism Overlay Element */}
              <div className="absolute bottom-6 left-6 right-6 p-4 rounded-xl backdrop-blur-xl bg-surface-container-lowest/70 border border-surface-container-lowest/50 shadow-sm flex items-center justify-between">
                <div>
                  <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1 select-none">Current Session</p>
                  <p className="font-label-md text-label-md text-primary select-none">Design Thinking Workshop</p>
                </div>
                <div className="flex items-center gap-1 bg-surface rounded-full px-3 py-1 shadow-sm select-none">
                  <span className="material-symbols-outlined text-[14px] text-error icon-fill">fiber_manual_record</span>
                  <span className="font-label-sm text-label-sm text-primary">LIVE</span>
                </div>
              </div>
            </div>

            {/* Floating Accent Tags */}
            <div className="absolute top-12 left-0 z-20 transform -rotate-6 animate-float">
              <div className="bg-secondary-container text-on-secondary-container px-5 py-2 rounded-full font-label-md text-label-md shadow-lg border border-secondary/20 flex items-center gap-2 select-none">
                <span className="material-symbols-outlined text-[18px]">bar_chart</span>
                LIVE POLLS
              </div>
            </div>
            <div className="absolute bottom-24 right-[-4%] z-20 transform rotate-3 animate-float" style={{ animationDelay: '1.2s' }}>
              <div className="bg-primary text-on-primary px-5 py-2 rounded-full font-label-md text-label-md shadow-lg flex items-center gap-2 select-none">
                <span className="material-symbols-outlined text-[18px]">quiz</span>
                INTERACTIVE QUIZZES
              </div>
            </div>

            <div className="absolute top-1/2 right-0 z-0 transform translate-x-1/4 -translate-y-1/2 w-48 h-48 bg-surface-variant rounded-full opacity-50 mix-blend-multiply blur-2xl"></div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LandingPage;
