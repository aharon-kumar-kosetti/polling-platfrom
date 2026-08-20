import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import socketManager from '../sockets/socketManager';

const LiveMonitoring = () => {
  const { sessionId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const pin = searchParams.get('pin') || 'TECH-88';
  const sessionTitle = searchParams.get('title') || 'Interactive Quiz Masterclass';

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(25);
  const [isTimerRunning, setIsTimerRunning] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);

  const questions = [
    {
      id: 'q1',
      text: 'What is the primary purpose of negative space in UI design?',
      options: [
        { id: 'a', text: 'To reduce cognitive load and visual clutter', count: 18, isCorrect: true },
        { id: 'b', text: 'To fill empty unused pixels', count: 2, isCorrect: false },
        { id: 'c', text: 'To make the layout look larger than it is', count: 4, isCorrect: false },
        { id: 'd', text: 'To satisfy strict CSS flexbox constraints', count: 1, isCorrect: false },
      ]
    },
    {
      id: 'q2',
      text: 'Which color palette approach creates the most impactful editorial visual hierarchy?',
      options: [
        { id: 'a', text: 'Monochrome with high-contrast electric secondary accents', count: 21, isCorrect: true },
        { id: 'b', text: 'Plain unstyled default browser blue', count: 1, isCorrect: false },
        { id: 'c', text: 'Low-contrast grey on grey', count: 3, isCorrect: false },
      ]
    }
  ];

  const currentQ = questions[currentQuestionIndex] || questions[0];
  const totalResponses = currentQ.options.reduce((acc, opt) => acc + opt.count, 0);

  // Timer countdown
  useEffect(() => {
    let interval = null;
    if (isTimerRunning && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timeLeft]);

  // Handle host broadcasting next question via sockets
  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);
      setTimeLeft(30);
      setIsTimerRunning(true);

      socketManager.emit('organizer:next_question', {
        sessionId: sessionId || 'sess_1',
        question: questions[nextIndex]
      });
    } else {
      // End of quiz -> Go to leaderboard
      navigate(`/leaderboard?pin=${pin}&title=${encodeURIComponent(sessionTitle)}`);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(pin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col antialiased selection:bg-secondary-container selection:text-on-secondary-container">
      
      {/* Top Host Command Bar */}
      <header className="h-20 bg-surface-container-lowest border-b border-outline-variant/30 px-6 md:px-12 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="w-10 h-10 rounded-full hover:bg-surface-variant flex items-center justify-center text-on-surface-variant transition-colors">
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-secondary animate-ping"></span>
              <span className="text-[11px] font-label-md uppercase tracking-wider text-secondary font-bold">LIVE HOST DECK</span>
            </div>
            <h1 className="font-display-sm text-lg md:text-xl font-bold text-primary truncate max-w-md">{sessionTitle}</h1>
          </div>
        </div>

        {/* PIN Badge & QR Trigger */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-surface-container-high px-4 py-1.5 rounded-full border border-outline-variant/40">
            <span className="text-xs text-on-surface-variant font-label-md">JOIN PIN:</span>
            <span className="font-mono font-extrabold text-sm text-primary tracking-wider">{pin}</span>
            <button onClick={handleCopy} className="text-xs text-primary hover:underline ml-1">
              {copied ? '✓' : <span className="material-symbols-outlined text-xs">content_copy</span>}
            </button>
          </div>

          <button 
            onClick={() => setShowQRModal(true)}
            className="px-3.5 py-1.5 rounded-full border border-outline-variant/50 text-xs font-label-md hover:bg-surface-variant flex items-center gap-1 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">qr_code_2</span>
            Share QR
          </button>

          <button 
            onClick={() => navigate(`/analytics?title=${encodeURIComponent(sessionTitle)}`)}
            className="px-4 py-1.5 rounded-full bg-error/10 text-error hover:bg-error hover:text-on-error transition-colors text-xs font-label-md"
          >
            End Session
          </button>
        </div>
      </header>

      {/* Main Host View */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8 md:py-12 flex flex-col gap-8">
        
        {/* Metric Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/30 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-label-md text-on-surface-variant uppercase tracking-wider">Connected Players</span>
              <div className="font-display-sm text-3xl font-bold text-primary mt-1">28</div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-secondary-container/50 text-on-secondary-container flex items-center justify-center">
              <span className="material-symbols-outlined">group</span>
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/30 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-label-md text-on-surface-variant uppercase tracking-wider">Answers Submitted</span>
              <div className="font-display-sm text-3xl font-bold text-primary mt-1">{totalResponses} / 28</div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-surface-container-highest text-primary flex items-center justify-center">
              <span className="material-symbols-outlined">how_to_reg</span>
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/30 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-label-md text-on-surface-variant uppercase tracking-wider">Timer Remaining</span>
              <div className={`font-display-sm text-3xl font-bold mt-1 ${timeLeft <= 5 ? 'text-error animate-pulse' : 'text-primary'}`}>
                {timeLeft}s
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-surface-container-highest text-primary flex items-center justify-center">
              <span className="material-symbols-outlined">timer</span>
            </div>
          </div>
        </div>

        {/* Live Question Presentation Deck */}
        <div className="bg-surface-container-lowest rounded-3xl p-8 md:p-10 border border-outline-variant/30 shadow-editorial">
          
          <div className="flex justify-between items-center mb-6">
            <span className="px-3.5 py-1 bg-surface-container-high rounded-full font-label-sm text-xs font-bold uppercase tracking-wider">
              Question {currentQuestionIndex + 1} of {questions.length}
            </span>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsTimerRunning(!isTimerRunning)} 
                className="px-3 py-1 rounded-lg border border-outline-variant/50 text-xs font-label-md hover:bg-surface-container"
              >
                {isTimerRunning ? 'Pause Timer' : 'Resume Timer'}
              </button>
            </div>
          </div>

          <h2 className="font-headline-lg text-2xl md:text-3xl text-primary font-bold mb-8">
            {currentQ.text}
          </h2>

          {/* Response Bars / Option Breakdown */}
          <div className="flex flex-col gap-4 mb-8">
            {currentQ.options.map((opt) => {
              const percentage = totalResponses > 0 ? Math.round((opt.count / totalResponses) * 100) : 0;
              return (
                <div 
                  key={opt.id}
                  className={`p-4 rounded-2xl border transition-all relative overflow-hidden ${
                    opt.isCorrect 
                      ? 'border-secondary/60 bg-secondary-container/10' 
                      : 'border-outline-variant/40 bg-surface-container-low'
                  }`}
                >
                  {/* Progress Fill Indicator */}
                  <div 
                    className={`absolute left-0 top-0 bottom-0 opacity-20 transition-all duration-500 ${
                      opt.isCorrect ? 'bg-secondary' : 'bg-outline-variant'
                    }`}
                    style={{ width: `${percentage}%` }}
                  ></div>

                  <div className="relative z-10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs uppercase ${
                        opt.isCorrect ? 'bg-secondary text-on-secondary' : 'bg-surface-container-highest text-primary'
                      }`}>
                        {opt.id}
                      </span>
                      <span className="font-medium text-primary text-sm md:text-base">{opt.text}</span>
                    </div>

                    <div className="flex items-center gap-3 font-mono">
                      <span className="text-xs font-bold text-on-surface-variant">{opt.count} votes</span>
                      <span className="font-bold text-sm text-primary">{percentage}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Controller Actions */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t border-outline-variant/20">
            <Link
              to={`/leaderboard?pin=${pin}&title=${encodeURIComponent(sessionTitle)}`}
              className="px-6 py-3 rounded-full border border-outline-variant/60 font-label-md text-sm hover:bg-surface-container transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">leaderboard</span>
              View Live Podium
            </Link>

            <button
              onClick={handleNextQuestion}
              className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-primary text-on-primary font-label-md text-sm hover:bg-primary-container transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
            >
              <span>{currentQuestionIndex < questions.length - 1 ? 'Push Next Question' : 'Finish & Show Final Leaderboard'}</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </div>

        </div>

      </main>

      {/* QR Code Share Modal */}
      {showQRModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-3xl p-8 max-w-sm w-full text-center border border-outline-variant/30 shadow-2xl relative animate-fadeIn">
            <button 
              onClick={() => setShowQRModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-surface-container text-on-surface-variant"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
            <h3 className="font-display-sm text-xl font-bold text-primary mb-1">Scan to Join</h3>
            <p className="text-xs text-on-surface-variant mb-6">Direct players to join instantly on mobile</p>

            <div className="w-48 h-48 bg-surface-container rounded-2xl mx-auto flex items-center justify-center border border-outline-variant/40 shadow-inner mb-6">
              <span className="material-symbols-outlined text-6xl text-primary">qr_code_2</span>
            </div>

            <div className="bg-surface-container-high rounded-xl p-3 mb-6 font-mono text-2xl font-bold tracking-widest text-primary">
              {pin}
            </div>

            <button 
              onClick={() => setShowQRModal(false)}
              className="w-full py-2.5 rounded-full bg-primary text-on-primary text-xs font-label-md"
            >
              Done
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default LiveMonitoring;
