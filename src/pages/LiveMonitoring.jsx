import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import socketManager from '../sockets/socketManager';
import { QRCodeSVG } from 'qrcode.react';
import { questionAPI, sessionAPI } from '../api/client';

const DEFAULT_STARTER_QUESTIONS = [
  {
    id: 'starter_1',
    text: 'What does CSS stand for in web development?',
    type: 'single_choice',
    timeLimitSeconds: 30,
    options: [
      { id: 'a', text: 'Cascading Style Sheets', isCorrect: true, count: 0 },
      { id: 'b', text: 'Creative System Styling', isCorrect: false, count: 0 },
      { id: 'c', text: 'Computer Style Syntax', isCorrect: false, count: 0 },
      { id: 'd', text: 'Central Sheet Standard', isCorrect: false, count: 0 },
    ]
  },
  {
    id: 'starter_2',
    text: 'Which HTTP response status code represents "Not Found"?',
    type: 'single_choice',
    timeLimitSeconds: 25,
    options: [
      { id: 'a', text: '200 OK', isCorrect: false, count: 0 },
      { id: 'b', text: '403 Forbidden', isCorrect: false, count: 0 },
      { id: 'c', text: '404 Not Found', isCorrect: true, count: 0 },
      { id: 'd', text: '500 Server Error', isCorrect: false, count: 0 },
    ]
  },
  {
    id: 'starter_3',
    text: 'True or False: JavaScript is a compiled language that only runs on servers.',
    type: 'true_false',
    timeLimitSeconds: 20,
    options: [
      { id: 'a', text: 'True', isCorrect: false, count: 0 },
      { id: 'b', text: 'False', isCorrect: true, count: 0 },
    ]
  }
];

