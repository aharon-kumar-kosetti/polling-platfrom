import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { sessionAPI } from '../api/client';

const OrganizerDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [sessionType, setSessionType] = useState('quiz');
  const [sessionTitle, setSessionTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [copiedPin, setCopiedPin] = useState(null);
  const [createdSession, setCreatedSession] = useState(null);

  // Load sessions from API
  const loadSessions = async () => {
    try {
      setLoading(true);
      const res = await sessionAPI.getSessions();
      if (res.sessions && res.sessions.length > 0) {
        setSessions(res.sessions);
      } else {
        // Sample starter sessions if none exist yet
        setSessions([
          {
            id: 'sess_default_1',
            name: 'Tech All-Hands Q3 Challenge',
            pin: 'TECH-88',
            status: 'active',
            type: 'quiz',
            participants: [{ id: '1' }, { id: '2' }, { id: '3' }],
            questions: [{ id: 'q1' }, { id: 'q2' }],
            createdAt: new Date().toISOString()
          },
          {
            id: 'sess_default_2',
            name: 'Design System Sprint Feedback',
            pin: 'DS-2024',
            status: 'finished',
            type: 'poll',
            participants: [{ id: '1' }, { id: '2' }],
            questions: [{ id: 'q1' }],
            createdAt: new Date(Date.now() - 86400000).toISOString()
          }
        ]);
      }
    } catch (err) {
      console.warn('Could not fetch sessions from server, using fallback', err);
      setSessions([
        {
          id: 'sess_fallback_1',
          name: 'Tech All-Hands Q3 Challenge',
          pin: 'TECH-88',
          status: 'active',
          type: 'quiz',
          participants: [{ id: '1' }, { id: '2' }, { id: '3' }],
          questions: [{ id: 'q1' }, { id: 'q2' }],
          createdAt: new Date().toISOString()
        }
      ]);
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
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteSession = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this session?')) return;
    try {
      await sessionAPI.deleteSession(id);
      setSessions(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      console.error(err);
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

  // Calculate statistics
  const activeCount = sessions.filter(s => s.status === 'active' || s.status === 'waiting').length;
  const totalPlayers = sessions.reduce((acc, s) => acc + (s.participants?.length || 0), 0);

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col md:flex-row antialiased relative selection:bg-secondary-container selection:text-on-secondary-container">
      
      {/* Side Navigation (Desktop/Tablet) */}
      <aside className="hidden md:flex h-screen w-64 fixed left-0 top-0 flex-col py-6 bg-surface-container-low border-r border-outline-variant/30 z-40">
        <div className="px-6 mb-6">
          <Link to="/" className="font-display-sm text-display-sm text-primary flex items-center gap-2 mb-6">
            <span className="material-symbols-outlined text-[28px] text-secondary">token</span>
            QUIZCORE
          </Link>
          
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm">
            <div className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-lg">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'O'}
            </div>
            <div className="overflow-hidden">
              <div className="font-label-md text-label-md text-primary truncate font-bold">{user?.name || 'Organizer'}</div>
              <div className="text-[11px] text-on-surface-variant truncate">{user?.email || 'organizer@quizcore.com'}</div>
            </div>
          </div>
        </div>

        <div className="px-6 mb-4">
          <button 
            onClick={() => {
              setSessionTitle('');
              setCreatedSession(null);
              setShowCreateModal(true);
            }}
            className="w-full bg-primary text-on-primary rounded-full py-3 px-4 font-label-md text-label-md flex items-center justify-center gap-2 hover:bg-primary-container transition-all hover:shadow-md active:scale-95"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            New Session
          </button>
        </div>

        {/* Nav Links */}
        <nav className="flex flex-col gap-1.5 px-3 flex-grow">
          <Link to="/dashboard" className="bg-secondary-container text-on-secondary-container rounded-full px-4 py-2.5 flex items-center gap-3 font-label-md text-sm transition-colors">
            <span className="material-symbols-outlined text-[20px]">dashboard</span>
            Dashboard
          </Link>

          <Link to="/builder" className="text-on-surface-variant hover:bg-surface-container-highest rounded-full px-4 py-2.5 flex items-center gap-3 font-label-md text-sm transition-colors">
            <span className="material-symbols-outlined text-[20px]">edit_document</span>
            Session Builder
          </Link>
          
          <Link to="/analytics" className="text-on-surface-variant hover:bg-surface-container-highest rounded-full px-4 py-2.5 flex items-center gap-3 font-label-md text-sm transition-colors">
            <span className="material-symbols-outlined text-[20px]">analytics</span>
            Analytics
          </Link>

          <Link to="/feedback/responses" className="text-on-surface-variant hover:bg-surface-container-highest rounded-full px-4 py-2.5 flex items-center gap-3 font-label-md text-sm transition-colors">
            <span className="material-symbols-outlined text-[20px]">forum</span>
            Feedback Insights
          </Link>

          <Link to="/settings" className="text-on-surface-variant hover:bg-surface-container-highest rounded-full px-4 py-2.5 flex items-center gap-3 font-label-md text-sm transition-colors">
            <span className="material-symbols-outlined text-[20px]">settings</span>
            Settings
          </Link>
          
          <Link 
            to="/join" 
            className="text-on-surface-variant hover:bg-surface-container-highest rounded-full px-4 py-2.5 flex items-center gap-3 font-label-md text-sm transition-colors mt-2 border-t border-outline-variant/20 pt-3"
          >
            <span className="material-symbols-outlined text-[20px]">login</span>
            Join as Player
          </Link>
        </nav>

        {/* Footer Nav & Logout */}
        <div className="mt-auto px-4 pt-4 border-t border-outline-variant/30 flex flex-col gap-2">
          <button 
            onClick={handleLogout}
            className="text-error hover:bg-error-container/20 rounded-full px-4 py-2.5 flex items-center gap-3 font-label-md text-sm transition-colors text-left"
          >
            <span className="material-symbols-outlined text-[20px]">logout</span>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-grow w-full md:pl-64 flex flex-col min-h-screen">
        
        {/* Mobile Top Header */}
        <div className="md:hidden flex items-center justify-between p-4 bg-surface-container-lowest border-b border-outline-variant/30 sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-[24px]">token</span>
            <span className="font-display-sm text-xl font-bold">QUIZCORE</span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                setSessionTitle('');
                setCreatedSession(null);
                setShowCreateModal(true);
              }}
              className="bg-primary text-on-primary text-xs px-3 py-1.5 rounded-full flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">add</span> New
            </button>
            <button onClick={handleLogout} className="text-error p-1.5">
              <span className="material-symbols-outlined text-[20px]">logout</span>
            </button>
          </div>
        </div>

        {/* Ambient Decorative Background Blur */}
        <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-secondary-container/20 rounded-full blur-[120px] -z-10 pointer-events-none translate-x-1/3 -translate-y-1/3"></div>
        <div className="fixed bottom-0 left-[300px] w-[400px] h-[400px] bg-surface-variant/40 rounded-full blur-[90px] -z-10 pointer-events-none translate-y-1/3"></div>

        <div className="px-6 py-8 md:px-12 md:py-10 max-w-[1400px] mx-auto w-full">
          
          {/* Header Section */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-surface-container-high rounded-full font-label-sm text-label-sm text-on-surface mb-3">
                <span className="w-2 h-2 rounded-full bg-secondary animate-ping"></span>
                <span>Organizer Workspace</span>
              </div>
              <h1 className="font-display-lg text-3xl md:text-5xl text-primary tracking-tight">
                Hello, {user?.name || 'Organizer'}.
              </h1>
              <p className="font-body-lg text-body-lg text-on-surface-variant mt-2 max-w-xl">
                Ready to engage your audience? Create a new session or manage your active quizzes and polls.
              </p>
            </div>

            {/* Metrics Counters */}
            <div className="flex gap-4 w-full md:w-auto">
              <div className="bg-surface-container-lowest rounded-2xl p-4 border border-outline-variant/30 shadow-sm flex flex-col items-center justify-center flex-1 md:min-w-[130px]">
                <span className="font-display-sm text-2xl md:text-3xl font-bold text-primary">{activeCount}</span>
                <span className="font-label-sm text-xs text-on-surface-variant uppercase tracking-wider mt-0.5">Active</span>
              </div>
              <div className="bg-surface-container-lowest rounded-2xl p-4 border border-outline-variant/30 shadow-sm flex flex-col items-center justify-center flex-1 md:min-w-[130px]">
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
              className="group relative bg-surface-container-lowest rounded-3xl p-8 border border-outline-variant/30 shadow-sm flex flex-col items-start justify-between min-h-[220px] hover:-translate-y-1.5 transition-all duration-300 overflow-hidden text-left hover:shadow-md hover:border-primary/20"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-secondary-container/40 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110 duration-500"></div>
              <div className="relative z-10 w-14 h-14 rounded-2xl bg-primary text-on-primary flex items-center justify-center shadow-md">
                <span className="material-symbols-outlined text-2xl">psychology_alt</span>
              </div>
              <div className="relative z-10 mt-4">
                <h3 className="font-headline-lg text-2xl font-bold text-primary mb-1">New Quiz</h3>
                <p className="font-body-md text-sm text-on-surface-variant">Create an interactive multiple-choice live trivia session.</p>
              </div>
              <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
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
              className="group relative bg-surface-container-lowest rounded-3xl p-8 border border-outline-variant/30 shadow-sm flex flex-col items-start justify-between min-h-[220px] hover:-translate-y-1.5 transition-all duration-300 overflow-hidden text-left hover:shadow-md hover:border-secondary/30"
            >
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-surface-container-high rounded-tl-full opacity-40 transition-transform group-hover:scale-110 duration-500"></div>
              <div className="relative z-10 w-14 h-14 rounded-2xl bg-secondary-container text-on-secondary-container flex items-center justify-center border border-secondary/20 shadow-sm">
                <span className="material-symbols-outlined text-2xl">bar_chart</span>
              </div>
              <div className="relative z-10 mt-4">
                <h3 className="font-headline-lg text-2xl font-bold text-primary mb-1">New Poll</h3>
                <p className="font-body-md text-sm text-on-surface-variant">Gather instant live audience voting data and opinions.</p>
              </div>
              <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
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
              className="group relative bg-surface-container-lowest rounded-3xl p-8 border border-outline-variant/30 shadow-sm flex flex-col items-start justify-between min-h-[220px] hover:-translate-y-1.5 transition-all duration-300 overflow-hidden text-left hover:shadow-md hover:border-primary/20"
            >
              <div className="relative z-10 w-14 h-14 rounded-2xl bg-surface-container-highest text-primary flex items-center justify-center shadow-sm">
                <span className="material-symbols-outlined text-2xl">forum</span>
              </div>
              <div className="relative z-10 mt-4">
                <h3 className="font-headline-lg text-2xl font-bold text-primary mb-1">New Feedback</h3>
                <p className="font-body-md text-sm text-on-surface-variant">Collect open-ended feedback and moderated Q&amp;A responses.</p>
              </div>
              <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
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
                className="font-label-md text-sm text-on-surface-variant hover:text-primary flex items-center gap-1 transition-colors"
              >
                <span className="material-symbols-outlined text-sm">refresh</span> Refresh
              </button>
            </div>

            {loading ? (
              <div className="p-12 text-center text-on-surface-variant font-body-md">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                Loading sessions...
              </div>
            ) : sessions.length === 0 ? (
              <div className="bg-surface-container-lowest rounded-3xl p-12 text-center border border-dashed border-outline-variant/60">
                <span className="material-symbols-outlined text-5xl text-outline mb-3">devices_other</span>
                <h3 className="font-headline-lg text-xl font-bold text-primary mb-2">No sessions created yet</h3>
                <p className="font-body-md text-on-surface-variant max-w-md mx-auto mb-6">
                  Create your first interactive quiz or poll to share a PIN code with your participants.
                </p>
                <button 
                  onClick={() => {
                    setSessionTitle('My First Quiz');
                    setShowCreateModal(true);
                  }}
                  className="bg-primary text-on-primary px-6 py-3 rounded-full font-label-md hover:bg-primary-container transition-all"
                >
                  Create First Session
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {sessions.map((session) => {
                  const isLive = session.status === 'active' || session.status === 'waiting';
                  return (
                    <div 
                      key={session.id}
                      className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:border-primary/30 transition-all shadow-sm hover:shadow group"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isLive ? 'bg-secondary-container text-on-secondary-container' : 'bg-surface-container-high text-on-surface-variant'}`}>
                          <span className="material-symbols-outlined">
                            {session.type === 'poll' ? 'bar_chart' : session.type === 'feedback' ? 'forum' : 'psychology_alt'}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-3">
                            <h4 className="font-label-md text-lg font-bold text-primary">{session.name}</h4>
                            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                              isLive ? 'bg-secondary text-on-secondary animate-pulse' : 'bg-surface-container-high text-on-surface-variant'
                            }`}>
                              {session.status}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-4 mt-1 text-xs text-on-surface-variant">
                            <span>PIN: <strong className="text-primary font-mono">{session.pin}</strong></span>
                            <span>•</span>
                            <span>{session.participants?.length || 0} participants</span>
                            <span>•</span>
                            <span>{new Date(session.createdAt || Date.now()).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 w-full md:w-auto justify-end pt-3 md:pt-0 border-t md:border-t-0 border-outline-variant/20">
                        <button
                          onClick={(e) => handleCopyPin(session.pin, e)}
                          className="px-3 py-1.5 rounded-full border border-outline-variant/50 text-xs font-label-md hover:bg-surface-container flex items-center gap-1.5 transition-colors"
                          title="Copy PIN"
                        >
                          <span className="material-symbols-outlined text-[14px]">
                            {copiedPin === session.pin ? 'check' : 'content_copy'}
                          </span>
                          {copiedPin === session.pin ? 'Copied!' : 'PIN'}
                        </button>

                        <Link
                          to={`/host/${session.id}?pin=${session.pin}&title=${encodeURIComponent(session.name)}`}
                          className="px-3.5 py-1.5 rounded-full bg-secondary text-on-secondary text-xs font-label-md hover:opacity-90 transition-all flex items-center gap-1 shadow-sm"
                        >
                          <span>Host Live</span>
                          <span className="material-symbols-outlined text-[14px]">sensors</span>
                        </Link>

                        <Link
                          to={`/waiting-room?pin=${session.pin}`}
                          className="px-3.5 py-1.5 rounded-full bg-primary text-on-primary text-xs font-label-md hover:bg-primary-container transition-all flex items-center gap-1"
                        >
                          <span>Player View</span>
                          <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                        </Link>

                        <button
                          onClick={(e) => handleDeleteSession(session.id, e)}
                          className="p-1.5 text-outline hover:text-error rounded-full hover:bg-error-container/20 transition-colors"
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
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-3xl max-w-lg w-full p-8 border border-outline-variant/40 shadow-2xl relative animate-fadeIn">
            
            <button 
              onClick={() => setShowCreateModal(false)}
              className="absolute top-6 right-6 text-on-surface-variant hover:text-primary p-1 rounded-full hover:bg-surface-container transition-colors"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>

            {!createdSession ? (
              <>
                <h3 className="font-display-sm text-2xl font-bold text-primary mb-2">Create New Session</h3>
                <p className="font-body-md text-sm text-on-surface-variant mb-6">
                  Set up a real-time room. A shareable PIN code will be automatically generated.
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
                          className={`py-2 px-3 rounded-xl border text-xs font-bold capitalize transition-all ${
                            sessionType === type 
                              ? 'bg-primary text-on-primary border-primary shadow-sm' 
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
                      className="w-full h-12 bg-surface-container-lowest border border-outline-variant rounded-xl px-4 font-body-md text-body-md focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
                      required
                    />
                  </div>

                  <div className="flex justify-end gap-3 mt-4">
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(false)}
                      className="px-5 py-2.5 rounded-full font-label-md text-sm text-on-surface-variant hover:bg-surface-container transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={creating}
                      className="bg-primary text-on-primary px-6 py-2.5 rounded-full font-label-md text-sm hover:bg-primary-container transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                      {creating ? 'Creating...' : 'Create Room'}
                      <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-secondary-container text-on-secondary-container rounded-full flex items-center justify-center mx-auto mb-4 border border-secondary/30">
                  <span className="material-symbols-outlined text-3xl">check</span>
                </div>
                <h3 className="font-display-sm text-2xl font-bold text-primary mb-1">Session Ready!</h3>
                <p className="font-body-md text-sm text-on-surface-variant mb-6">
                  {createdSession.name} is now live and waiting for participants.
                </p>

                <div className="bg-surface-container-low rounded-2xl p-6 mb-6 border border-outline-variant/40">
                  <div className="text-xs uppercase tracking-widest text-on-surface-variant font-bold mb-1">Room PIN</div>
                  <div className="font-mono text-3xl font-extrabold text-primary tracking-wider mb-3">
                    {createdSession.pin}
                  </div>
                  <button 
                    onClick={(e) => handleCopyPin(createdSession.pin, e)}
                    className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface-container-highest hover:bg-outline-variant/30 text-xs font-label-md transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">
                      {copiedPin === createdSession.pin ? 'check' : 'content_copy'}
                    </span>
                    {copiedPin === createdSession.pin ? 'PIN Copied to Clipboard!' : 'Copy PIN Code'}
                  </button>
                </div>

                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="px-5 py-2.5 rounded-full font-label-md text-sm border border-outline-variant hover:bg-surface-container transition-colors"
                  >
                    Close
                  </button>
                  <Link
                    to={`/waiting-room?pin=${createdSession.pin}`}
                    className="bg-primary text-on-primary px-6 py-2.5 rounded-full font-label-md text-sm hover:bg-primary-container transition-all flex items-center gap-1.5"
                  >
                    <span>Go to Waiting Room</span>
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </Link>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
};

export default OrganizerDashboard;
