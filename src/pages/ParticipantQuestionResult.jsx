import React, { useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import socketManager from '../sockets/socketManager';

const ParticipantQuestionResult = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const isCorrect = searchParams.get('correct') !== 'false';
  const score = searchParams.get('score') || '0';
  const pin = searchParams.get('pin') || localStorage.getItem('participant_pin') || 'TECH-88';
  const username = searchParams.get('username') || localStorage.getItem('participant_name') || 'PixelCrafter';
  const sessionId = searchParams.get('sessionId') || localStorage.getItem('participant_sessionId') || pin;

  // Listen for host pushing next question or ending quiz
  useEffect(() => {
    const token = localStorage.getItem('participant_token');
    const targetRoom = sessionId || pin;
    
    socketManager.connect(token);
    socketManager.emit('join_room', { sessionId, pin, username });

    const handleState = (data) => {
      if (data?.status === 'ended') {
        navigate(`/leaderboard?pin=${pin}&username=${encodeURIComponent(username)}&score=${score}`);
        return;
      }
      if (data?.currentQuestion) {
        navigate(`/play?pin=${pin}&username=${encodeURIComponent(username)}&score=${score}&sessionId=${encodeURIComponent(targetRoom)}`);
      }
    };

    socketManager.on('session_state_changed', handleState);
    return () => {
      socketManager.off('session_state_changed', handleState);
    };
  }, [navigate, pin, username, sessionId, score]);

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col justify-between items-center antialiased selection:bg-secondary-container selection:text-on-secondary-container p-6 relative overflow-hidden">
      
      {/* Decorative Ambient Blobs */}
      <div className={`fixed top-1/4 -left-20 w-96 h-96 rounded-full blur-[100px] pointer-events-none -z-10 ${
        isCorrect ? 'bg-secondary-container/30' : 'bg-error-container/20'
      }`}></div>

      {/* Top Participant Mini Bar */}
      <header className="w-full max-w-lg flex items-center justify-between py-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center font-bold text-xs">
            {username.charAt(0).toUpperCase()}
          </div>
          <span className="font-label-md text-xs font-bold">{username}</span>
        </div>
        <div className="font-mono text-xs text-on-surface-variant font-bold">
          ROOM: {pin}
        </div>
      </header>

      {/* Main Feedback Card */}
      <main className="w-full max-w-lg bg-surface-container-lowest rounded-3xl p-8 md:p-10 border border-outline-variant/30 shadow-editorial text-center relative z-10 animate-fadeIn my-auto">
        
        {/* Status Icon */}
        <div className={`w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center shadow-md ${
          isCorrect 
            ? 'bg-secondary-container text-on-secondary-container border-2 border-secondary' 
            : 'bg-error-container text-on-error-container border-2 border-error'
        }`}>
          <span className="material-symbols-outlined text-4xl">
            {isCorrect ? 'check' : 'close'}
          </span>
        </div>

        {/* Status Headline */}
        <h1 className="font-display-lg text-3xl md:text-4xl font-bold text-primary mb-2">
          {isCorrect ? 'Answer Recorded!' : 'Time Up!'}
        </h1>
        <p className="font-body-md text-sm text-on-surface-variant mb-8">
          {isCorrect 
            ? 'Your response was submitted to the live host deck.' 
            : 'Get ready for the next round!'}
        </p>

        {/* Score & Multiplier Block */}
        <div className="bg-surface-container-low rounded-2xl p-6 mb-8 border border-outline-variant/30">
          <div className="text-xs uppercase tracking-widest font-label-md text-on-surface-variant font-bold mb-1">
            Current Score
          </div>
          <div className="font-display-sm text-4xl font-extrabold text-primary font-mono mb-3">
            {score} <span className="text-sm font-normal text-on-surface-variant">pts</span>
          </div>

          <div className="flex justify-center gap-4 text-xs font-label-md">
            <span className="px-3 py-1 bg-surface-container-highest rounded-full text-secondary font-bold">
              {isCorrect ? '+850 Base' : '+0 pts'}
            </span>
            {isCorrect && (
              <span className="px-3 py-1 bg-secondary-container text-on-secondary-container rounded-full font-bold">
                + Speed Bonus
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-on-surface-variant py-2 mb-4 bg-surface-container-high rounded-full">
          <span className="w-2 h-2 rounded-full bg-secondary animate-ping"></span>
          <span>Waiting for host to push the next question...</span>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <Link
            to={`/leaderboard?pin=${pin}&username=${encodeURIComponent(username)}&score=${score}`}
            className="w-full py-3.5 rounded-full bg-primary text-on-primary font-label-md text-sm hover:bg-primary-container transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            <span>View Leaderboard</span>
            <span className="material-symbols-outlined text-sm">leaderboard</span>
          </Link>

          <button
            onClick={() => navigate(`/play?pin=${pin}&username=${encodeURIComponent(username)}&score=${score}&sessionId=${encodeURIComponent(sessionId)}`)}
            className="w-full py-3 rounded-full border border-outline-variant/60 font-label-md text-sm hover:bg-surface-container transition-colors"
          >
            Go to Live Arena &rarr;
          </button>
        </div>

      </main>

      <footer className="py-4 text-center text-xs text-outline font-label-md">
        <span className="text-black font-bold">QuizCore</span> • Round complete
      </footer>

    </div>
  );
};

export default ParticipantQuestionResult;
