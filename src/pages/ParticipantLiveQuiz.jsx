import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, useParams, Link } from 'react-router-dom';
import socketManager from '../sockets/socketManager';

const ParticipantLiveQuiz = () => {
  const navigate = useNavigate();
  const { sessionId: paramSessionId } = useParams();
  const [searchParams] = useSearchParams();
  
  const username = searchParams.get('username') || localStorage.getItem('participant_name') || 'PixelCrafter';
  const pin = searchParams.get('pin') || localStorage.getItem('participant_pin') || 'TECH-88';
  const sessionId = paramSessionId || searchParams.get('sessionId') || localStorage.getItem('participant_sessionId') || pin;

  const [question, setQuestion] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [initialTime, setInitialTime] = useState(30);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isLocked, setIsLocked] = useState(false);
  const [score, setScore] = useState(parseInt(searchParams.get('score') || '0', 10));
  const [streak, setStreak] = useState(1);
  const currentQIdRef = useRef(null);

  // Connect and listen to question state
  useEffect(() => {
    const token = localStorage.getItem('participant_token');
    const targetRoom = sessionId || pin;
    
    socketManager.connect(token);
    
    if (targetRoom) {
      socketManager.emit('join_room', { sessionId: targetRoom, username });
    }
    
    const handleState = (data) => {
      if (data?.status === 'ended') {
        navigate(`/leaderboard?pin=${pin}&username=${encodeURIComponent(username)}&score=${score}`);
        return;
      }

      if (data?.currentQuestion) {
        const incoming = data.currentQuestion;
        // Only update if it's a new question or initial load
        if (!currentQIdRef.current || currentQIdRef.current !== incoming.id) {
          currentQIdRef.current = incoming.id;
          setSelectedOption(null);
          setIsLocked(false);
          const timeLimit = incoming.timeLimitSeconds || 30;
          setTimeLeft(timeLimit);
          setInitialTime(timeLimit);
          setQuestion(incoming);
        }
      }
    };

    socketManager.on('session_state_changed', handleState);
    return () => {
      socketManager.off('session_state_changed', handleState);
    };
  }, [navigate, pin, username, sessionId, score]);

  // Circular timer calculation (circumference: 2 * pi * 40 = 251)
  const strokeDashoffset = initialTime > 0 ? 251 - (251 * timeLeft) / initialTime : 0;

  useEffect(() => {
    if (!question || isLocked) return;
    
    if (timeLeft <= 0) {
      handleTimeUp();
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, question, isLocked]);

  const handleSelectOption = (optId) => {
    if (isLocked || !question) return;
    setSelectedOption(optId);
    setIsLocked(true);

    const gainedPoints = 850 + (timeLeft * 15);
    const newScore = score + gainedPoints;
    setScore(newScore);

    socketManager.emit('submit_answer', {
      questionId: question.id,
      optionId: optId,
      username
    });

    // Short delay before showing result screen
    setTimeout(() => {
      navigate(`/result?score=${newScore}&pin=${pin}&username=${encodeURIComponent(username)}&sessionId=${encodeURIComponent(sessionId)}`);
    }, 1200);
  };

  const handleTimeUp = () => {
    if (isLocked) return;
    setIsLocked(true);
    setTimeout(() => {
      navigate(`/result?correct=false&score=${score}&pin=${pin}&username=${encodeURIComponent(username)}&sessionId=${encodeURIComponent(sessionId)}`);
    }, 1000);
  };

  if (!question) {
    return (
      <div className="bg-background text-on-background min-h-screen flex flex-col items-center justify-between p-6">
        <header className="w-full max-w-4xl flex items-center justify-between py-4">
          <Link to="/" className="font-display-sm text-xl font-bold flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary">token</span>
            <span className="text-black">QuizCore</span>
          </Link>
          <div className="text-xs font-mono font-bold bg-surface-container px-3 py-1 rounded-full text-primary">
            PIN: {pin}
          </div>
        </header>

        <div className="text-center flex flex-col items-center gap-5 my-auto max-w-md">
          <div className="w-16 h-16 border-4 border-secondary border-t-transparent rounded-full animate-spin"></div>
          <h2 className="font-headline-lg text-2xl font-bold text-primary">Connected to Host Room</h2>
          <p className="font-body-md text-sm text-on-surface-variant">
            Waiting for the host to launch a live question. It will appear on your screen automatically!
          </p>
        </div>

        <footer className="py-4 text-xs text-on-surface-variant font-label-md">
          Player: <strong className="text-primary">{username}</strong>
        </footer>
      </div>
    );
  }

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col justify-between antialiased selection:bg-secondary-container selection:text-on-secondary-container relative overflow-hidden">
      
      {/* Background ambient blobs */}
      <div className="fixed top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-secondary-container/20 blur-3xl pointer-events-none -z-10"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-surface-variant/30 blur-3xl pointer-events-none -z-10"></div>

      {/* Top Participant Status Bar */}
      <header className="px-6 py-4 md:px-12 flex items-center justify-between z-10 border-b border-outline-variant/20 bg-surface-container-lowest/60 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container font-bold text-xs">
            {username.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-label-md text-xs font-bold text-primary">{username}</div>
            <div className="text-[10px] text-on-surface-variant flex items-center gap-1 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse"></span>
              PIN: {pin}
            </div>
          </div>
        </div>

        {/* Score & Streak */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-surface-container-high rounded-full text-xs font-bold">
            <span className="text-secondary">⚡</span>
            <span>{streak} Streak</span>
          </div>
          <div className="font-display-sm text-lg md:text-xl font-bold text-primary font-mono">
            {score} pts
          </div>
        </div>
      </header>

      {/* Main Question Arena */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-6 md:py-10 flex flex-col justify-center items-center z-10">
        
        {/* Progress & Circular Countdown Timer */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative w-24 h-24 flex items-center justify-center mb-3">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="40"
                className="stroke-surface-container-highest"
                strokeWidth="6"
                fill="transparent"
              />
              <circle
                cx="50"
                cy="50"
                r="40"
                className={`transition-all duration-1000 ${timeLeft <= 5 ? 'stroke-error' : 'stroke-secondary'}`}
                strokeWidth="6"
                strokeDasharray="251"
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>
            <span className={`absolute font-display-sm text-2xl font-bold font-mono ${timeLeft <= 5 ? 'text-error animate-ping' : 'text-primary'}`}>
              {timeLeft}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs font-label-md text-on-surface-variant uppercase tracking-wider">
            <span>{question.type ? question.type.replace('_', ' ') : 'Live Question'}</span>
          </div>
        </div>

        {/* Question Text & Image */}
        <div className="flex flex-col items-center gap-4 mb-10 text-center w-full">
          <h1 className="font-headline-lg text-2xl md:text-4xl text-primary font-bold max-w-2xl leading-snug">
            {question.text}
          </h1>
          {question.imageUrl && (
            <img src={question.imageUrl} alt="Question" className="max-h-48 object-contain rounded-2xl border border-outline-variant/30 bg-surface-container-low" />
          )}
        </div>

        {/* 4 Interactive Answer Option Grid */}
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
          {(question.options || []).map((opt, idx) => {
            const isSelected = selectedOption === (opt.id || opt.text) || selectedOption === opt.id;
            const choiceId = opt.id || opt.text;
            
            return (
              <button
                key={idx}
                onClick={() => handleSelectOption(choiceId)}
                disabled={isLocked}
                className={`relative p-5 rounded-3xl border-2 transition-all flex items-center gap-4 group overflow-hidden ${
                  isSelected 
                    ? 'border-primary bg-primary-container text-on-primary-container shadow-md scale-[0.98]' 
                    : isLocked
                      ? 'border-outline-variant/30 bg-surface-container-lowest opacity-60'
                      : 'border-outline-variant/40 bg-surface-container-lowest hover:border-primary hover:shadow-lg active:scale-95'
                }`}
              >
                {/* Checkmark overlay for selected */}
                {isSelected && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-primary text-on-primary flex items-center justify-center animate-fadeIn">
                    <span className="material-symbols-outlined text-[16px]">check</span>
                  </div>
                )}
                
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm uppercase shrink-0 transition-colors ${
                  isSelected ? 'bg-primary text-on-primary' : 'bg-surface-container-highest text-primary group-hover:bg-primary group-hover:text-on-primary'
                }`}>
                  {String.fromCharCode(97 + idx)}
                </div>
                
                <div className="flex flex-1 flex-col sm:flex-row sm:items-center justify-between text-left gap-2">
                  <span className={`font-bold text-lg leading-tight pr-6 ${
                    isSelected ? 'text-primary' : 'text-primary group-hover:text-primary'
                  }`}>
                    {opt.text}
                  </span>
                  {opt.imageUrl && (
                    <img src={opt.imageUrl} alt="Option" className="h-12 w-12 object-cover rounded-lg shrink-0 border border-outline-variant/40" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default ParticipantLiveQuiz;
