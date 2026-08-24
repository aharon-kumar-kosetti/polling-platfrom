import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { sessionAPI } from '../api/client';
import { QRCodeSVG } from 'qrcode.react';
import Sidebar from '../components/ui/Sidebar';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { useToast } from '../components/ui/Toast';
import { Spinner, SkeletonCard } from '../components/ui/Spinner';

const OrganizerDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [sessionType, setSessionType] = useState('quiz');
  const [sessionTitle, setSessionTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [copiedPin, setCopiedPin] = useState(null);
  const [createdSession, setCreatedSession] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Load sessions from API
  const loadSessions = async () => {
    try {
      setLoading(true);
      const res = await sessionAPI.getSessions();
      setSessions(res.sessions || []);
    } catch (err) {
      console.warn('Could not fetch sessions from server, using fallback', err);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const handleCreateSession = async (e) => {
    e.preventDefault();
    if (!sessionTitle.trim()) return;

    try {
      setCreating(true);
      const res = await sessionAPI.createSession(sessionTitle, sessionType);
      if (res.session) {
        setSessions(prev => [res.session, ...prev]);
        setCreatedSession(res.session);
        setShowCreateModal(false);
        toast('Session room launched successfully!');
      }
    } catch (err) {
      console.warn('Backend createSession failed, generating local room:', err.message);
      const fallbackPin = 'QZ-' + Math.floor(1000 + Math.random() * 9000);
      const fallbackSession = {
        id: 'sess_' + Date.now(),
        name: sessionTitle,
        pin: fallbackPin,
        status: 'waiting',
        type: sessionType,
        participants: [],
        questions: [],
        createdAt: new Date().toISOString()
      };
      setSessions(prev => [fallbackSession, ...prev]);
      setCreatedSession(fallbackSession);
      setShowCreateModal(false);
      toast('Room created locally — presenting now.');
    } finally {
      setCreating(false);
    }
  };

  const confirmDeleteSession = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await sessionAPI.deleteSession(deleteTarget.id);
      setSessions(prev => prev.filter(s => s.id !== deleteTarget.id));
      toast('Session deleted.', 'info');
      setDeleteTarget(null);
    } catch (err) {
      console.error(err);
      toast('Failed to delete session. Please try again.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleCopyPin = (pin, e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(pin);
    setCopiedPin(pin);
    setTimeout(() => setCopiedPin(null), 2000);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const openCreateModal = () => {
    setSessionTitle('');
    setCreatedSession(null);
    setShowCreateModal(true);
  };

  // Calculate statistics
  const activeCount = sessions.filter(s => s.status === 'active' || s.status === 'waiting').length;
  const totalPlayers = sessions.reduce((acc, s) => acc + (s.participants?.length || 0), 0);

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col md:flex-row antialiased relative selection:bg-secondary-container selection:text-on-secondary-container">

      {/* Side Navigation (consistent across all workspace pages) */}
      <Sidebar
        active="/dashboard"
        action={
          <button
            onClick={openCreateModal}
            className="w-full bg-primary text-on-primary rounded-full py-3 px-4 font-label-md text-label-md flex items-center justify-center gap-2 hover:bg-primary-container transition-all hover:shadow-md press-effect"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            New Session
          </button>
        }
      />

      {/* Main Content Area */}
      <main className="flex-grow w-full md:pl-64 flex flex-col min-h-screen animate-pageEnter">

        {/* Mobile Top Header */}
        <div className="md:hidden flex items-center justify-between p-4 bg-surface-container-lowest border-b border-outline-variant/30 sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-[24px]">token</span>
            <span className="font-display-sm text-xl font-bold"><span className="text-primary">QuizCore</span></span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={openCreateModal}
              className="bg-primary text-on-primary text-xs px-3 py-1.5 rounded-full flex items-center gap-1 press-effect"
            >
              <span className="material-symbols-outlined text-sm">add</span> New
            </button>
            <button onClick={handleLogout} className="text-error p-1.5">
              <span className="material-symbols-outlined text-[20px]">logout</span>
            </button>
          </div>
        </div>

        {/* Dashboard View Container */}
        <div className="p-6 md:p-12 max-w-7xl w-full mx-auto flex flex-col flex-grow">

          {/* Header & Stats Banner */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
            <div className="animate-slideUp">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary-container/60 text-on-secondary-container text-xs font-label-md mb-2 border border-secondary/20">
                <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
                <span>ORGANIZER WORKSPACE</span>
              </div>
              <h1 className="font-display-sm text-3xl md:text-5xl font-extrabold text-primary tracking-tight">
                Control Hub
              </h1>
              <p className="font-body-md text-sm md:text-base text-on-surface-variant mt-1">
                Launch interactive quizzes, real-time polls, and audience feedback sessions.
              </p>
            </div>

            {/* Metrics Counters */}
            <div className="flex gap-4 w-full md:w-auto animate-slideUp" style={{ animationDelay: '80ms' }}>
              <div className="bg-surface-container-lowest rounded-2xl p-4 border border-outline-variant/30 shadow-sm flex flex-col items-center justify-center flex-1 md:min-w-[130px] transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
                <span className="font-display-sm text-2xl md:text-3xl font-bold text-primary">{activeCount}</span>
                <span className="font-label-sm text-xs text-on-surface-variant uppercase tracking-wider mt-0.5">Active</span>
              </div>
              <div className="bg-surface-container-lowest rounded-2xl p-4 border border-outline-variant/30 shadow-sm flex flex-col items-center justify-center flex-1 md:min-w-[130px] transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
                <span className="font-display-sm text-2xl md:text-3xl font-bold text-primary">{totalPlayers}</span>
                <span className="font-label-sm text-xs text-on-surface-variant uppercase tracking-wider mt-0.5">Players</span>
              </div>
            </div>
          </div>

          {/* Quick Create Action Grid (Bento Style) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">

            {/* New Quiz Card */}
            <button
              onClick={() => {
                setSessionType('quiz');
                setSessionTitle('Quick Quiz Challenge');
                setCreatedSession(null);
                setShowCreateModal(true);
              }}
              className="group relative bg-surface-container-lowest rounded-3xl p-8 border border-outline-variant/30 shadow-sm flex flex-col items-start justify-between min-h-[220px] hover:-translate-y-1.5 transition-all duration-300 overflow-hidden text-left hover:shadow-md hover:border-primary/20 animate-slideUp"
              style={{ animationDelay: '120ms' }}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-secondary-container/40 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110 duration-500"></div>
              <div className="relative z-10 w-14 h-14 rounded-2xl bg-primary text-on-primary flex items-center justify-center shadow-md transition-transform duration-300 group-hover:scale-105">
                <span className="material-symbols-outlined text-2xl">psychology_alt</span>
              </div>
              <div className="relative z-10 mt-4">
                <h3 className="font-headline-lg text-2xl font-bold text-primary mb-1">New Quiz</h3>
                <p className="font-body-md text-sm text-on-surface-variant">Create an interactive multiple-choice live trivia session.</p>
              </div>
              <div className="absolute bottom-6 right-6 opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                <div className="w-9 h-9 rounded-full bg-secondary text-on-secondary flex items-center justify-center shadow">
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </div>
              </div>
            </button>

            {/* New Poll Card */}
            <button
              onClick={() => {
                setSessionType('poll');
                setSessionTitle('Live Audience Poll');
                setCreatedSession(null);
                setShowCreateModal(true);
              }}
              className="group relative bg-surface-container-lowest rounded-3xl p-8 border border-outline-variant/30 shadow-sm flex flex-col items-start justify-between min-h-[220px] hover:-translate-y-1.5 transition-all duration-300 overflow-hidden text-left hover:shadow-md hover:border-secondary/30 animate-slideUp"
              style={{ animationDelay: '200ms' }}
            >
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-surface-container-high rounded-tl-full opacity-40 transition-transform group-hover:scale-110 duration-500"></div>
              <div className="relative z-10 w-14 h-14 rounded-2xl bg-secondary-container text-on-secondary-container flex items-center justify-center border border-secondary/20 shadow-sm transition-transform duration-300 group-hover:scale-105">
                <span className="material-symbols-outlined text-2xl">bar_chart</span>
              </div>
              <div className="relative z-10 mt-4">
                <h3 className="font-headline-lg text-2xl font-bold text-primary mb-1">New Poll</h3>
                <p className="font-body-md text-sm text-on-surface-variant">Gather instant live audience voting data and opinions.</p>
              </div>
              <div className="absolute bottom-6 right-6 opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                <div className="w-9 h-9 rounded-full bg-primary text-on-primary flex items-center justify-center shadow">
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </div>
              </div>
            </button>

            {/* New Feedback Card */}
            <button
              onClick={() => {
                setSessionType('feedback');
                setSessionTitle('Session Q&A & Feedback');
                setCreatedSession(null);
                setShowCreateModal(true);
              }}
              className="group relative bg-surface-container-lowest rounded-3xl p-8 border border-outline-variant/30 shadow-sm flex flex-col items-start justify-between min-h-[220px] hover:-translate-y-1.5 transition-all duration-300 overflow-hidden text-left hover:shadow-md hover:border-primary/20 animate-slideUp"
              style={{ animationDelay: '280ms' }}
            >
              <div className="relative z-10 w-14 h-14 rounded-2xl bg-surface-container-highest text-primary flex items-center justify-center shadow-sm transition-transform duration-300 group-hover:scale-105">
                <span className="material-symbols-outlined text-2xl">forum</span>
              </div>
              <div className="relative z-10 mt-4">
                <h3 className="font-headline-lg text-2xl font-bold text-primary mb-1">New Feedback</h3>
                <p className="font-body-md text-sm text-on-surface-variant">Collect open-ended feedback and moderated Q&amp;A responses.</p>
              </div>
              <div className="absolute bottom-6 right-6 opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                <div className="w-9 h-9 rounded-full bg-primary text-on-primary flex items-center justify-center shadow">
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </div>
              </div>
            </button>

          </div>

          {/* Recent Sessions List */}
          <div className="mb-16">
            <div className="flex justify-between items-center mb-6 pb-3 border-b border-outline-variant/30">
              <h2 className="font-display-sm text-2xl md:text-3xl font-bold text-primary">Your Sessions</h2>
              <button
                onClick={loadSessions}
                className="font-label-md text-sm text-on-surface-variant hover:text-primary flex items-center gap-1 transition-colors press-effect"
              >
                <span className={`material-symbols-outlined text-sm ${loading ? 'animate-spin' : ''}`}>refresh</span> Refresh
              </button>
            </div>

            {loading ? (
              <div className="flex flex-col gap-4">
                <Spinner label="Loading sessions" size={28} />
                {[0, 1].map(i => <SkeletonCard key={i} lines={1} />)}
              </div>
            ) : sessions.length === 0 ? (
              <div className="bg-surface-container-lowest rounded-3xl p-12 text-center border border-dashed border-outline-variant/60 animate-scaleIn">
                <span className="material-symbols-outlined text-5xl text-outline mb-3 inline-block animate-float">devices_other</span>
                <h3 className="font-headline-lg text-xl font-bold text-primary mb-2">No sessions created yet</h3>
                <p className="font-body-md text-on-surface-variant max-w-md mx-auto mb-6">
                  Create your first interactive quiz or poll to share a PIN code with your participants.
                </p>
                <button
                  onClick={() => {
                    setSessionTitle('My First Quiz');
                    openCreateModal();
                  }}
                  className="bg-primary text-on-primary px-6 py-3 rounded-full font-label-md hover:bg-primary-container transition-all press-effect shadow-sm"
                >
                  Create First Session
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {sessions.map((session, idx) => {
                  const isLive = session.status === 'active' || session.status === 'waiting';
                  return (
                    <div
                      key={session.id}
                      className="stagger-item bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:border-primary/30 transition-all shadow-sm hover:shadow group"
                      style={{ animationDelay: `${Math.min(idx * 60, 360)}ms` }}
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isLive ? 'bg-secondary-container text-on-secondary-container' : 'bg-surface-container-high text-on-surface-variant'}`}>
                          <span className="material-symbols-outlined">
                            {session.type === 'poll' ? 'bar_chart' : session.type === 'feedback' ? 'forum' : 'psychology_alt'}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-3 flex-wrap">
                            <h4 className="font-label-md text-lg font-bold text-primary truncate">{session.name}</h4>
                            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                              isLive ? 'bg-secondary text-on-secondary animate-pulse' : 'bg-surface-container-high text-on-surface-variant'
                            }`}>
                              {session.status}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 mt-1 text-xs text-on-surface-variant">
                            <span>PIN: <strong className="text-primary font-mono">{session.pin}</strong></span>
                            <span aria-hidden="true">•</span>
                            <span>{session.participants?.length || 0} participants</span>
                            <span aria-hidden="true">•</span>
                            <span>{new Date(session.createdAt || Date.now()).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 w-full md:w-auto flex-wrap justify-end pt-3 md:pt-0 border-t md:border-t-0 border-outline-variant/20">
                        <button
                          onClick={(e) => handleCopyPin(session.pin, e)}
                          className="px-3 py-1.5 rounded-full border border-outline-variant/50 text-xs font-label-md hover:bg-surface-container flex items-center gap-1.5 transition-colors press-effect"
                          title="Copy PIN"
                        >
                          <span className="material-symbols-outlined text-[14px]">
                            {copiedPin === session.pin ? 'check' : 'content_copy'}
                          </span>
                          {copiedPin === session.pin ? 'Copied!' : 'PIN'}
                        </button>

                        <Link
                          to={`/builder/${session.id}`}
                          className="px-3.5 py-1.5 rounded-full bg-surface-container-high text-on-surface-variant text-xs font-label-md hover:bg-surface-container-highest transition-all flex items-center gap-1 shadow-sm press-effect"
                        >
                          <span>Edit Questions</span>
                          <span className="material-symbols-outlined text-[14px]">edit_document</span>
                        </Link>

                        <Link
                          to={`/host/${session.id}?pin=${session.pin}&title=${encodeURIComponent(session.name)}`}
                          className="px-3.5 py-1.5 rounded-full bg-secondary text-on-secondary text-xs font-label-md hover:brightness-95 transition-all flex items-center gap-1 shadow-sm press-effect"
                        >
                          <span>Host Live</span>
                          <span className="material-symbols-outlined text-[14px]">sensors</span>
                        </Link>

                        <Link
                          to={`/waiting-room?pin=${session.pin}`}
                          className="px-3.5 py-1.5 rounded-full bg-primary text-on-primary text-xs font-label-md hover:bg-primary-container transition-all flex items-center gap-1 press-effect"
                        >
                          <span>Player View</span>
                          <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                        </Link>

                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteTarget(session); }}
                          className="p-2 text-outline hover:text-error rounded-full hover:bg-error-container/30 transition-all press-effect shrink-0"
                          title="Delete Session"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </main>

      {/* Create Session Modal */}
      {!createdSession && (
        <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)}>
          <div className="p-8 relative">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-6 right-6 text-on-surface-variant hover:text-primary p-2 rounded-full hover:bg-surface-container transition-colors"
              aria-label="Close"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>

            <h3 className="font-display-sm text-2xl font-bold text-primary mb-2">Create New Session</h3>
            <p className="font-body-md text-sm text-on-surface-variant mb-6">
              Set up a real-time room. A full-screen QR presentation deck and PIN will be generated.
            </p>

            <form onSubmit={handleCreateSession} className="flex flex-col gap-5">
              <div>
                <label className="block font-label-md text-xs uppercase tracking-wider text-on-surface-variant mb-2">
                  Session Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['quiz', 'poll', 'feedback'].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setSessionType(type)}
                      className={`py-3 px-4 rounded-xl border text-xs font-label-md capitalize transition-all duration-200 press-effect ${
                        sessionType === type
                          ? 'bg-primary text-on-primary border-primary shadow-sm scale-[1.02]'
                          : 'border-outline-variant/50 hover:bg-surface-container'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-label-md text-xs uppercase tracking-wider text-on-surface-variant mb-2" htmlFor="title">
                  Session Name / Title
                </label>
                <input
                  id="title"
                  type="text"
                  value={sessionTitle}
                  onChange={(e) => setSessionTitle(e.target.value)}
                  placeholder="e.g. Design Systems 101, Team Trivia..."
                  className="w-full h-12 bg-surface-container-lowest border border-outline-variant rounded-xl px-4 font-body-md text-body-md focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-shadow"
                  required
                  autoFocus
                />
              </div>

              <div className="flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-5 py-2.5 rounded-full font-label-md text-sm text-on-surface-variant hover:bg-surface-container transition-colors press-effect"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="bg-primary text-on-primary px-6 py-2.5 rounded-full font-label-md text-sm hover:bg-primary-container transition-all disabled:opacity-50 flex items-center gap-2 font-bold shadow-sm press-effect"
                >
                  {creating && <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />}
                  {creating ? 'Creating...' : 'Launch Room Presenter'}
                  {!creating && <span className="material-symbols-outlined text-sm">fullscreen</span>}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* FULL-PAGE PRESENTATION VIEW (NOT A POPUP) */}
      {createdSession && (
        <div className="fixed inset-0 z-50 bg-surface min-h-screen w-screen flex flex-col justify-between p-6 md:p-12 overflow-y-auto animate-fadeIn select-none">

          {/* Top Bar */}
          <header className="flex items-center justify-between w-full max-w-7xl mx-auto pb-6 border-b border-outline-variant/30">
            <Link to="/dashboard" className="font-display-sm text-xl font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-[24px] text-secondary">token</span>
              <span className="text-primary">QuizCore</span>
            </Link>

            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary-container/70 text-on-secondary-container text-xs font-label-md border border-secondary/30 shadow-sm">
              <span className="w-2.5 h-2.5 rounded-full bg-secondary animate-ping"></span>
              <span className="font-bold tracking-wider">LIVE AUDIENCE PRESENTATION</span>
            </div>

            <button
              onClick={() => setCreatedSession(null)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-outline-variant hover:bg-surface-container text-xs font-label-md transition-colors press-effect"
            >
              <span className="material-symbols-outlined text-sm">close</span>
              <span>Exit Presenter</span>
            </button>
          </header>

          {/* Main Full-Screen Presenter Stage */}
          <main className="flex-1 max-w-7xl mx-auto w-full flex flex-col items-center justify-center py-8 my-auto animate-slideUp">

            {/* Title */}
            <div className="text-center mb-8">
              <h1 className="font-display-sm text-4xl md:text-6xl font-extrabold text-primary mb-3 tracking-tight">
                {createdSession.name}
              </h1>
              <p className="text-base md:text-xl text-on-surface-variant font-body-md">
                Scan with your phone camera or visit <span className="font-mono font-bold text-primary px-2 py-0.5 bg-surface-container rounded-lg">{window.location.origin}/join</span>
              </p>
            </div>

            {/* Giant Presenter Layout */}
            <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-surface-container-lowest rounded-3xl p-8 md:p-12 border border-outline-variant/40 shadow-2xl">

              {/* Left Column: Extra Large QR Code (7 Cols) */}
              <div className="lg:col-span-6 flex flex-col items-center justify-center">
                <div className="p-6 md:p-8 bg-white rounded-3xl shadow-2xl border-4 border-surface-container-high flex items-center justify-center transition-transform hover:scale-[1.02] duration-300">
                  <QRCodeSVG
                    value={`${window.location.origin}/join?pin=${createdSession.pin}`}
                    size={320}
                    level="H"
                    bgColor="#ffffff"
                    fgColor="#111315"
                  />
                </div>
                <div className="mt-4 flex items-center gap-2 text-sm text-on-surface-variant font-label-md bg-surface-container px-4 py-1.5 rounded-full border border-outline-variant/30">
                  <span className="material-symbols-outlined text-base text-secondary">photo_camera</span>
                  <span>Point any smartphone camera to join directly</span>
                </div>
              </div>

              {/* Right Column: Giant Room PIN & Direct Link (6 Cols) */}
              <div className="lg:col-span-6 flex flex-col items-center lg:items-start text-center lg:text-left gap-6 pl-0 lg:pl-6">

                {/* Big PIN */}
                <div className="w-full bg-surface-container-low rounded-3xl p-6 md:p-8 border border-outline-variant/40 shadow-inner">
                  <span className="text-xs md:text-sm uppercase tracking-widest text-on-surface-variant font-bold">Room PIN Code</span>
                  <div className="font-mono text-5xl md:text-7xl font-black text-primary tracking-widest my-2">
                    {createdSession.pin}
                  </div>
                  <button
                    onClick={(e) => handleCopyPin(createdSession.pin, e)}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-surface-container-highest hover:bg-outline-variant/40 text-xs font-label-md transition-colors mt-2 press-effect"
                  >
                    <span className="material-symbols-outlined text-sm">
                      {copiedPin === createdSession.pin ? 'check' : 'content_copy'}
                    </span>
                    <span>{copiedPin === createdSession.pin ? 'PIN Copied!' : 'Copy PIN Code'}</span>
                  </button>
                </div>

                {/* Direct Link Box */}
                <div className="w-full bg-surface-container rounded-2xl p-4 border border-outline-variant/30 text-left">
                  <div className="text-xs text-on-surface-variant uppercase tracking-wider font-bold mb-1.5">Direct URL</div>
                  <div className="font-mono text-xs md:text-sm text-primary truncate bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/30 select-all font-semibold">
                    {`${window.location.origin}/join?pin=${createdSession.pin}`}
                  </div>
                  <button
                    onClick={(e) => {
                      navigator.clipboard.writeText(`${window.location.origin}/join?pin=${createdSession.pin}`);
                      setCopiedPin('link');
                      setTimeout(() => setCopiedPin(null), 2000);
                    }}
                    className="mt-2 text-xs text-secondary font-bold hover:underline flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">content_copy</span>
                    <span>{copiedPin === 'link' ? 'Link Copied to Clipboard!' : 'Copy Direct Link'}</span>
                  </button>
                </div>

              </div>

            </div>

          </main>

          {/* Bottom Presenter Actions Bar */}
          <footer className="flex flex-wrap gap-4 items-center justify-between w-full max-w-7xl mx-auto pt-6 border-t border-outline-variant/30 animate-slideUp" style={{ animationDelay: '120ms' }}>
            <button
              onClick={() => setCreatedSession(null)}
              className="px-6 py-3.5 rounded-full font-label-md text-sm border border-outline-variant hover:bg-surface-container transition-colors flex items-center gap-2 press-effect"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              <span>Back to Dashboard</span>
            </button>

            <Link
              to={`/host/${createdSession.id}?pin=${createdSession.pin}&title=${encodeURIComponent(createdSession.name)}`}
              className="bg-primary text-on-primary px-10 py-4 rounded-full font-label-md text-base hover:bg-primary-container transition-all flex items-center gap-2 shadow-xl hover:shadow-2xl font-bold press-effect"
            >
              <span className="material-symbols-outlined text-lg">sensors</span>
              <span>Launch Live Host Deck</span>
              <span className="material-symbols-outlined text-lg">arrow_forward</span>
            </Link>
          </footer>

        </div>
      )}

      {/* Delete Confirmation (in-app styled dialog) */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDeleteSession}
        busy={deleting}
        tone="danger"
        title="Delete this session?"
        message={`"${deleteTarget?.name || ''}" and its questions will be permanently removed. This action cannot be undone.`}
        confirmLabel="Delete Session"
        cancelLabel="Keep It"
      />

    </div>
  );
};

export default OrganizerDashboard;