const LiveMonitoring = () => {
  const { sessionId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const urlPin = searchParams.get('pin') || 'TECH-88';
  const urlTitle = searchParams.get('title') || 'Interactive Quiz Masterclass';

  const [pin, setPin] = useState(urlPin);
  const [sessionTitle, setSessionTitle] = useState(urlTitle);
  const [players, setPlayers] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [bankQuestions, setBankQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [recentJoinNotice, setRecentJoinNotice] = useState(null);

  // Fetch session details, question bank, and connect socket
  useEffect(() => {
    // 1. Connect socket for organizer
    socketManager.connect();
    
    if (sessionId) {
      socketManager.emit('join_room', { sessionId, username: 'Host Organizer' });
    }

    // 2. Fetch session info & participants from database
    const loadSessionDetails = async () => {
      if (!sessionId) return;
      try {
        const res = await sessionAPI.getSession(sessionId);
        if (res.session) {
          if (res.session.pin) setPin(res.session.pin);
          if (res.session.name) setSessionTitle(res.session.name);
          if (res.session.participants && res.session.participants.length > 0) {
            setPlayers(prev => {
              const merged = [...prev];
              res.session.participants.forEach(p => {
                if (!merged.some(m => m.id === p.id || m.username === p.username)) {
                  merged.push({ id: p.id, username: p.username, joinedAt: p.joinedAt });
                }
              });
              return merged;
            });
          }
        }
      } catch (err) {
        console.warn('Could not fetch DB session details:', err);
      }
    };
    loadSessionDetails();

    // 3. Fetch question bank
    const fetchBank = async () => {
      try {
        const res = await questionAPI.getSavedQuestions();
        if (res.questions && res.questions.length > 0) {
          const parsed = res.questions.reduce((acc, q) => {
            try {
              acc.push({ ...q, options: JSON.parse(q.options) });
            } catch (e) {
              console.warn(`Skipping question ${q.id} with malformed options`);
            }
            return acc;
          }, []);
          setBankQuestions(parsed);
        } else {
          // Fallback to starter questions so host can play immediately
          setBankQuestions(DEFAULT_STARTER_QUESTIONS);
        }
      } catch (err) {
        console.error('Failed to load question bank, using default starters', err);
        setBankQuestions(DEFAULT_STARTER_QUESTIONS);
      }
    };
    fetchBank();

    // 4. Socket Listeners for Players & Answers
    const handleParticipantsUpdated = (list) => {
      if (Array.isArray(list)) {
        setPlayers(list);
      }
    };

    const handleParticipantJoined = (data) => {
      if (data?.participant) {
        setPlayers(prev => {
          if (prev.some(p => p.id === data.participant.id || p.socketId === data.participant.socketId)) {
            return prev;
          }
          return [...prev, data.participant];
        });
        setRecentJoinNotice(`${data.participant.username} joined!`);
        setTimeout(() => setRecentJoinNotice(null), 3000);
      }
    };

    const handleParticipantLeft = (data) => {
      if (data?.participant) {
        setPlayers(prev => prev.filter(p => p.id !== data.participant.id && p.socketId !== data.participant.socketId));
      }
    };

    const handleAnswerTally = ({ questionId, options }) => {
      setQuestions(prev => prev.map(q => {
        if (q.id === questionId) {
          return { ...q, options };
        }
        return q;
      }));
    };

    socketManager.on('participants_updated', handleParticipantsUpdated);
    socketManager.on('participant_joined', handleParticipantJoined);
    socketManager.on('participant_left', handleParticipantLeft);
    socketManager.on('answer_tally', handleAnswerTally);

    return () => {
      socketManager.off('participants_updated', handleParticipantsUpdated);
      socketManager.off('participant_joined', handleParticipantJoined);
      socketManager.off('participant_left', handleParticipantLeft);
      socketManager.off('answer_tally', handleAnswerTally);
      socketManager.disconnect();
    };
  }, [sessionId]);

  const currentQ = questions[currentQuestionIndex] || null;
  // Fallback for UI if no active question
  const displayQ = currentQ || { 
    text: 'Waiting for Host to push a question...', 
    options: [] 
  };
  const totalResponses = displayQ.options.reduce((acc, opt) => acc + (opt.count || 0), 0);

  // Timer countdown
  useEffect(() => {
    let interval = null;
    if (isTimerRunning && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    } else if (timeLeft === 0 && isTimerRunning) {
      setIsTimerRunning(false);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timeLeft]);

  const handlePushFromBank = (bankQ) => {
    // Add count:0 to options for tracking
    const newLiveQ = {
      ...bankQ,
      options: bankQ.options.map(o => ({ ...o, count: 0 }))
    };
    
    const newQuestions = [...questions, newLiveQ];
    setQuestions(newQuestions);
    const newIndex = newQuestions.length - 1;
    setCurrentQuestionIndex(newIndex);
    
    setTimeLeft(bankQ.timeLimitSeconds || 30);
    setIsTimerRunning(true);

    const targetSession = sessionId || pin;
    if (!targetSession) {
      console.warn('Cannot push question: no sessionId or pin');
      return;
    }

    socketManager.emit('organizer:next_question', {
      sessionId: targetSession,
      question: newLiveQ
    });
  };

  const handleEndQuiz = () => {
    const targetSession = sessionId || pin;
    if (targetSession) {
      socketManager.emit('organizer:end_quiz', { sessionId: targetSession });
    }
    navigate(`/leaderboard?pin=${pin}&title=${encodeURIComponent(sessionTitle)}`);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(pin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col antialiased selection:bg-secondary-container selection:text-on-secondary-container h-screen overflow-hidden">
      
      {/* Real-time Join Toast Banner */}
      {recentJoinNotice && (
        <div className="fixed top-24 right-8 z-50 bg-secondary text-on-secondary px-5 py-2.5 rounded-2xl shadow-xl font-label-md text-xs font-bold flex items-center gap-2 animate-bounce">
          <span className="material-symbols-outlined text-sm">person_add</span>
          <span>{recentJoinNotice}</span>
        </div>
      )}

      {/* Top Host Command Bar */}
      <header className="h-20 bg-surface-container-lowest border-b border-outline-variant/30 px-6 md:px-12 flex items-center justify-between sticky top-0 z-30 shadow-sm shrink-0">
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
      <main className="flex-1 w-full flex flex-row overflow-hidden">
        
        {/* Left: Active Live Deck */}
        <section className="flex-1 p-6 md:p-8 overflow-y-auto flex flex-col gap-6">
          
          {/* Metric Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/30 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-label-md text-on-surface-variant uppercase tracking-wider">Connected Players</span>
                <div className="font-display-sm text-3xl font-bold text-primary mt-1 flex items-center gap-2">
                  <span>{players.length}</span>
                  {players.length > 0 && (
                    <span className="w-2.5 h-2.5 rounded-full bg-secondary animate-pulse"></span>
                  )}
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-secondary-container/50 text-on-secondary-container flex items-center justify-center">
                <span className="material-symbols-outlined">group</span>
              </div>
            </div>

            <div className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/30 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-label-md text-on-surface-variant uppercase tracking-wider">Answers Submitted</span>
                <div className="font-display-sm text-3xl font-bold text-primary mt-1">{totalResponses}</div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-surface-container-highest text-primary flex items-center justify-center">
                <span className="material-symbols-outlined">how_to_reg</span>
              </div>
            </div>

            <div className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/30 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-label-md text-on-surface-variant uppercase tracking-wider">Timer Remaining</span>
                <div className={`font-display-sm text-3xl font-bold mt-1 ${timeLeft <= 5 && timeLeft > 0 ? 'text-error animate-pulse' : 'text-primary'}`}>
                  {timeLeft}s
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-surface-container-highest text-primary flex items-center justify-center">
                <span className="material-symbols-outlined">timer</span>
              </div>
            </div>
          </div>

          {/* Connected Players Live Roster */}
          <div className="bg-surface-container-lowest rounded-2xl p-4 md:p-5 border border-outline-variant/30 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-secondary animate-ping"></span>
                <span className="font-label-md text-xs uppercase tracking-wider font-bold text-primary">
                  Live Player Roster ({players.length})
                </span>
              </div>
              <span className="text-xs text-on-surface-variant">
                Join PIN: <strong className="font-mono text-primary font-bold">{pin}</strong>
              </span>
            </div>

            {players.length === 0 ? (
              <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-surface-container-low rounded-xl border border-dashed border-outline-variant/60 gap-3 text-center sm:text-left">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface-variant">
                    <span className="material-symbols-outlined text-xl animate-spin">sync</span>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-primary">Waiting for players to join...</div>
                    <div className="text-[11px] text-on-surface-variant">
                      Direct participants to <span className="font-mono font-bold text-primary">{window.location.origin}/join</span> with PIN <span className="font-mono font-bold text-primary">{pin}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowQRModal(true)}
                  className="px-3 py-1.5 bg-primary text-on-primary rounded-full text-xs font-label-md hover:bg-primary-container transition-all flex items-center gap-1 shrink-0"
                >
                  <span className="material-symbols-outlined text-sm">qr_code_2</span>
                  Display QR Code
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2.5 max-h-36 overflow-y-auto py-1">
                {players.map((player, idx) => (
                  <div
                    key={player.id || player.socketId || idx}
                    className="flex items-center gap-2 bg-surface-container-low border border-outline-variant/40 rounded-full px-3 py-1.5 shadow-sm animate-fadeIn hover:border-secondary transition-colors"
                  >
                    <div className="w-6 h-6 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center text-[10px] font-bold">
                      {(player.username || 'P').charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xs font-bold text-primary">{player.username}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Live Question Presentation Deck */}
          <div className="bg-surface-container-lowest rounded-3xl p-8 md:p-10 border border-outline-variant/30 shadow-editorial flex-1 flex flex-col">
            
            <div className="flex justify-between items-center mb-6">
              <span className="px-3.5 py-1 bg-surface-container-high rounded-full font-label-sm text-xs font-bold uppercase tracking-wider">
                {questions.length > 0 ? `Active Question ${currentQuestionIndex + 1} of ${questions.length}` : 'No Active Question'}
              </span>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsTimerRunning(!isTimerRunning)} 
                  disabled={timeLeft === 0}
                  className="px-3 py-1 rounded-lg border border-outline-variant/50 text-xs font-label-md hover:bg-surface-container disabled:opacity-50"
                >
                  {isTimerRunning ? 'Pause Timer' : 'Resume Timer'}
                </button>
              </div>
            </div>

            <h2 className="font-headline-lg text-2xl md:text-3xl text-primary font-bold mb-8">
              {displayQ.text}
            </h2>

            {displayQ.imageUrl && (
              <div className="mb-6 rounded-2xl overflow-hidden border border-outline-variant/30 max-h-64 flex justify-center bg-surface-container-low">
                <img src={displayQ.imageUrl} alt="Question Attachment" className="max-h-64 object-contain" />
              </div>
            )}

            {/* Response Bars / Option Breakdown */}
            <div className="flex flex-col gap-4 mb-8 flex-1">
              {displayQ.options.map((opt, idx) => {
                const percentage = totalResponses > 0 ? Math.round(((opt.count || 0) / totalResponses) * 100) : 0;
                return (
                  <div 
                    key={opt.id || idx}
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
                          {opt.id || String.fromCharCode(97 + idx)}
                        </span>
                        <span className="font-medium text-primary text-sm md:text-base">{opt.text}</span>
                        {opt.imageUrl && (
                          <img src={opt.imageUrl} alt="Option thumbnail" className="h-8 w-8 object-cover rounded-md border border-outline-variant/40" />
                        )}
                      </div>

                      <div className="flex items-center gap-3 font-mono">
                        <span className="text-xs font-bold text-on-surface-variant">{opt.count || 0} votes</span>
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
                onClick={handleEndQuiz}
                className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-primary text-on-primary font-label-md text-sm hover:bg-primary-container transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
              >
                <span>Finish & Show Final Leaderboard</span>
                <span className="material-symbols-outlined text-[18px]">flag</span>
              </button>
            </div>

          </div>

        </section>

        {/* Right: Question Bank Sidebar */}
        <aside className="w-80 md:w-96 bg-surface-container-lowest border-l border-outline-variant/30 flex flex-col shrink-0">
          <div className="p-4 border-b border-outline-variant/30 bg-surface-container-low flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">library_books</span>
              <span className="font-label-md text-sm font-bold text-primary">Question Bank</span>
            </div>
            <span className="text-xs bg-surface-container-highest px-2 py-0.5 rounded-full font-bold">{bankQuestions.length}</span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
            {bankQuestions.length === 0 ? (
              <div className="text-center text-sm text-on-surface-variant py-8">
                Your bank is empty. <Link to="/builder" className="text-secondary hover:underline">Create questions in Builder</Link>
              </div>
            ) : (
              bankQuestions.map((bankQ) => (
                <div key={bankQ.id} className="bg-surface-container-low border border-outline-variant/30 rounded-2xl p-4 flex flex-col gap-3 hover:border-outline transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-secondary bg-secondary-container/20 px-2 py-0.5 rounded-full">
                      {bankQ.type ? bankQ.type.replace('_', ' ') : 'Question'}
                    </span>
                    <span className="text-xs font-mono text-on-surface-variant">{bankQ.timeLimitSeconds || 30}s</span>
                  </div>
                  <p className="text-sm font-bold text-primary line-clamp-2">{bankQ.text}</p>
                  
                  <button 
                    onClick={() => handlePushFromBank(bankQ)}
                    className="w-full bg-primary text-on-primary rounded-xl py-2 text-xs font-bold hover:bg-primary-container transition-colors flex justify-center items-center gap-1.5 mt-1 active:scale-95 shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[14px]">send</span>
                    Push Live Now
                  </button>
                </div>
              ))
            )}
          </div>
        </aside>

      </main>

      {/* QR Code Share Modal */}
      {showQRModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-surface-container-lowest rounded-3xl p-6 md:p-10 max-w-4xl w-full text-center border border-outline-variant/30 shadow-2xl relative animate-fadeIn">
            
            <button 
              onClick={() => setShowQRModal(false)}
              className="absolute top-6 right-6 p-2 rounded-full hover:bg-surface-container text-on-surface-variant z-10 transition-colors"
            >
              <span className="material-symbols-outlined text-2xl">close</span>
            </button>

            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary-container/60 text-on-secondary-container text-xs font-label-md mb-3 border border-secondary/20">
              <span className="w-2 h-2 rounded-full bg-secondary animate-ping"></span>
              <span>LIVE ROOM PRESENTATION</span>
            </div>

            <h2 className="font-display-sm text-2xl md:text-3xl font-bold text-primary mb-1">
              Join {sessionTitle}
            </h2>
            <p className="text-xs md:text-sm text-on-surface-variant mb-6">
              Scan the QR code with your phone camera or visit <span className="font-mono font-bold text-primary">{window.location.origin}/join</span>
            </p>

            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-surface-container-low rounded-3xl p-6 md:p-8 border border-outline-variant/40 shadow-inner mb-6">
              
              {/* Left: Huge QR Code */}
              <div className="flex flex-col items-center">
                <div className="p-5 bg-white rounded-3xl shadow-xl border-4 border-surface-container-highest flex items-center justify-center">
                  <QRCodeSVG 
                    value={`${window.location.origin}/join?pin=${pin}`} 
                    size={260}
                    level="H"
                    bgColor="#ffffff"
                    fgColor="#1a1c1e"
                  />
                </div>
                <div className="mt-3 flex items-center gap-1.5 text-xs text-on-surface-variant font-label-md">
                  <span className="material-symbols-outlined text-sm text-secondary">photo_camera</span>
                  <span>Point any phone camera to join</span>
                </div>
              </div>

              {/* Right: Big PIN & Details */}
              <div className="flex flex-col items-center md:items-start text-center md:text-left gap-4">
                <div>
                  <span className="text-xs uppercase tracking-widest text-on-surface-variant font-bold">Room PIN Code</span>
                  <div className="font-mono text-4xl md:text-5xl font-extrabold text-primary tracking-widest my-1">
                    {pin}
                  </div>
                </div>

                <div className="w-full bg-surface-container rounded-2xl p-4 border border-outline-variant/30 text-left">
                  <div className="text-[11px] text-on-surface-variant uppercase tracking-wider font-bold mb-1">Direct URL</div>
                  <div className="font-mono text-xs text-primary truncate bg-surface-container-lowest p-2 rounded-lg border border-outline-variant/30 select-all">
                    {`${window.location.origin}/join?pin=${pin}`}
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/join?pin=${pin}`);
                      handleCopy();
                    }}
                    className="mt-2 text-xs text-secondary font-bold hover:underline flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">content_copy</span>
                    {copied ? 'Link Copied to Clipboard!' : 'Copy Direct Link'}
                  </button>
                </div>

                <button 
                  onClick={handleCopy}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full bg-surface-container-highest hover:bg-outline-variant/30 text-xs font-label-md transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">
                    {copied ? 'check' : 'pin'}
                  </span>
                  {copied ? 'PIN Copied!' : 'Copy PIN Code'}
                </button>
              </div>

            </div>

            <button 
              onClick={() => setShowQRModal(false)}
              className="px-8 py-3 rounded-full bg-primary text-on-primary text-sm font-label-md hover:bg-primary-container transition-all shadow-md"
            >
              Continue to Host Deck
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default LiveMonitoring;
