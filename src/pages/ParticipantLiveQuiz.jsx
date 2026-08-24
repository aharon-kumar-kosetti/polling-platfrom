import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, useParams, Link } from 'react-router-dom';
import socketManager from '../sockets/socketManager';

const ParticipantLiveQuiz = () => {
  const navigate = useNavigate();
  const { sessionId: paramSessionId } = useParams();
  const [searchParams] = useSearchParams();
  
  const pin = searchParams.get('pin') || sessionStorage.getItem('participant_pin') || localStorage.getItem('participant_pin') || '';
  
  let rawUsername = searchParams.get('username') || sessionStorage.getItem('participant_name') || localStorage.getItem('participant_name') || '';
  if (rawUsername === 'PixelCrafter') {
    localStorage.removeItem('participant_name');
    sessionStorage.removeItem('participant_name');
    rawUsername = '';
  }
  const username = rawUsername || 'Player';
  const sessionId = paramSessionId || searchParams.get('sessionId') || sessionStorage.getItem('participant_sessionId') || localStorage.getItem('participant_sessionId') || pin;
  const participantId = searchParams.get('participantId') || sessionStorage.getItem('participant_id') || `p_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  const [question, setQuestion] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [initialTime, setInitialTime] = useState(30);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isLocked, setIsLocked] = useState(false);
  const [revealedInfo, setRevealedInfo] = useState(null);
  const [responders, setResponders] = useState({ top3: [], others: [], totalAnswered: 0 });
  
  // Independent tab-isolated score initialization
  const [score, setScore] = useState(() => {
    const saved = sessionStorage.getItem('participant_score');
    if (saved !== null && !isNaN(parseInt(saved, 10))) {
      return parseInt(saved, 10);
    }
    return parseInt(searchParams.get('score') || '0', 10);
  });

  const [rank, setRank] = useState(null);
  const [scoreDelta, setScoreDelta] = useState(null);
  const currentQIdRef = useRef(null);

  // Stable references to prevent socket listener teardown on state changes
  const participantIdRef = useRef(participantId);
  participantIdRef.current = participantId;

  const usernameRef = useRef(username);
  usernameRef.current = username;

  const selectedOptionRef = useRef(selectedOption);
  selectedOptionRef.current = selectedOption;

  const scoreRef = useRef(score);
  scoreRef.current = score;

  useEffect(() => {
    sessionStorage.setItem('participant_id', participantId);
  }, [participantId]);

  // Connect and listen to question state, answer reveals, and responders (STABLE EFFECT)
  useEffect(() => {
    const token = sessionStorage.getItem('participant_token') || localStorage.getItem('participant_token');
    const curPId = participantIdRef.current;
    const curUName = usernameRef.current;
    
    socketManager.connect(token);
    socketManager.emit('join_room', { sessionId, pin, username: curUName, participantId: curPId });
    
    const handleState = (data) => {
      if (data?.status === 'ended') {
        navigate(`/leaderboard?pin=${pin}&username=${encodeURIComponent(curUName)}&participantId=${encodeURIComponent(curPId)}&score=${scoreRef.current}`);
        return;
      }

      if (data?.currentQuestion) {
        const incoming = data.currentQuestion;
        const savedAnswer = sessionStorage.getItem(`answered_q_${incoming.id}`) || data.userSubmission?.optionId;

        if (!currentQIdRef.current || currentQIdRef.current !== incoming.id) {
          currentQIdRef.current = incoming.id;
          setSelectedOption(savedAnswer || null);
          setIsLocked(!!savedAnswer);
          setRevealedInfo(null); // Never reveal answer on a new question until host clicks reveal
          setScoreDelta(null);
          setResponders(data.responders || { top3: [], others: [], totalAnswered: 0 });
          const timeLimit = incoming.timeLimitSeconds || 30;
          setTimeLeft(timeLimit);
          setInitialTime(timeLimit);
          setQuestion(incoming);
        } else if (savedAnswer && !selectedOptionRef.current) {
          setSelectedOption(savedAnswer);
          setIsLocked(true);
        }
      } else {
        // No active question currently pushed by host
        setQuestion(null);
        setRevealedInfo(null);
      }
    };

    const handleAnswerRevealed = (data) => {
      console.log('[Socket] Answer revealed by host:', data);
      setRevealedInfo(data);

      if (data?.responders) {
        setResponders(data.responders);
      }

      const myId = participantIdRef.current;
      const myName = usernameRef.current;
      let matchedScore = null;

      if (Array.isArray(data?.leaderboard)) {
        const myEntry = data.leaderboard.find(p => 
          p.id === myId || 
          p.socketId === socketManager.getSocket()?.id ||
          (p.username && p.username.trim().toLowerCase() === myName.trim().toLowerCase())
        );
        if (myEntry) {
          matchedScore = myEntry.score;
          setScore(myEntry.score);
          setRank(myEntry.rank);
          sessionStorage.setItem('participant_score', String(myEntry.score));
        }
      }

      // Calculate score delta indicator strictly for visual feedback: +2 if correct, 0 if wrong
      const myPick = selectedOptionRef.current;
      if (myPick) {
        const isCorrect = (
          myPick === data.correctOptionId || 
          String(myPick).toLowerCase() === String(data.correctOptionId).toLowerCase() ||
          (data.correctOptionText && String(myPick).trim().toLowerCase() === String(data.correctOptionText).trim().toLowerCase())
        );
        const delta = isCorrect ? 2 : 0;
        setScoreDelta(delta);

        if (matchedScore === null && isCorrect) {
          setScore(prev => {
            const next = prev + 2;
            sessionStorage.setItem('participant_score', String(next));
            return next;
          });
        }
      }
    };

    const handleLeaderboard = (data) => {
      if (Array.isArray(data?.rankings)) {
        const myId = participantIdRef.current;
        const myName = usernameRef.current;

        const myEntry = data.rankings.find(p => 
          p.id === myId || 
          p.socketId === socketManager.getSocket()?.id ||
          (p.username && p.username.trim().toLowerCase() === myName.trim().toLowerCase())
        );
        if (myEntry) {
          setScore(myEntry.score);
          setRank(myEntry.rank);
          sessionStorage.setItem('participant_score', String(myEntry.score));
        }
      }
    };

    const handleResponders = (data) => {
      if (data && (Array.isArray(data.top3) || Array.isArray(data.others))) {
        setResponders(data);
      }
    };

    // Lock confirmation upon answer submission
    const handleAnswerAck = (ack) => {
      console.log('[Socket] Answer submitted ack:', ack);
      if (ack?.isLocked) {
        setIsLocked(true);
      }
    };

    socketManager.on('session_state_changed', handleState);
    socketManager.on('answer_revealed', handleAnswerRevealed);
    socketManager.on('leaderboard_updated', handleLeaderboard);
    socketManager.on('question_responders_updated', handleResponders);
    socketManager.on('answer_submitted_ack', handleAnswerAck);

    return () => {
      socketManager.off('session_state_changed', handleState);
      socketManager.off('answer_revealed', handleAnswerRevealed);
      socketManager.off('leaderboard_updated', handleLeaderboard);
      socketManager.off('question_responders_updated', handleResponders);
      socketManager.off('answer_submitted_ack', handleAnswerAck);
    };
  }, [navigate, pin, sessionId, participantId, username]);

  // Circular timer calculation
  const strokeDashoffset = initialTime > 0 ? 251 - (251 * timeLeft) / initialTime : 0;

  // Continuous Countdown Timer for Student Dashboard
  useEffect(() => {
    if (!question || revealedInfo) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsLocked(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [question?.id, revealedInfo]);

  const handleSelectOption = (optId) => {
    if (isLocked || !question || revealedInfo) return;
    setSelectedOption(optId);
    setIsLocked(true);

    // Save locally to prevent re-answer upon reload
    sessionStorage.setItem(`answered_q_${question.id}`, optId);

    socketManager.emit('submit_answer', {
      questionId: question.id,
      optionId: optId,
      username: usernameRef.current,
      participantId: participantIdRef.current,
      sessionId,
      pin
    });
  };

  // 1. NO ACTIVE QUESTION SCREEN: Tell user to wait for host
  if (!question) {
    return (
      <div className="bg-background text-on-background min-h-screen flex flex-col items-center justify-between p-6 antialiased">
        <header className="w-full max-w-4xl flex items-center justify-between py-4 border-b border-outline-variant/20">
          <Link to="/" className="font-display-sm text-xl font-bold flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary">token</span>
            <span className="text-black">QuizCore</span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="text-xs font-mono font-bold bg-surface-container-high px-3 py-1.5 rounded-full text-primary border border-outline-variant/40">
              PIN: {pin}
            </div>
            <div className="flex items-center gap-1.5 px-4 py-1.5 bg-secondary text-on-secondary rounded-full font-bold shadow-sm">
              <span className="material-symbols-outlined text-sm">stars</span>
              <span className="font-mono text-sm font-extrabold">{score} pts</span>
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
              Get Ready for the Question!
            </h2>
            <p className="font-body-md text-sm text-on-surface-variant leading-relaxed">
              The question will appear on your screen the moment the host pushes it.
            </p>
          </div>

          {/* Current Player Live Score Card */}
          <div className="w-full bg-surface-container-low rounded-2xl p-4 border border-outline-variant/30 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-bold text-xs">
                {username.charAt(0).toUpperCase()}
              </div>
              <div className="text-left">
                <div className="font-bold text-xs text-primary">{username} (You)</div>
                <div className="text-[10px] text-on-surface-variant">{rank ? `Rank: #${rank}` : 'Live Arena'}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase font-bold text-on-surface-variant">Your Points</div>
              <div className="font-mono text-lg font-extrabold text-secondary">{score} pts</div>
            </div>
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
    String(selectedOption).toLowerCase() === String(revealedInfo.correctOptionId).toLowerCase() ||
    (revealedInfo.correctOptionText && String(selectedOption).trim().toLowerCase() === String(revealedInfo.correctOptionText).trim().toLowerCase())
  );

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col justify-between antialiased selection:bg-secondary-container selection:text-on-secondary-container relative overflow-x-hidden">
      
      {/* Background ambient blobs */}
      <div className="fixed top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-secondary-container/20 blur-3xl pointer-events-none -z-10"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-surface-variant/30 blur-3xl pointer-events-none -z-10"></div>

      {/* Top Participant Status Bar */}
      <header className="px-6 py-4 md:px-12 flex items-center justify-between z-10 border-b border-outline-variant/20 bg-surface-container-lowest/80 backdrop-blur-md sticky top-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container font-bold text-xs shadow-inner">
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

        {/* Score & Ranking Pill */}
        <div className="flex items-center gap-2">
          {rank && (
            <div className="flex items-center gap-1 px-3 py-1.5 bg-surface-container-high rounded-full text-xs font-bold text-primary border border-outline-variant/40">
              <span>🏆</span>
              <span>#{rank}</span>
            </div>
          )}

          {/* DYNAMIC SCORE BADGE */}
          <div className="relative flex items-center gap-1.5 px-4 py-1.5 bg-secondary text-on-secondary rounded-full font-bold shadow-md transition-all">
            <span className="material-symbols-outlined text-base">stars</span>
            <span className="font-mono text-sm md:text-base font-black tracking-wide">{score} pts</span>

            {/* Floating Score Delta Badge */}
            {scoreDelta !== null && (
              <span className={`absolute -bottom-6 right-0 text-xs font-black px-2 py-0.5 rounded-full shadow-md animate-bounce ${
                scoreDelta > 0 ? 'bg-secondary text-on-secondary' : 'bg-surface-container-highest text-primary'
              }`}>
                {scoreDelta > 0 ? `+${scoreDelta} pts` : '+0 pts'}
              </span>
            )}
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
            <span className="text-secondary font-bold">+2 Marks per Correct Answer</span>
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
            
            // Accurate correctness matching strictly when host revealed
            const isThisOptionCorrect = revealedInfo && (
              (revealedInfo.correctOptionId && (choiceId === revealedInfo.correctOptionId || opt.id === revealedInfo.correctOptionId)) ||
              (revealedInfo.correctOptionText && opt.text?.trim().toLowerCase() === revealedInfo.correctOptionText?.trim().toLowerCase())
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
              // Selected / Locked before reveal (Amber/Indigo neutral lock style - NOT green!)
              cardStyle = 'border-primary bg-surface-container-high text-primary shadow-md scale-[0.98] ring-2 ring-primary/40';
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
                      <span className="material-symbols-outlined text-[18px]">check_circle</span>
                    </div>
                  ) : isSelected ? (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-error text-on-error flex items-center justify-center animate-fadeIn shadow-md">
                      <span className="material-symbols-outlined text-[18px]">cancel</span>
                    </div>
                  ) : null
                ) : isSelected ? (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-full bg-primary text-on-primary flex items-center gap-1 text-[11px] font-bold animate-fadeIn">
                    <span className="material-symbols-outlined text-xs">lock</span>
                    <span>Locked</span>
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
                
                <div className="flex flex-1 flex-col sm:flex-row sm:items-center justify-between text-left gap-1 pr-14">
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
                        ✗ Your Pick (+0 Marks)
                      </div>
                    )}
                    {!revealedInfo && isSelected && (
                      <div className="text-[11px] font-bold text-primary/70 mt-0.5">
                        Your Submitted Choice (Locked)
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
        <div className="w-full max-w-xl text-center mb-6">
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
                    ? '🎉 Correct! +2 Points Added to Your Score!' 
                    : selectedOption 
                      ? '❌ Incorrect Answer (+0 Marks). Keep going!'
                      : 'Time is up! You did not answer.'}
                </span>
              </div>
              <span className="text-xs text-on-surface-variant font-normal">
                Total Score: <strong className="text-primary font-mono font-bold">{score} pts</strong> • Waiting for next question...
              </span>
            </div>
          ) : isLocked ? (
            <div className="p-3.5 bg-surface-container-low rounded-2xl border border-outline-variant/40 text-xs font-bold text-primary flex items-center justify-center gap-2 animate-fadeIn">
              <span className="material-symbols-outlined text-secondary text-sm">lock</span>
              <span>Answer Locked! Waiting for host to reveal the correct answer.</span>
            </div>
          ) : (
            <div className="text-xs text-on-surface-variant font-label-md">
              Tap an option above to submit your answer
            </div>
          )}
        </div>

        {/* TOP 3 HIGHLIGHTED PLAYERS & OTHERS SECTION */}
        {(responders.top3.length > 0 || responders.others.length > 0) && (
          <div className="w-full max-w-2xl bg-surface-container-lowest rounded-3xl p-5 md:p-6 border border-outline-variant/30 shadow-sm animate-fadeIn">
            
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-lg">bolt</span>
                <span className="font-label-md text-xs uppercase tracking-wider font-bold text-primary">
                  Question Responders ({responders.totalAnswered})
                </span>
              </div>
              <span className="text-[11px] text-on-surface-variant font-medium">Top 3 Fastest Highlighted</span>
            </div>

            {/* TOP 3 HIGHLIGHTED CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
              {responders.top3.map((player) => (
                <div
                  key={player.id || player.username}
                  className={`p-3 rounded-2xl border-2 flex items-center justify-between shadow-md transition-all ${
                    player.rank === 1
                      ? 'bg-amber-500/10 border-amber-500/60 ring-2 ring-amber-400/30'
                      : player.rank === 2
                        ? 'bg-slate-300/10 border-slate-400/60 ring-2 ring-slate-300/30'
                        : 'bg-orange-600/10 border-orange-500/60 ring-2 ring-orange-400/30'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-lg">
                      {player.rank === 1 ? '🥇' : player.rank === 2 ? '🥈' : '🥉'}
                    </span>
                    <div className="truncate text-left">
                      <div className="text-xs font-bold text-primary truncate max-w-[90px]">
                        {player.username}
                      </div>
                      <div className="text-[10px] font-bold text-secondary">
                        {player.rank === 1 ? 'Fastest' : `#${player.rank} Quick`}
                      </div>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-xs text-secondary">check</span>
                </div>
              ))}
            </div>

            {/* OTHER NON-HIGHLIGHTED PLAYERS */}
            {responders.others.length > 0 && (
              <div className="pt-3 border-t border-outline-variant/20">
                <div className="text-[10px] uppercase font-bold text-on-surface-variant mb-2">Other Responders</div>
                <div className="flex flex-wrap gap-1.5">
                  {responders.others.map((otherP) => (
                    <span
                      key={otherP.id || otherP.username}
                      className="px-2.5 py-1 rounded-full bg-surface-container-low border border-outline-variant/30 text-xs text-on-surface-variant font-medium"
                    >
                      {otherP.username}
                    </span>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

      </main>
    </div>
  );
};

export default ParticipantLiveQuiz;
