import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import socketManager from '../sockets/socketManager';

const facts = [
  'The concept of a "grid system" in graphic design was popularized by Swiss designers in the 1950s, forming the basis of modern UI layouts.',
  'Negative space, or "white space," isn\'t just empty—it actively guides the user\'s eye and reduces cognitive load by up to 20%.',
  'The aesthetic-usability effect describes how users often perceive more visually appealing designs as intuitively easier to use.',
  'Gamified learning and live quiz competition can boost retention rates by up to 40% compared to passive listening.'
];

const ParticipantWaitingRoom = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const pin = searchParams.get('pin') || sessionStorage.getItem('participant_pin') || localStorage.getItem('participant_pin') || '';
  
  let rawUsername = searchParams.get('username') || sessionStorage.getItem('participant_name') || localStorage.getItem('participant_name') || '';
  if (rawUsername === 'PixelCrafter') {
    localStorage.removeItem('participant_name');
    sessionStorage.removeItem('participant_name');
    rawUsername = '';
  }
  const username = rawUsername || 'Player';
  const sessionId = searchParams.get('sessionId') || sessionStorage.getItem('participant_sessionId') || localStorage.getItem('participant_sessionId');
  const participantId = searchParams.get('participantId') || sessionStorage.getItem('participant_id') || `p_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  const [currentFact, setCurrentFact] = useState(0);
  const [playerCount, setPlayerCount] = useState(1);
  const [roomPlayers, setRoomPlayers] = useState([]);

  useEffect(() => {
    sessionStorage.setItem('participant_id', participantId);
  }, [participantId]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentFact((prev) => (prev + 1) % facts.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // Listen to socket state change
  useEffect(() => {
    const token = sessionStorage.getItem('participant_token') || localStorage.getItem('participant_token');
    const targetRoom = sessionId || pin;
    
    socketManager.connect(token);
    
    socketManager.emit('join_room', { sessionId, pin, username, participantId });
    
    const handleState = (data) => {
      if (data?.status === 'active' || data?.currentQuestion) {
        navigate(`/play?pin=${pin}&username=${encodeURIComponent(username)}&participantId=${encodeURIComponent(participantId)}&sessionId=${encodeURIComponent(targetRoom)}`);
      }
    };

    const handleParticipants = (list) => {
      if (Array.isArray(list)) {
        setRoomPlayers(list);
        setPlayerCount(list.length);
      }
    };

    const handleJoined = (data) => {
      if (data?.totalCount) {
        setPlayerCount(data.totalCount);
      }
    };

    socketManager.on('session_state_changed', handleState);
    socketManager.on('participants_updated', handleParticipants);
    socketManager.on('participant_joined', handleJoined);

    return () => {
      socketManager.off('session_state_changed', handleState);
      socketManager.off('participants_updated', handleParticipants);
      socketManager.off('participant_joined', handleJoined);
    };
  }, [navigate, pin, username, sessionId]);

  return (
    <div className="bg-surface text-on-surface font-body-md antialiased h-[100dvh] overflow-hidden flex flex-col justify-between selection:bg-secondary-container selection:text-on-secondary-container relative overflow-hidden pt-safe pb-safe px-safe p-4 md:p-12">

      {/* Decorative Ambient Layers */}
      <div className="fixed -top-32 -left-32 w-[600px] h-[600px] bg-surface-container-high rounded-full blur-3xl opacity-40 pointer-events-none -z-10"></div>
      <div className="fixed top-1/2 -right-64 w-[800px] h-[800px] bg-secondary-container/20 rounded-full blur-3xl opacity-30 pointer-events-none -z-10"></div>

      {/* Header */}
      <header className="max-w-4xl mx-auto w-full shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3 z-10">
        <Link to="/" className="font-display-sm text-xl sm:text-2xl font-bold text-primary flex items-center gap-2 select-none cursor-pointer">
          <span className="material-symbols-outlined text-secondary">token</span><span className="text-primary">QuizCore</span>
        </Link>

        <div className="inline-flex items-center gap-3 bg-surface-container-lowest border border-outline-variant/30 px-4 py-1.5 rounded-full shadow-sm">
          <div className="w-6 h-6 rounded-full bg-secondary-container flex items-center justify-center text-[11px] font-bold text-on-secondary-container shrink-0">
            {username.charAt(0).toUpperCase()}
          </div>
          <div className="flex items-center gap-2">
            <span className="font-label-md text-xs text-primary font-bold">{username}</span>
            <span className="text-[10px] text-on-surface-variant font-mono uppercase bg-surface-container px-2 py-0.5 rounded-full">PIN: {pin}</span>
          </div>
        </div>
      </header>

      {/* Middle Section: The Active Waiting State — compact & centered */}
      <main className="max-w-xl mx-auto w-full flex flex-col items-center justify-center my-3 text-center z-10 min-h-0">
        
        {/* Pulsating Visual Anchor */}
        <div className="relative w-24 h-24 sm:w-32 sm:h-32 md:w-36 md:h-36 flex items-center justify-center mb-4 shrink-0">
          <div className="absolute inset-0 bg-secondary-container/60 rounded-full animate-ping opacity-30" style={{ animationDuration: '3s' }}></div>
          <div className="relative z-10 w-16 h-16 sm:w-24 sm:h-24 md:w-28 md:h-28 bg-surface-container-lowest rounded-full shadow-editorial border border-outline-variant/30 flex items-center justify-center">
            <span className="material-symbols-outlined text-secondary text-3xl sm:text-4xl md:text-5xl animate-pulse">hourglass_top</span>
          </div>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary-container/50 text-on-secondary-container text-[11px] sm:text-xs font-bold font-label-md mb-2.5 border border-secondary/20">
          <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
          <span>{playerCount} {playerCount === 1 ? 'player' : 'players'} connected</span>
        </div>

        <h1 className="font-headline-lg text-lg sm:text-2xl md:text-3xl text-primary font-bold mb-1.5">
          You're in! Waiting for host to start...
        </h1>
        <p className="font-body-md text-xs sm:text-sm text-on-surface-variant max-w-md mb-3">
          Questions will appear automatically the moment the host launches them.
        </p>

        {/* Mini player avatars row */}
        {roomPlayers.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-1.5 max-w-md mb-2">
            {roomPlayers.slice(0, 8).map((p, idx) => (
              <span 
                key={p.id || idx}
                className={`text-[11px] sm:text-xs px-2.5 py-1 rounded-full border shadow-sm font-label-md ${
                  p.username === username 
                    ? 'bg-secondary text-on-secondary border-secondary font-bold' 
                    : 'bg-surface-container-lowest border-outline-variant/40 text-primary'
                }`}
              >
                {p.username} {p.username === username && '(You)'}
              </span>
            ))}
            {roomPlayers.length > 8 && (
              <span className="text-xs text-on-surface-variant px-2">+{roomPlayers.length - 8} more</span>
            )}
          </div>
        )}

      </main>

      {/* Bottom Fun Fact Carousel */}
      <footer className="max-w-xl mx-auto w-full shrink-0 z-10">
        <div className="bg-surface-container-lowest rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-outline-variant/30 shadow-editorial relative">
          <div className="absolute -top-2.5 left-5 bg-primary text-on-primary px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-wider select-none">
            Did you know?
          </div>
          <div className="min-h-[48px] sm:min-h-[56px] flex items-center justify-center pt-1.5">
            <p key={currentFact} className="text-[11px] sm:text-xs font-body-md text-on-surface animate-fadeIn transition-opacity duration-300">
              {facts[currentFact]}
            </p>
          </div>
          <div className="flex justify-center gap-1.5 mt-2">
            {facts.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentFact(i)}
                aria-label={`Show fact ${i + 1}`}
                className={`h-2 sm:h-2.5 rounded-full transition-all duration-300 press-effect ${
                  currentFact === i ? 'w-5 sm:w-6 bg-primary' : 'w-2 sm:w-2.5 bg-outline-variant hover:bg-outline'
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
