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
  const [selectedOptions, setSelectedOptions] = useState([]); // multi-select picks
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

  // ---- Animated score display: number rolls up/down whenever score changes ----
  const [displayScore, setDisplayScore] = useState(score);
  const displayScoreRef = useRef(score);
  displayScoreRef.current = displayScore;

  useEffect(() => {
    const from = displayScoreRef.current;
    const to = score;
    if (Math.abs(to - from) < 0.005) {
      setDisplayScore(to);
      return undefined;
    }
    const duration = 650;
    const t0 = performance.now();
    let raf;
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplayScore(Math.round((from + (to - from) * eased) * 100) / 100);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [score]);

  // Gain flash: lime charge-bar under the header + pill glow whenever points arrive
  const [gainFlash, setGainFlash] = useState(false);
  useEffect(() => {
    if (scoreDelta === null || scoreDelta <= 0) return undefined;
    setGainFlash(true);
    const t = setTimeout(() => setGainFlash(false), 1100);
    return () => clearTimeout(t);
  }, [scoreDelta]);

  // Delta chip auto-dismisses exactly when its float-away animation ends
  useEffect(() => {
    if (scoreDelta === null) return undefined;
    const t = setTimeout(() => setScoreDelta(null), 2600);
    return () => clearTimeout(t);
  }, [scoreDelta]);

  const fmtNum = (v) => String(Math.round(v * 100) / 100);

  // Stable references to prevent socket listener teardown on state changes
  const participantIdRef = useRef(participantId);
  participantIdRef.current = participantId;

  const usernameRef = useRef(username);
  usernameRef.current = username;

  const selectedOptionRef = useRef(selectedOption);
  selectedOptionRef.current = selectedOption;

  const selectedOptionsRef = useRef(selectedOptions);
  selectedOptionsRef.current = selectedOptions;

  const isLockedRef = useRef(isLocked);
  isLockedRef.current = isLocked;

  const questionRef = useRef(question);
  questionRef.current = question;

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

    // Helper: find own entry in a leaderboard array
    const findMyEntry = (entries) => {
      if (!Array.isArray(entries)) return null;
      const myId = participantIdRef.current;
      const mySocketId = socketManager.getSocket()?.id;
      const myName = usernameRef.current?.trim().toLowerCase();

      return entries.find(p =>
        (p.id && p.id === myId) ||
        (p.socketId && mySocketId && p.socketId === mySocketId) ||
        (p.username && p.username.trim().toLowerCase() === myName)
      ) || null;
    };

    // Helper: apply score/rank from a matched entry
    const applyScore = (entry) => {
      if (!entry) return;
      setScore(entry.score);
      if (entry.rank) setRank(entry.rank);
      sessionStorage.setItem('participant_score', String(entry.score));
    };
    
    const handleState = (data) => {
      if (data?.status === 'ended') {
        navigate(`/leaderboard?pin=${pin}&username=${encodeURIComponent(curUName)}&participantId=${encodeURIComponent(curPId)}&score=${scoreRef.current}`);
        return;
      }

      if (data?.currentQuestion) {
        const incoming = data.currentQuestion;
        // Answer locks are scoped to THIS session (pin) — the same question bank
        // reused in another session must never restore old locks.
        let savedAnswer = sessionStorage.getItem(`answered_${pin}_${incoming.id}`) || data.userSubmission?.optionId;

        // Restore multi-select answers stored as JSON arrays
        let savedMulti = [];
        if (savedAnswer && savedAnswer.startsWith('[')) {
          try {
            const parsed = JSON.parse(savedAnswer);
            if (Array.isArray(parsed)) {
              savedMulti = parsed;
              savedAnswer = null;
            }
          } catch (e) { /* not a JSON array — treat as single */ }
        }

        if (!currentQIdRef.current || currentQIdRef.current !== incoming.id) {
          currentQIdRef.current = incoming.id;
          setSelectedOption(savedAnswer || null);
          setSelectedOptions(savedMulti);
          setIsLocked(!!savedAnswer || savedMulti.length > 0);
          setRevealedInfo(null); // Never reveal answer on a new question until host clicks reveal
          setScoreDelta(null);
          setResponders(data.responders || { top3: [], others: [], totalAnswered: 0 });
          const timeLimit = incoming.timeLimitSeconds || 30;
          setTimeLeft(timeLimit);
          setInitialTime(timeLimit);
          setQuestion(incoming);
        } else if ((savedAnswer || savedMulti.length > 0) && !selectedOptionRef.current && selectedOptionsRef.current.length === 0) {
          setSelectedOption(savedAnswer || null);
          setSelectedOptions(savedMulti);
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

      // Try to find our entry in the leaderboard payload
      const myEntry = findMyEntry(data?.leaderboard);
      if (myEntry) {
        applyScore(myEntry);
      }

      // Calculate score indicator from the question's marks (decimals allowed).
      const qMarks = Number(questionRef.current?.marks) > 0 ? Number(questionRef.current.marks) : 2;

      const isMultiReveal = Array.isArray(data?.correctOptionIds) && data.correctOptionIds.length > 1
        || (Array.isArray(data?.optionsWithCorrectness) && data.optionsWithCorrectness.filter(o => o.isCorrect === true || o.isCorrect === 'true').length > 1);

      if (isMultiReveal) {
        // MULTIPLE CHOICE — partial credit: each correct pick earns marks/totalCorrect.
        // Any wrong pick voids the question (0 pts).
        const correctSet = (data?.correctOptionIds && data.correctOptionIds.length > 0
          ? data.correctOptionIds
          : (data?.optionsWithCorrectness || []).filter(o => o.isCorrect === true || o.isCorrect === 'true').map(o => o.id || o.text)
        ).map(v => String(v).trim().toLowerCase());
        const pickedSet = (selectedOptionsRef.current || []).map(v => String(v).trim().toLowerCase());
        const wrongPick = pickedSet.some(v => !correctSet.includes(v));
        const earned = (!wrongPick && pickedSet.length > 0 && correctSet.length > 0)
          ? Math.round((qMarks * pickedSet.length / correctSet.length) * 100) / 100
          : 0;

        setScoreDelta(pickedSet.length > 0 ? earned : null);

        // Server truth wins when we can find ourselves; optimistic local math otherwise
        if (myEntry) {
          applyScore(myEntry);
        } else if (pickedSet.length > 0 && earned > 0) {
          const next = Math.round((scoreRef.current + earned) * 100) / 100;
          setScore(next);
          sessionStorage.setItem('participant_score', String(next));
        }
        console.log(`[Score] Multi reveal: ${pickedSet.length}/${correctSet.length} correct picks, ${wrongPick ? 'voided by wrong pick' : ''}, earned ${earned} of ${qMarks}`);
        return;
      }

      const myPick = selectedOptionRef.current;
      if (myPick) {
        const isCorrect = (
          myPick === data.correctOptionId ||
          String(myPick).toLowerCase() === String(data.correctOptionId).toLowerCase() ||
          (data.correctOptionText && String(myPick).trim().toLowerCase() === String(data.correctOptionText).trim().toLowerCase())
        );
        const earned = isCorrect ? qMarks : 0;
        setScoreDelta(earned);

        if (myEntry) {
          applyScore(myEntry);
        } else if (isCorrect) {
          const next = Math.round((scoreRef.current + qMarks) * 100) / 100;
          setScore(next);
          sessionStorage.setItem('participant_score', String(next));
        }
      }
    };

    // Direct per-player score push from server (most reliable path)
    const handleScoreUpdate = (data) => {
      console.log('[Socket] Direct score_update received:', data);
      if (data?.score !== undefined) {
        setScore(data.score);
        sessionStorage.setItem('participant_score', String(data.score));
      }
      if (data?.rank) {
        setRank(data.rank);
      }
    };

    const handleLeaderboard = (data) => {
      const myEntry = findMyEntry(data?.rankings);
      if (myEntry) {
        applyScore(myEntry);
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
    socketManager.on('score_update', handleScoreUpdate);
    socketManager.on('leaderboard_updated', handleLeaderboard);
    socketManager.on('question_responders_updated', handleResponders);
    socketManager.on('answer_submitted_ack', handleAnswerAck);

    return () => {
      socketManager.off('session_state_changed', handleState);
      socketManager.off('answer_revealed', handleAnswerRevealed);
      socketManager.off('score_update', handleScoreUpdate);
      socketManager.off('leaderboard_updated', handleLeaderboard);
      socketManager.off('question_responders_updated', handleResponders);
      socketManager.off('answer_submitted_ack', handleAnswerAck);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, pin, sessionId]);

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

  const emitSubmission = ({ optionId, optionIds }) => {
    socketManager.emit('submit_answer', {
      questionId: questionRef.current?.id,
      optionId,
      optionIds,
      username: usernameRef.current,
      participantId: participantIdRef.current,
      sessionId,
      pin
    });
  };

  const handleSelectOption = (optId) => {
    if (isLocked || !question || revealedInfo) return;

    // MULTIPLE CHOICE: toggle selections freely — nothing locks until "Submit"
    if (question.type === 'multiple_choice') {
      setSelectedOptions((prev) => (
        prev.includes(optId) ? prev.filter((id) => id !== optId) : [...prev, optId]
      ));
      return;
    }

    // SINGLE CHOICE / TRUE-FALSE: lock & submit immediately (existing behaviour)
    setSelectedOption(optId);
    setIsLocked(true);

    // Save locally (session-scoped) to prevent re-answer upon reload
    sessionStorage.setItem(`answered_${pin}_${question.id}`, optId);
    emitSubmission({ optionId: optId });
  };

  const handleSubmitMulti = () => {
    if (isLocked || !question || revealedInfo || selectedOptions.length === 0) return;
    setIsLocked(true);

    // Save locally (session-scoped) to prevent re-answer upon reload
    sessionStorage.setItem(`answered_${pin}_${question.id}`, JSON.stringify(selectedOptions));
    emitSubmission({ optionIds: selectedOptions });
  };

  // Auto-submit pending multi-selections when the timer runs out
  useEffect(() => {
    if (timeLeft === 0 && question && !revealedInfo && !isLockedRef.current) {
      if (question.type === 'multiple_choice' && selectedOptionsRef.current.length > 0) {
        setIsLocked(true);
        sessionStorage.setItem(`answered_${pin}_${question.id}`, JSON.stringify(selectedOptionsRef.current));
        emitSubmission({ optionIds: selectedOptionsRef.current });
      } else if (question.type !== 'multiple_choice') {
        setIsLocked(true);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, question?.id, revealedInfo]);

  // 1. NO ACTIVE QUESTION SCREEN: fixed-viewport, centered, no scroll
  if (!question) {
    return (
      <div className="bg-background text-on-background h-[100dvh] overflow-hidden flex flex-col items-center justify-between p-4 sm:p-6 pt-safe pb-safe antialiased">
        <header className="w-full max-w-4xl shrink-0 flex items-center justify-between py-3 border-b border-outline-variant/20">
          <Link to="/" className="font-display-sm text-xl font-bold flex items-center gap-2 select-none">
            <span className="material-symbols-outlined text-secondary">token</span>
            <span className="text-primary">QuizCore</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="text-xs font-mono font-bold bg-surface-container-high px-3 py-1.5 rounded-full text-primary border border-outline-variant/40">
              PIN: {pin}
            </div>
            <div className="flex items-center gap-1.5 px-3.5 py-1.5 bg-secondary text-on-secondary rounded-full font-bold shadow-sm">
              <span className="material-symbols-outlined text-sm">stars</span>
              <span className="font-mono text-sm font-bold">{score} pts</span>
            </div>
          </div>
        </header>

        <div className="text-center flex flex-col items-center gap-5 my-auto max-w-md w-full p-6 sm:p-8 bg-surface-container-lowest rounded-3xl border border-outline-variant/30 shadow-editorial animate-fadeIn">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-secondary-container/40 flex items-center justify-center text-secondary relative shrink-0">
            <span className="material-symbols-outlined text-2xl sm:text-3xl animate-float">hourglass_top</span>
            <span className="absolute w-full h-full rounded-full border-2 border-secondary border-t-transparent animate-spin"></span>
          </div>

          <div>
            <span className="inline-block text-[11px] font-label-md uppercase tracking-wider text-secondary font-bold bg-secondary-container/40 px-3 py-1 rounded-full mb-2">
              Waiting for Host
            </span>
            <h2 className="font-headline-lg text-xl sm:text-2xl font-bold text-primary mb-1.5">
              Get Ready for the Question!
            </h2>
            <p className="font-body-md text-xs sm:text-sm text-on-surface-variant leading-relaxed">
              The question will appear on your screen the moment the host pushes it.
            </p>
          </div>

          {/* Current Player Live Score Card */}
          <div className="w-full bg-surface-container-low rounded-2xl p-3.5 border border-outline-variant/30 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-bold text-xs shrink-0">
                {username.charAt(0).toUpperCase()}
              </div>
              <div className="text-left min-w-0">
                <div className="font-bold text-xs text-primary truncate">{username} (You)</div>
                <div className="text-[10px] text-on-surface-variant">{rank ? `Rank: #${rank}` : 'Live Arena'}</div>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-[10px] uppercase font-bold text-on-surface-variant">Your Points</div>
              <div className="font-mono text-base sm:text-lg font-bold text-secondary">{score} pts</div>
            </div>
          </div>
        </div>

        <footer className="shrink-0 py-3 text-[11px] text-on-surface-variant font-label-md text-center select-none">
          Connected live to session PIN: <strong className="text-primary font-mono">{pin}</strong>
        </footer>
      </div>
    );
  }

  // 2. LIVE QUESTION ARENA — fixed-viewport, zero-scroll, centered for mobile play
  const normCmp = (v) => String(v).trim().toLowerCase();
  const isMultiQuestion = question.type === 'multiple_choice';
  const revealedCorrectIds = revealedInfo
    ? (Array.isArray(revealedInfo.correctOptionIds) && revealedInfo.correctOptionIds.length > 0
        ? revealedInfo.correctOptionIds
        : (revealedInfo.optionsWithCorrectness || [])
            .filter((o) => o.isCorrect === true || o.isCorrect === 'true')
            .map((o) => o.id || o.text))
    : [];
  const hasPicked = isMultiQuestion ? selectedOptions.length > 0 : !!selectedOption;

  const isCorrectChoice = revealedInfo && (isMultiQuestion
    ? (
      revealedCorrectIds.length > 0 &&
      selectedOptions.length === revealedCorrectIds.length &&
      revealedCorrectIds.every((c) => selectedOptions.some((s) => normCmp(s) === normCmp(c))) &&
      selectedOptions.every((s) => revealedCorrectIds.some((c) => normCmp(c) === normCmp(s)))
    )
    : (
      selectedOption && (
        selectedOption === revealedInfo.correctOptionId ||
        normCmp(selectedOption) === normCmp(revealedInfo.correctOptionId || '') ||
        (revealedInfo.correctOptionText && normCmp(selectedOption) === normCmp(revealedInfo.correctOptionText))
      )
    )
  );

  // Exact points earned this round — partial credit for multiple choice.
  const qMarks = Number(question.marks) > 0 ? Number(question.marks) : 2;
  const wrongPick = hasPicked && isMultiQuestion && selectedOptions.some((s) => !revealedCorrectIds.some((c) => normCmp(c) === normCmp(s)));
  const earnedPoints = !revealedInfo ? 0
    : !hasPicked ? 0
    : isMultiQuestion
      ? (wrongPick ? 0 : Math.round((qMarks * selectedOptions.length / Math.max(revealedCorrectIds.length, 1)) * 100) / 100)
      : (isCorrectChoice ? qMarks : 0);

  return (
    <div className="bg-background text-on-background h-[100dvh] overflow-hidden flex flex-col antialiased selection:bg-secondary-container selection:text-on-secondary-container relative pt-safe pb-safe">

      {/* Background ambient blobs */}
      <div className="fixed top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-secondary-container/20 blur-3xl pointer-events-none -z-10"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-surface-variant/30 blur-3xl pointer-events-none -z-10"></div>

      {/* Top Participant Status Bar — compact for mobile */}
      <header className="shrink-0 relative px-4 py-2.5 md:px-12 md:py-4 z-10 border-b border-outline-variant/20 bg-surface-container-lowest/90 backdrop-blur-md shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-bold text-xs shadow-inner ring-2 ring-secondary/30 shrink-0 select-none">
              {username.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="font-label-md text-xs font-bold text-primary truncate select-none">{username}</div>
              <div className="text-[10px] text-on-surface-variant flex items-center gap-1 font-mono">
                <span className={`w-1.5 h-1.5 rounded-full bg-secondary shrink-0 ${revealedInfo ? '' : 'animate-pulse'}`}></span>
                <span className="truncate">PIN: {pin}</span>
              </div>
            </div>
          </div>

          {/* Rank + Animated Score */}
          <div className="flex items-center gap-2 shrink-0">
            {rank && (
              <div className="hidden sm:flex items-center gap-1 px-3 py-1.5 bg-surface-container-high rounded-full text-xs font-bold text-primary border border-outline-variant/40 select-none">
                <span className="material-symbols-outlined icon-fill text-sm text-secondary">emoji_events</span>
                <span>#{rank}</span>
              </div>
            )}

            <div
              className={`relative flex items-center gap-1.5 px-3 md:px-4 py-1.5 rounded-full font-bold shadow-md transition-all duration-300 select-none bg-secondary-container text-on-secondary-container border-2 border-secondary/40 ${
                gainFlash ? 'scale-105' : ''
              }`}
              aria-live="polite"
            >
              <span className="material-symbols-outlined text-base icon-fill">stars</span>
              <span className="font-mono text-sm md:text-base font-bold tracking-wide tabular-nums">
                {fmtNum(displayScore)} pts
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Gain strip BELOW the header: delta chip on top, lime charge-bar under it */}
      <div className="relative h-7 shrink-0 pointer-events-none" aria-hidden="true">
        {scoreDelta !== null && (
          <span
            className={`absolute right-4 md:right-12 top-0 text-[11px] md:text-xs font-bold px-2 py-0.5 rounded-full shadow-md animate-deltaPop whitespace-nowrap ${
              scoreDelta > 0 ? 'bg-secondary text-on-secondary' : 'bg-surface-container-highest text-on-surface-variant'
            }`}
          >
            {scoreDelta > 0 ? `+${fmtNum(scoreDelta)} pts` : '+0 pts'}
          </span>
        )}
        <div
          className={`absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r from-secondary-container via-secondary to-secondary-container transition-all duration-700 ease-out ${gainFlash ? 'w-full opacity-100' : 'w-0 opacity-0'}`}
        />
      </div>

      {/* Main Question Arena — everything centered, fits viewport, no scroll */}
      <main className="flex-1 min-h-0 w-full max-w-4xl mx-auto px-4 md:px-6 flex flex-col items-center justify-center gap-2.5 md:gap-5 z-10 overflow-hidden">

        {/* Compact Timer + Type Meta Row */}
        <div className="flex items-center gap-3 md:gap-4 shrink-0">
          {!revealedInfo ? (
            <div className="relative w-14 h-14 md:w-20 md:h-20 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" className="stroke-surface-container-highest" strokeWidth="7" fill="transparent" />
                <circle
                  cx="50" cy="50" r="40"
                  className={`transition-all duration-1000 ${timeLeft <= 5 ? 'stroke-error' : 'stroke-secondary'}`}
                  strokeWidth="7"
                  strokeDasharray="251"
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              <span className={`absolute font-mono text-base md:text-xl font-bold ${timeLeft <= 5 ? 'text-error animate-ping' : 'text-primary'}`}>
                {timeLeft}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3.5 py-1.5 bg-secondary text-on-secondary rounded-full font-label-md text-xs font-bold shadow-md animate-fadeIn">
              <span className="material-symbols-outlined text-sm">visibility</span>
              <span>Answer Revealed</span>
            </div>
          )}

          <div className="flex flex-col items-start gap-0.5 text-left">
            <span className="text-[10px] md:text-xs font-label-md text-on-surface-variant uppercase tracking-wider">
              {question.type ? question.type.replace('_', ' ') : 'Live Question'}
            </span>
            <span className="text-[10px] md:text-xs font-label-md text-secondary font-bold uppercase tracking-wider">
              {isMultiQuestion ? 'Select ALL correct options' : `${qMarks} marks for the correct answer`}
            </span>
          </div>
        </div>

        {/* Question Text & Image */}
        <div key={`q-${question.id}`} className="flex flex-col items-center gap-2 md:gap-3 text-center w-full shrink-0 animate-slideUp">
          <h1 className="font-headline-lg text-base sm:text-lg md:text-3xl text-primary font-bold max-w-2xl leading-snug line-clamp-3 select-none">
            {question.text}
          </h1>
          {question.imageUrl && (
            <img src={question.imageUrl} alt="Question" className="max-h-24 md:max-h-44 object-contain rounded-2xl border border-outline-variant/30 bg-surface-container-low" />
          )}
        </div>

        {/* Interactive Answer Option Grid — staggered entrance per question */}
        <div key={question.id} className="w-full grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3.5 min-h-0 overflow-y-auto overscroll-contain custom-scrollbar">
          {(question.options || []).map((opt, idx) => {
            const choiceId = opt.id || opt.text;
            const norm = (v) => String(v).trim().toLowerCase();
            const isMulti = question.type === 'multiple_choice';

            // Selection state (single pick OR multi picks)
            const isSelected = isMulti
              ? selectedOptions.some((s) => norm(s) === norm(choiceId))
              : (selectedOption === choiceId || selectedOption === opt.id || selectedOption === opt.text);

            // Correctness matching strictly when host revealed (supports multiple correct options)
            const correctIds = revealedInfo
              ? (Array.isArray(revealedInfo.correctOptionIds) && revealedInfo.correctOptionIds.length > 0
                  ? revealedInfo.correctOptionIds
                  : (revealedInfo.optionsWithCorrectness || [])
                      .filter((o) => o.isCorrect === true || o.isCorrect === 'true')
                      .map((o) => o.id || o.text))
              : [];
            const isThisOptionCorrect = revealedInfo && correctIds.some((c) => norm(c) === norm(choiceId));

            let cardStyle = 'border-outline-variant/40 bg-surface-container-lowest hover:border-primary hover:-translate-y-px cursor-pointer';

            if (revealedInfo) {
              if (isThisOptionCorrect && isSelected) {
                // Clean correct pick: crisp lime border on white, no heavy fills
                cardStyle = 'border-secondary bg-white ring-1 ring-secondary/50 shadow-md';
              } else if (isThisOptionCorrect) {
                // Correct option the player missed — show it clearly but softer
                cardStyle = 'border-secondary/40 bg-secondary-container/10';
              } else if (isSelected && !isThisOptionCorrect) {
                cardStyle = 'border-error bg-white ring-1 ring-error/60 shadow-md';
              } else {
                cardStyle = 'border-outline-variant/20 bg-surface-container-lowest opacity-40';
              }
            } else if (isSelected && isMulti) {
              // Multi-select: picked but NOT locked yet — player can still toggle
              cardStyle = 'border-primary bg-primary/5 shadow-md ring-2 ring-primary/30';
            } else if (isSelected) {
              // Single: Selected / Locked before reveal (neutral lock style - NOT green!)
              cardStyle = 'border-primary bg-surface-container-high shadow-md scale-[0.98] ring-2 ring-primary/40';
            } else if (isLocked) {
              cardStyle = 'border-outline-variant/30 bg-surface-container-lowest opacity-60 cursor-not-allowed';
            }

            return (
              <button
                key={idx}
                onClick={() => handleSelectOption(choiceId)}
                // Prevent pointer-focus so tapping never scroll-jumps the arena on mobile
                onMouseDown={(e) => e.preventDefault()}
                disabled={isLocked || !!revealedInfo}
                style={{ animationDelay: `${idx * 70}ms` }}
                className={`relative px-3 py-2.5 md:p-5 rounded-2xl md:rounded-3xl border-2 transition-all duration-200 flex items-center gap-2.5 md:gap-4 group overflow-hidden text-left shrink-0 touch-manipulation animate-riseUp ${cardStyle}`}
              >
                {/* Visual badge icon */}
                {revealedInfo ? (
                  isThisOptionCorrect ? (
                    <div className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 w-6 h-6 md:w-7 md:h-7 rounded-full bg-secondary text-on-secondary flex items-center justify-center animate-fadeIn shadow-md">
                      <span className="material-symbols-outlined text-base md:text-[18px]">check_circle</span>
                    </div>
                  ) : isSelected ? (
                    <div className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 w-6 h-6 md:w-7 md:h-7 rounded-full bg-error text-on-error flex items-center justify-center animate-fadeIn shadow-md">
                      <span className="material-symbols-outlined text-base md:text-[18px]">cancel</span>
                    </div>
                  ) : null
                ) : isSelected && isMulti ? (
                  <div className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 w-6 h-6 md:w-7 md:h-7 rounded-full bg-primary text-on-primary flex items-center justify-center animate-fadeIn shadow-md">
                    <span className="material-symbols-outlined text-base md:text-[18px]">check</span>
                  </div>
                ) : isSelected ? (
                  <div className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 px-2 py-0.5 md:px-2.5 md:py-1 rounded-full bg-primary text-on-primary flex items-center gap-1 text-[10px] md:text-[11px] font-bold animate-fadeIn">
                    <span className="material-symbols-outlined text-xs">lock</span>
                    <span>Locked</span>
                  </div>
                ) : null}

                <div className={`w-7 h-7 md:w-9 md:h-9 rounded-lg md:rounded-xl flex items-center justify-center font-bold text-xs uppercase shrink-0 transition-colors ${
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

                <div className="flex flex-1 flex-col sm:flex-row sm:items-center justify-between text-left gap-1 pr-10 md:pr-14 min-w-0">
                  <span className="font-bold text-sm md:text-lg leading-tight text-primary line-clamp-2">
                    {opt.text}
                  </span>
                  <div className="flex flex-col">
                    {revealedInfo && isThisOptionCorrect && (
                      <div className="text-[10px] md:text-[11px] font-bold text-secondary mt-0.5 flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">check_circle</span>
                        {isSelected
                          ? `Your Correct Pick (+${Math.round((qMarks / Math.max(revealedCorrectIds.length, 1)) * 100) / 100})`
                          : 'Correct Answer'}
                      </div>
                    )}
                    {revealedInfo && isSelected && !isThisOptionCorrect && (
                      <div className="text-[10px] md:text-[11px] font-bold text-error mt-0.5 flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">cancel</span>
                        Your Pick (+0)
                      </div>
                    )}
                    {!revealedInfo && isSelected && isMulti && (
                      <div className="hidden md:flex text-[11px] font-bold text-primary/70 mt-0.5">
                        Selected — tap again to deselect
                      </div>
                    )}
                    {!revealedInfo && isSelected && !isMulti && (
                      <div className="hidden md:flex text-[11px] font-bold text-primary/70 mt-0.5">
                        Your Submitted Choice (Locked)
                      </div>
                    )}
                  </div>
                  {opt.imageUrl && (
                    <img src={opt.imageUrl} alt="Option" className="hidden sm:block h-10 w-10 object-cover rounded-lg shrink-0 border border-outline-variant/40" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Lock / Result Feedback Bar */}
        <div key={`fb-${question.id}-${revealedInfo ? 'r' : 'w'}`} className="w-full max-w-xl text-center shrink-0 animate-slideUp">
          {revealedInfo ? (
            <div className={`p-3 md:p-4 rounded-2xl border text-xs md:text-sm font-bold flex flex-col items-center gap-1 animate-fadeIn shadow-sm ${
              isCorrectChoice
                ? 'bg-secondary-container/40 border-secondary text-secondary'
                : earnedPoints > 0
                  ? 'bg-secondary-container/20 border-secondary/40 text-on-secondary-container'
                  : hasPicked
                    ? 'bg-error/10 border-error/40 text-error'
                    : 'bg-surface-container-high border-outline-variant/40 text-primary'
            }`}>
              <div className="flex items-center gap-2 text-sm md:text-base">
                <span className="material-symbols-outlined">
                  {isCorrectChoice ? 'celebration' : earnedPoints > 0 ? 'trending_up' : hasPicked ? 'sentiment_dissatisfied' : 'info'}
                </span>
                <span>
                  {isCorrectChoice
                    ? `Perfect! All picks correct — +${earnedPoints} pts!`
                    : earnedPoints > 0
                      ? `Partial credit: ${selectedOptions.length}/${revealedCorrectIds.length} correct — +${earnedPoints} pts`
                      : hasPicked
                        ? (wrongPick ? 'A wrong pick voids the question (+0). Keep going!' : 'Incorrect Answer (+0). Keep going!')
                        : 'Time is up! You did not answer.'}
                </span>
              </div>
              <span className="text-[11px] md:text-xs text-on-surface-variant font-normal">
                Total Score: <strong className="text-primary font-mono font-bold">{score} pts</strong> • Waiting for next question...
              </span>
            </div>
          ) : isLocked ? (
            <div className="p-2.5 md:p-3.5 bg-surface-container-low rounded-2xl border border-outline-variant/40 text-[11px] md:text-xs font-bold text-primary flex items-center justify-center gap-2 animate-fadeIn">
              <span className="material-symbols-outlined text-secondary text-sm">lock</span>
              <span>
                {isMultiQuestion
                  ? `${selectedOptions.length} option${selectedOptions.length > 1 ? 's' : ''} locked in! Waiting for host to reveal.`
                  : 'Answer Locked! Waiting for host to reveal the correct answer.'}
              </span>
            </div>
          ) : isMultiQuestion ? (
            <button
              onClick={handleSubmitMulti}
              disabled={selectedOptions.length === 0}
              className="w-full px-6 py-3 md:py-4 rounded-full font-label-md text-sm font-bold transition-all duration-300 shadow-md flex items-center justify-center gap-2 cursor-pointer select-none hover:-translate-y-0.5 active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none animate-glowPulse bg-secondary-container text-on-secondary-container border-2 border-secondary-container hover:bg-secondary hover:text-on-secondary"
            >
              <span className="material-symbols-outlined text-base">lock</span>
              {selectedOptions.length > 0
                ? `Lock In Answer (${selectedOptions.length} selected)`
                : 'Select all options that apply'}
            </button>
          ) : (
            <div className="text-[11px] md:text-xs text-on-surface-variant font-label-md">
              Tap an option above to submit your answer
            </div>
          )}
        </div>

        {/* Question Responders - All players ranked by time (desktop — hidden on mobile to guarantee zero-scroll play) */}
        {(responders.top3?.length > 0 || responders.others?.length > 0) && (
          <div className="hidden md:block w-full max-w-2xl bg-surface-container-lowest rounded-3xl p-5 md:p-6 border border-outline-variant/30 shadow-sm animate-fadeIn shrink-0">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-lg">bolt</span>
                <span className="font-label-md text-xs uppercase tracking-wider font-bold text-primary">
                  Question Responders ({responders.totalAnswered})
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-56 overflow-y-auto pr-1">
              {[...(responders.top3 || []), ...(responders.others || [])].map((player) => (
                <div
                  key={player.id || player.username}
                  className={`p-3 rounded-2xl border flex items-center justify-between shadow-sm transition-all ${
                    player.rank === 1
                      ? 'bg-secondary-container/40 border-secondary ring-2 ring-secondary/20'
                      : player.rank <= 3
                        ? 'bg-surface-container-high border-outline-variant ring-1 ring-outline-variant/20'
                        : 'bg-surface-container-lowest border-outline-variant/40'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      player.rank === 1 ? 'bg-secondary text-on-secondary' : 'bg-surface-container-highest text-primary'
                    }`}>
                      #{player.rank}
                    </div>
                    <span className="text-xs font-bold text-primary truncate">
                      {player.username}
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-secondary bg-surface-container px-2 py-0.5 rounded-md shrink-0">
                    {player.timeTakenMs ? `${(player.timeTakenMs / 1000).toFixed(3)}s` : '0.000s'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default ParticipantLiveQuiz;
