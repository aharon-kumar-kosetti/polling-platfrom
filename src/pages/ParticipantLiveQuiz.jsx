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
  const [revealedInfo, setRevealedInfo] = useState(null);
  const [score, setScore] = useState(parseInt(searchParams.get('score') || '0', 10));
  const [rank, setRank] = useState(null);
  const [negativeMarking, setNegativeMarking] = useState(false);
  const currentQIdRef = useRef(null);

  // Connect and listen to question state & answer reveals
  useEffect(() => {
    const token = localStorage.getItem('participant_token');
    
    socketManager.connect(token);
    socketManager.emit('join_room', { sessionId, pin, username });
    
    const handleState = (data) => {
      if (data?.status === 'ended') {
        navigate(`/leaderboard?pin=${pin}&username=${encodeURIComponent(username)}&score=${score}`);
        return;
      }

      if (data?.currentQuestion) {
        const incoming = data.currentQuestion;
        // Check if new question
        if (!currentQIdRef.current || currentQIdRef.current !== incoming.id) {
          currentQIdRef.current = incoming.id;
          setSelectedOption(null);
          setIsLocked(false);
          setRevealedInfo(null);
          const timeLimit = incoming.timeLimitSeconds || 30;
          setTimeLeft(timeLimit);
          setInitialTime(timeLimit);
          setQuestion(incoming);
        }
      } else if (!data?.currentQuestion && data?.status !== 'active') {
        // No active question currently
        setQuestion(null);
      }
    };

    const handleAnswerRevealed = (data) => {
      console.log('[Socket] Answer revealed by host:', data);
      setRevealedInfo(data);
      if (data?.negativeMarking !== undefined) {
        setNegativeMarking(data.negativeMarking);
      }

      // Update current player's score from leaderboard if present
      if (Array.isArray(data?.leaderboard)) {
        const myEntry = data.leaderboard.find(p => p.username === username || p.id === socketManager.getSocket()?.id);
        if (myEntry) {
          setScore(myEntry.score);
          setRank(myEntry.rank);
        }
      }
    };

    const handleLeaderboard = (data) => {
      if (Array.isArray(data?.rankings)) {
        const myEntry = data.rankings.find(p => p.username === username || p.id === socketManager.getSocket()?.id);
        if (myEntry) {
          setScore(myEntry.score);
          setRank(myEntry.rank);
        }
      }
    };

    const handleSettings = (data) => {
      if (data?.negativeMarking !== undefined) {
        setNegativeMarking(data.negativeMarking);
      }
    };

    socketManager.on('session_state_changed', handleState);
    socketManager.on('answer_revealed', handleAnswerRevealed);
    socketManager.on('leaderboard_updated', handleLeaderboard);
    socketManager.on('settings_updated', handleSettings);

    return () => {
      socketManager.off('session_state_changed', handleState);
      socketManager.off('answer_revealed', handleAnswerRevealed);
      socketManager.off('leaderboard_updated', handleLeaderboard);
      socketManager.off('settings_updated', handleSettings);
    };
  }, [navigate, pin, username, sessionId, score]);

  // Circular timer calculation
  const strokeDashoffset = initialTime > 0 ? 251 - (251 * timeLeft) / initialTime : 0;

  useEffect(() => {
    if (!question || isLocked || revealedInfo) return;
    
    if (timeLeft <= 0) {
      handleTimeUp();
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, question, isLocked, revealedInfo]);

  const handleSelectOption = (optId) => {
    if (isLocked || !question || revealedInfo) return;
    setSelectedOption(optId);
    setIsLocked(true);

    socketManager.emit('submit_answer', {
      questionId: question.id,
      optionId: optId,
      username,
      sessionId,
      pin
    });
  };

  const handleTimeUp = () => {
    if (isLocked) return;
    setIsLocked(true);
  };

  // 1. NO ACTIVE QUESTION SCREEN: Tell user to wait for host to launch next question
  if (!question) {
    return (
      <div className="bg-background text-on-background min-h-screen flex flex-col items-center justify-between p-6 antialiased">
        <header className="w-full max-w-4xl flex items-center justify-between py-4 border-b border-outline-variant/20">
          <Link to="/" className="font-display-sm text-xl font-bold flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary">token</span>
            <span className="text-black">QuizCore</span>
          </Link>
          <div className="flex items-center gap-2">
            <div className="text-xs font-mono font-bold bg-surface-container-high px-3 py-1 rounded-full text-primary">
              PIN: {pin}
            </div>
            <div className="text-xs font-mono font-bold bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full">
              {score} pts
            </div>
          </div>
        </header>

        <div className="text-center flex flex-col items-center gap-6 my-auto max-w-md p-8 bg-surface-container-lowest rounded-3xl border border-outline-variant/30 shadow-editorial animate-fadeIn">
          <div className="w-20 h-20 rounded-full bg-secondary-container/40 flex items-center justify-center text-secondary relative">
            <span className="material-symbols-outlined text-3xl animate-bounce">hourglass_top</span>
            <span className="absolute w-full h-full rounded-full border-2 border-secondary border-t-transparent animate-spin"></span>
          </div>

          <div>
            <span className="inline-block text-[11px] font-label-md uppercase tracking-wider text-secondary font-bold bg-secondary-container/40 px-3 py-1 rounded-full mb-2">
              Waiting for Host
            </span>
            <h2 className="font-headline-lg text-2xl font-bold text-primary mb-2">
              Get Ready for the Next Question!
            </h2>
            <p className="font-body-md text-sm text-on-surface-variant leading-relaxed">
              The host will launch the next question shortly. It will appear on your screen automatically!
            </p>
          </div>

          <div className="w-full pt-4 border-t border-outline-variant/20 flex items-center justify-between text-xs font-label-md text-on-surface-variant">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-bold text-[10px]">
                {username.charAt(0).toUpperCase()}
              </div>
              <span className="font-bold text-primary">{username} (You)</span>
            </div>
            {rank && <span className="font-bold text-secondary">Rank #{rank}</span>}
          </div>
        </div>

        <footer className="py-4 text-xs text-on-surface-variant font-label-md text-center">
          Connected live to session PIN: <strong className="text-primary font-mono">{pin}</strong>
        </footer>
      </div>
    );
  }

  // 2. LIVE QUESTION ARENA
  const isCorrectChoice = revealedInfo && selectedOption && (
    selectedOption === revealedInfo.correctOptionId ||
    String(selectedOption).toLowerCase() === String(revealedInfo.correctOptionId).toLowerCase()
  );

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col justify-between antialiased selection:bg-secondary-container selection:text-on-secondary-container relative overflow-hidden">
      
      {/* Background ambient blobs */}
      <div className="fixed top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-secondary-container/20 blur-3xl pointer-events-none -z-10"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-surface-variant/30 blur-3xl pointer-events-none -z-10"></div>

      {/* Top Participant Status Bar */}
      <header className="px-6 py-4 md:px-12 flex items-center justify-between z-10 border-b border-outline-variant/20 bg-surface-container-lowest/70 backdrop-blur-md">
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

        {/* Score & Ranking */}
        <div className="flex items-center gap-3">
          {rank && (
            <div className="flex items-center gap-1 px-3 py-1 bg-surface-container-high rounded-full text-xs font-bold text-primary">
              <span>🏆</span>
              <span>#{rank}</span>
            </div>
          )}
          <div className="flex items-center gap-1 px-3 py-1 bg-surface-container-high rounded-full text-xs font-bold font-mono text-primary">
            <span>{score} pts</span>
          </div>
        </div>
      </header>

      {/* Main Question Arena */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-6 md:py-8 flex flex-col justify-center items-center z-10">
        
        {/* Progress & Circular Countdown Timer */}
        <div className="flex flex-col items-center mb-6">
          {!revealedInfo ? (
            <div className="relative w-20 h-20 flex items-center justify-center mb-2">
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
              <span className={`absolute font-display-sm text-xl font-bold font-mono ${timeLeft <= 5 ? 'text-error animate-ping' : 'text-primary'}`}>
                {timeLeft}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-4 py-1.5 bg-secondary text-on-secondary rounded-full font-label-md text-xs font-bold shadow-md mb-3 animate-fadeIn">
              <span className="material-symbols-outlined text-sm">visibility</span>
              <span>Host Revealed Answer</span>
            </div>
          )}

          <div className="flex items-center gap-2 text-xs font-label-md text-on-surface-variant uppercase tracking-wider">
            <span>{question.type ? question.type.replace('_', ' ') : 'Live Question'}</span>
            <span>•</span>
            <span className="text-secondary font-bold">+2 Correct {negativeMarking ? '/ -1 Wrong' : ''}</span>
          </div>
        </div>

        {/* Question Text & Image */}
        <div className="flex flex-col items-center gap-4 mb-8 text-center w-full">
          <h1 className="font-headline-lg text-xl md:text-3xl text-primary font-bold max-w-2xl leading-snug">
            {question.text}
          </h1>
          {question.imageUrl && (
            <img src={question.imageUrl} alt="Question" className="max-h-44 object-contain rounded-2xl border border-outline-variant/30 bg-surface-container-low" />
          )}
        </div>

        {/* 4 Interactive Answer Option Grid */}
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-3.5 mb-6">
          {(question.options || []).map((opt, idx) => {
            const choiceId = opt.id || opt.text;
            const isSelected = selectedOption === choiceId || selectedOption === opt.id || selectedOption === opt.text;
            
            // Correctness styling after answer reveal
            const isThisOptionCorrect = revealedInfo && (
              opt.isCorrect ||
              choiceId === revealedInfo.correctOptionId ||
              String(choiceId).toLowerCase() === String(revealedInfo.correctOptionId).toLowerCase()
            );

            let cardStyle = 'border-outline-variant/40 bg-surface-container-lowest hover:border-primary';
            
            if (revealedInfo) {
              if (isThisOptionCorrect) {
                cardStyle = 'border-secondary bg-secondary-container/30 text-on-secondary-container ring-2 ring-secondary shadow-lg';
              } else if (isSelected && !isThisOptionCorrect) {
                cardStyle = 'border-error bg-error/10 text-error ring-2 ring-error shadow-lg';
              } else {
                cardStyle = 'border-outline-variant/20 bg-surface-container-lowest opacity-40';
              }
            } else if (isSelected) {
              cardStyle = 'border-primary bg-primary-container text-on-primary-container shadow-md scale-[0.98] ring-2 ring-primary';
            } else if (isLocked) {
              cardStyle = 'border-outline-variant/30 bg-surface-container-lowest opacity-60 cursor-not-allowed';
            }

            return (
              <button
                key={idx}
                onClick={() => handleSelectOption(choiceId)}
                disabled={isLocked || !!revealedInfo}
                className={`relative p-4 md:p-5 rounded-3xl border-2 transition-all flex items-center gap-4 group overflow-hidden text-left ${cardStyle}`}
              >
                {/* Visual badge icon */}
                {revealedInfo ? (
                  isThisOptionCorrect ? (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-secondary text-on-secondary flex items-center justify-center animate-fadeIn shadow-md">
                      <span className="material-symbols-outlined text-[18px]">check</span>
                    </div>
                  ) : isSelected ? (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-error text-on-error flex items-center justify-center animate-fadeIn shadow-md">
                      <span className="material-symbols-outlined text-[18px]">close</span>
                    </div>
                  ) : null
                ) : isSelected ? (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-primary text-on-primary flex items-center justify-center animate-fadeIn">
                    <span className="material-symbols-outlined text-[16px]">lock</span>
                  </div>
                ) : null}
                
                <div className={`w-9 h-9 rounded-2xl flex items-center justify-center font-bold text-xs uppercase shrink-0 transition-colors ${
                  revealedInfo && isThisOptionCorrect 
                    ? 'bg-secondary text-on-secondary' 
                    : revealedInfo && isSelected && !isThisOptionCorrect
                      ? 'bg-error text-on-error'
                      : isSelected 
                        ? 'bg-primary text-on-primary' 
                        : 'bg-surface-container-highest text-primary'
                }`}>
                  {String.fromCharCode(97 + idx)}
                </div>
                
                <div className="flex flex-1 flex-col sm:flex-row sm:items-center justify-between text-left gap-1 pr-8">
                  <div>
                    <span className="font-bold text-base md:text-lg leading-tight text-primary">
                      {opt.text}
                    </span>
                    {revealedInfo && isThisOptionCorrect && (
                      <div className="text-[11px] font-bold text-secondary mt-0.5">
                        ✓ Correct Answer (+2 Marks)
                      </div>
                    )}
                    {revealedInfo && isSelected && !isThisOptionCorrect && (
                      <div className="text-[11px] font-bold text-error mt-0.5">
                        ✗ Your Pick ({negativeMarking ? '-1 Mark' : '0 Marks'})
                      </div>
                    )}
                  </div>
                  {opt.imageUrl && (
                    <img src={opt.imageUrl} alt="Option" className="h-10 w-10 object-cover rounded-lg shrink-0 border border-outline-variant/40" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Lock / Result Feedback Bar */}
        <div className="w-full max-w-xl text-center">
          {revealedInfo ? (
            <div className={`p-4 rounded-2xl border text-sm font-bold flex flex-col items-center gap-1.5 animate-fadeIn shadow-sm ${
              isCorrectChoice 
                ? 'bg-secondary-container/40 border-secondary text-secondary' 
                : selectedOption 
                  ? 'bg-error/10 border-error/40 text-error'
                  : 'bg-surface-container-high border-outline-variant/40 text-primary'
            }`}>
              <div className="flex items-center gap-2 text-base">
                <span className="material-symbols-outlined">
                  {isCorrectChoice ? 'celebration' : selectedOption ? 'sentiment_dissatisfied' : 'info'}
                </span>
                <span>
                  {isCorrectChoice 
                    ? 'Awesome! You got +2 Marks!' 
                    : selectedOption 
                      ? (negativeMarking ? 'Wrong answer (-1 Mark deducted).' : 'Wrong answer (0 Marks gained).')
                      : 'Time is up! You did not answer.'}
                </span>
              </div>
              <span className="text-xs text-on-surface-variant font-normal">
                Waiting for host to push the next question...
              </span>
            </div>
          ) : isLocked ? (
            <div className="p-3.5 bg-surface-container-low rounded-2xl border border-outline-variant/40 text-xs font-bold text-primary flex items-center justify-center gap-2 animate-fadeIn">
              <span className="material-symbols-outlined text-secondary text-sm">lock</span>
              <span>Answer Locked! Waiting for host to reveal results or launch next question.</span>
            </div>
          ) : (
            <div className="text-xs text-on-surface-variant font-label-md">
              Tap an option above to lock in your answer
            </div>
          )}
        </div>

      </main>
    </div>
  );
};

export default ParticipantLiveQuiz;
