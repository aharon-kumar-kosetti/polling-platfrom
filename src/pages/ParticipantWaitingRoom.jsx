import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import socketManager from '../sockets/socketManager';

const facts = [
  'The concept of a "grid system" in graphic design was popularized by Swiss designers in the 1950s, forming the basis of modern UI layouts.',
  'Negative space, or "white space," isn\'t just empty—it actively guides the user\'s eye and reduces cognitive load by up to 20%.',
  'The aesthetic-usability effect describes how users often perceive more visually appealing designs as intuitively easier to use.'
];

const ParticipantWaitingRoom = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const pin = searchParams.get('pin') || 'TECH-88';
  const username = searchParams.get('username') || localStorage.getItem('participant_name') || 'PixelCrafter';

  const [currentFact, setCurrentFact] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentFact((prev) => (prev + 1) % facts.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // Listen to socket state change
  useEffect(() => {
    socketManager.connect();
    
    const handleState = (data) => {
      if (data?.status === 'active' || data?.currentQuestion) {
        navigate(`/play?pin=${pin}&username=${encodeURIComponent(username)}`);
      }
    };

    socketManager.on('session_state_changed', handleState);
    return () => {
      socketManager.off('session_state_changed', handleState);
    };
  }, [navigate, pin, username]);

  const handleManualStart = () => {
    navigate(`/play?pin=${pin}&username=${encodeURIComponent(username)}`);
  };

  return (
    <div className="bg-surface text-on-surface font-body-md antialiased min-h-screen flex flex-col justify-between selection:bg-secondary-container selection:text-on-secondary-container relative overflow-hidden p-6 md:p-12">
      
      {/* Decorative Ambient Layers */}
      <div className="fixed -top-32 -left-32 w-[600px] h-[600px] bg-surface-container-high rounded-full blur-3xl opacity-40 pointer-events-none -z-10"></div>
      <div className="fixed top-1/2 -right-64 w-[800px] h-[800px] bg-secondary-container/20 rounded-full blur-3xl opacity-30 pointer-events-none -z-10"></div>

      {/* Header */}
      <header className="max-w-4xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-4 z-10">
        <Link to="/" className="font-display-sm text-2xl font-bold text-primary flex items-center gap-2">
          <span className="material-symbols-outlined text-secondary">token</span>
          QUIZCORE
        </Link>

        <div className="inline-flex items-center gap-3 bg-surface-container-lowest border border-outline-variant/30 px-5 py-2 rounded-full shadow-sm">
          <div className="w-7 h-7 rounded-full bg-secondary-container flex items-center justify-center text-xs font-bold text-on-secondary-container">
            {username.charAt(0).toUpperCase()}
          </div>
          <div className="flex items-center gap-2">
            <span className="font-label-md text-xs text-primary font-bold">{username}</span>
            <span className="text-[10px] text-on-surface-variant font-mono uppercase bg-surface-container px-2 py-0.5 rounded-full">PIN: {pin}</span>
          </div>
        </div>
      </header>

      {/* Middle Section: The Active Waiting State */}
      <main className="max-w-xl mx-auto w-full flex flex-col items-center justify-center my-8 text-center z-10">
        
        {/* Pulsating Visual Anchor */}
        <div className="relative w-40 h-40 md:w-48 md:h-48 flex items-center justify-center mb-8">
          <div className="absolute inset-0 bg-secondary-container/60 rounded-full animate-ping opacity-30" style={{ animationDuration: '3s' }}></div>
          <div className="relative z-10 w-28 h-28 md:w-32 md:h-32 bg-surface-container-lowest rounded-full shadow-editorial border border-outline-variant/30 flex items-center justify-center">
            <span className="material-symbols-outlined text-secondary text-5xl animate-pulse">hourglass_top</span>
          </div>
        </div>

        <h1 className="font-headline-lg text-2xl md:text-3xl text-primary font-bold mb-2">
          Waiting for host to start...
        </h1>
        <p className="font-body-md text-sm text-on-surface-variant max-w-md mb-8">
          Settle in! The session will automatically launch as soon as the organizer pushes the first question.
        </p>

        {/* Quick manual start / demo test action */}
        <button
          onClick={handleManualStart}
          className="px-6 py-3 rounded-full bg-primary text-on-primary font-label-md text-xs hover:bg-primary-container transition-all flex items-center gap-2 shadow-sm"
        >
          <span>Enter Live Quiz Preview</span>
          <span className="material-symbols-outlined text-sm">arrow_forward</span>
        </button>

      </main>

      {/* Bottom Fun Fact Carousel */}
      <footer className="max-w-xl mx-auto w-full z-10">
        <div className="bg-surface-container-lowest rounded-3xl p-6 border border-outline-variant/30 shadow-editorial relative">
          <div className="absolute -top-3 left-6 bg-primary text-on-primary px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
            Did you know?
          </div>
          <div className="min-h-[60px] flex items-center justify-center pt-2">
            <p className="text-xs font-body-md text-on-surface transition-opacity duration-300">
              {facts[currentFact]}
            </p>
          </div>
          <div className="flex justify-center gap-1.5 mt-3">
            {facts.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentFact(i)}
                className={`h-1.5 rounded-full transition-all ${
                  currentFact === i ? 'w-4 bg-primary' : 'w-1.5 bg-outline-variant'
                }`}
              />
            ))}
          </div>
        </div>
      </footer>

    </div>
  );
};

export default ParticipantWaitingRoom;
