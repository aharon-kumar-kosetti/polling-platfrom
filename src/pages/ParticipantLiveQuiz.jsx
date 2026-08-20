import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import socketManager from '../sockets/socketManager';

const ParticipantLiveQuiz = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const username = searchParams.get('username') || localStorage.getItem('participant_name') || 'PixelCrafter';
  const pin = searchParams.get('pin') || 'TECH-88';

  const [timeLeft, setTimeLeft] = useState(20);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isLocked, setIsLocked] = useState(false);
  const [score, setScore] = useState(1450);
  const [streak, setStreak] = useState(3);

  const question = {
    id: 'q1',
    category: 'Design Systems',
    number: 3,
    total: 8,
    text: 'What is the primary purpose of negative space in UI layout design?',
    options: [
      { id: 'a', text: 'To reduce cognitive load and visual clutter', isCorrect: true },
      { id: 'b', text: 'To fill empty unallocated screen pixels', isCorrect: false },
      { id: 'c', text: 'To increase memory consumption in rendering', isCorrect: false },
      { id: 'd', text: 'To force users into one rigid click order', isCorrect: false },
    ]
  };

  // Circular timer calculation (circumference: 2 * pi * 40 = 251)
  const initialTime = 20;
  const strokeDashoffset = 251 - (251 * timeLeft) / initialTime;

  useEffect(() => {
    if (timeLeft <= 0) {
      handleTimeUp();
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const handleSelectOption = (optId) => {
    if (isLocked) return;
    setSelectedOption(optId);
    setIsLocked(true);

    socketManager.emit('submit_answer', {
      questionId: question.id,
      optionId: optId
    });

    // Short delay before showing result screen
    setTimeout(() => {
      const chosen = question.options.find(o => o.id === optId);
      const isCorrect = !!chosen?.isCorrect;
      navigate(`/result?correct=${isCorrect}&score=${score + (isCorrect ? 850 : 0)}&pin=${pin}&username=${encodeURIComponent(username)}`);
    }, 1500);
  };

  const handleTimeUp = () => {
    setIsLocked(true);
    setTimeout(() => {
      navigate(`/result?correct=false&score=${score}&pin=${pin}&username=${encodeURIComponent(username)}`);
    }, 1000);
  };

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
            <span>{question.category}</span>
            <span>•</span>
            <span>Question {question.number} of {question.total}</span>
          </div>
        </div>

        {/* Question Text */}
        <h1 className="font-headline-lg text-2xl md:text-4xl text-primary font-bold text-center mb-10 max-w-2xl leading-snug">
          {question.text}
        </h1>

        {/* 4 Interactive Answer Option Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-3xl">
          {question.options.map((opt) => {
            const isSelected = selectedOption === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => handleSelectOption(opt.id)}
                disabled={isLocked}
                className={`p-6 rounded-3xl text-left border transition-all duration-200 flex items-start gap-4 active:scale-[0.98] ${
                  isSelected 
                    ? 'bg-secondary-container text-on-secondary-container border-secondary shadow-lg ring-2 ring-secondary' 
                    : isLocked 
                    ? 'bg-surface-container-lowest opacity-50 border-outline-variant/30 cursor-not-allowed' 
                    : 'bg-surface-container-lowest hover:border-primary/40 border-outline-variant/40 shadow-sm hover:shadow-md hover:-translate-y-0.5'
                }`}
              >
                <div className={`w-9 h-9 rounded-2xl flex items-center justify-center font-bold text-xs uppercase shrink-0 ${
                  isSelected ? 'bg-secondary text-on-secondary' : 'bg-surface-container-high text-primary'
                }`}>
                  {opt.id}
                </div>
                <div className="flex-1 font-body-md text-base md:text-lg font-medium leading-tight">
                  {opt.text}
                </div>
              </button>
            );
          })}
        </div>

        {isLocked && (
          <div className="mt-8 flex items-center gap-2 text-xs font-label-md text-on-surface-variant animate-pulse">
            <span className="material-symbols-outlined text-sm">lock</span>
            <span>Answer locked in! Waiting for round results...</span>
          </div>
        )}

      </main>

      {/* Footer Branding */}
      <footer className="py-4 text-center text-xs text-outline font-label-md">
        QUIZCORE Live Interactive Session
      </footer>

    </div>
  );
};

export default ParticipantLiveQuiz;
