import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { sessionAPI } from '../api/client';

const SessionBuilder = () => {
  const navigate = useNavigate();
  const [sessionTitle, setSessionTitle] = useState('Product Design Masterclass Quiz');
  const [sessionType, setSessionType] = useState('quiz'); // quiz, poll, feedback
  const [joinCode, setJoinCode] = useState('');

  
  const [questions, setQuestions] = useState([
    {
      id: 1,
      text: 'What is the primary purpose of negative space in UI design?',
      type: 'multiple_choice',
      timeLimit: 30,
      options: [
        { id: 'a', text: 'To reduce cognitive load and visual clutter', isCorrect: true },
        { id: 'b', text: 'To fill empty unused pixels', isCorrect: false },
        { id: 'c', text: 'To make the layout look larger than it is', isCorrect: false },
        { id: 'd', text: 'To satisfy strict CSS flexbox constraints', isCorrect: false },
      ]
    },
    {
      id: 2,
      text: 'Which color mode provides maximum contrast for primary calls-to-action?',
      type: 'multiple_choice',
      timeLimit: 20,
      options: [
        { id: 'a', text: 'Vibrant secondary lime container against dark backdrop', isCorrect: true },
        { id: 'b', text: 'Light grey on white surface', isCorrect: false },
        { id: 'c', text: 'Subtle outline border only', isCorrect: false },
      ]
    }
  ]);

  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [isPublishing, setIsPublishing] = useState(false);

  const currentQ = questions[activeQuestionIndex] || questions[0];

  const handleAddQuestion = () => {
    const newQ = {
      id: Date.now(),
      text: 'New Question Title',
      type: sessionType === 'feedback' ? 'open_text' : 'multiple_choice',
      timeLimit: 30,
      options: [
        { id: 'a', text: 'Option 1', isCorrect: true },
        { id: 'b', text: 'Option 2', isCorrect: false },
        { id: 'c', text: 'Option 3', isCorrect: false },
        { id: 'd', text: 'Option 4', isCorrect: false },
      ]
    };
    setQuestions([...questions, newQ]);
    setActiveQuestionIndex(questions.length);
  };

  const handleUpdateQuestionText = (text) => {
    const updated = [...questions];
    updated[activeQuestionIndex].text = text;
    setQuestions(updated);
  };

  const handleUpdateOptionText = (optIndex, text) => {
    const updated = [...questions];
    updated[activeQuestionIndex].options[optIndex].text = text;
    setQuestions(updated);
  };

  const handleToggleCorrect = (optIndex) => {
    const updated = [...questions];
    updated[activeQuestionIndex].options = updated[activeQuestionIndex].options.map((opt, i) => ({
      ...opt,
      isCorrect: i === optIndex
    }));
    setQuestions(updated);
  };

  const handleAddOption = () => {
    const updated = [...questions];
    const opts = updated[activeQuestionIndex].options;
    if (opts.length >= 6) return;
    opts.push({
      id: String.fromCharCode(97 + opts.length),
      text: `Option ${opts.length + 1}`,
      isCorrect: false
    });
    setQuestions(updated);
  };

  const handleDeleteOption = (optIndex) => {
    const updated = [...questions];
    if (updated[activeQuestionIndex].options.length <= 2) return;
    updated[activeQuestionIndex].options.splice(optIndex, 1);
    setQuestions(updated);
  };

  const handlePublish = async () => {
    try {
      setIsPublishing(true);
      const res = await sessionAPI.createSession(sessionTitle, sessionType, joinCode);
      const pin = res.session?.pin || 'QZ-' + Math.floor(1000 + Math.random() * 9000);
      const sessId = res.session?.id || 'sess_' + Date.now();
      navigate(`/host/${sessId}?pin=${pin}&title=${encodeURIComponent(sessionTitle)}`);
    } catch (err) {
      alert('Error publishing: ' + err.message);
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="bg-surface-container-lowest text-on-surface antialiased flex h-screen overflow-hidden font-body-md text-body-md">
      
      {/* Side Navigation Bar */}
      <nav className="h-screen w-64 hidden md:flex flex-col py-6 bg-surface-container-low border-r border-outline-variant/30 shrink-0">
        <div className="px-6 mb-6">
          <Link to="/dashboard" className="font-display-sm text-[28px] text-primary flex items-center gap-2 mb-6">
            <span className="material-symbols-outlined text-[28px] text-secondary">token</span>
            QUIZCORE
          </Link>
          <button 
            onClick={handleAddQuestion}
            className="w-full flex items-center justify-center gap-2 bg-primary text-on-primary rounded-full px-4 py-2.5 font-label-md text-label-md hover:bg-primary-container transition-all shadow-sm active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Add Question
          </button>
        </div>

        <ul className="flex flex-col gap-1.5 px-3 flex-1">
          <li>
            <Link to="/dashboard" className="flex items-center gap-3 text-on-surface-variant hover:bg-surface-container-highest rounded-full px-4 py-2.5 transition-colors font-label-md">
              <span className="material-symbols-outlined text-[20px]">dashboard</span>
              Dashboard
            </Link>
          </li>
          <li>
            <Link to="/settings" className="flex items-center gap-3 text-on-surface-variant hover:bg-surface-container-highest rounded-full px-4 py-2.5 transition-colors font-label-md">
              <span className="material-symbols-outlined text-[20px]">settings</span>
              Settings
            </Link>
          </li>
        </ul>

        <div className="mt-auto px-4 pt-4 border-t border-outline-variant/30">
          <Link to="/dashboard" className="text-on-surface-variant hover:text-primary flex items-center gap-2 text-xs font-label-md py-2">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Back to Dashboard
          </Link>
        </div>
      </nav>

      {/* Main Workspace Area */}
      <main className="flex-1 flex flex-col w-full h-full bg-surface-bright overflow-hidden">
        
        {/* Top Header Action Bar */}
        <header className="h-20 px-6 md:px-8 flex items-center justify-between border-b border-outline-variant/20 bg-surface-container-lowest shrink-0">
          <div className="flex items-center gap-4 flex-1 max-w-xl">
            <button 
              onClick={() => navigate('/dashboard')} 
              className="w-10 h-10 rounded-full hover:bg-surface-variant flex items-center justify-center text-on-surface-variant transition-colors"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <div className="flex flex-col flex-1">
              <span className="text-[11px] font-label-md text-on-surface-variant uppercase tracking-wider">Session Builder</span>
              <input 
                value={sessionTitle}
                onChange={(e) => setSessionTitle(e.target.value)}
                className="bg-transparent border-none p-0 focus:ring-0 font-body-lg text-lg font-bold text-primary w-full"
                placeholder="Enter session title..."
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase().replace(/\s/g, ''))}
              placeholder="Custom PIN (Optional)"
              maxLength={8}
              className="px-4 py-2 rounded-full border border-outline-variant/50 text-on-surface font-label-md text-sm bg-transparent focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary w-44 placeholder:text-on-surface-variant/50"
            />
            <button 
              onClick={() => navigate('/join')} 
              className="px-4 py-2 rounded-full border border-outline-variant/50 text-on-surface font-label-md text-sm hover:bg-surface-variant transition-colors hidden sm:flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">visibility</span>
              Test Room
            </button>
            <button 
              onClick={handlePublish}
              disabled={isPublishing}
              className="px-6 py-2.5 rounded-full bg-secondary text-on-secondary font-label-md text-sm hover:opacity-90 transition-all shadow flex items-center gap-2 active:scale-95 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">rocket_launch</span>
              {isPublishing ? 'Publishing...' : 'Launch Live'}
            </button>
          </div>
        </header>

        {/* Builder Split Layout */}
        <div className="flex flex-1 overflow-hidden">
          
          {/* Left Panel: Question Outline List */}
          <aside className="w-72 bg-surface-container-lowest border-r border-outline-variant/20 flex flex-col shrink-0">
            <div className="p-4 border-b border-outline-variant/20 flex justify-between items-center">
              <span className="font-label-md text-sm font-bold text-primary">Questions ({questions.length})</span>
              <button 
                onClick={handleAddQuestion}
                className="w-7 h-7 rounded-full bg-surface-variant text-primary flex items-center justify-center hover:bg-primary hover:text-on-primary transition-colors"
                title="Add new question"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
              {questions.map((q, idx) => {
                const isActive = idx === activeQuestionIndex;
                return (
                  <div
                    key={q.id}
                    onClick={() => setActiveQuestionIndex(idx)}
                    className={`rounded-xl p-3 flex gap-3 cursor-pointer transition-all border ${
                      isActive 
                        ? 'bg-surface-container-lowest border-primary shadow-sm ring-1 ring-primary' 
                        : 'bg-surface-container-low border-outline-variant/30 hover:border-outline hover:bg-surface-container'
                    }`}
                  >
                    <div className="flex flex-col items-center justify-center text-outline-variant font-bold text-xs">
                      <span>{idx + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="material-symbols-outlined text-[14px] text-secondary">psychology_alt</span>
                        <span className="text-[10px] uppercase font-bold text-on-surface-variant">{q.timeLimit}s</span>
                      </div>
                      <p className="text-xs text-primary font-medium truncate">{q.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>

          {/* Center Workspace: Active Question Editor */}
          <section className="flex-1 overflow-y-auto p-6 md:p-10 flex flex-col items-center justify-start max-w-4xl mx-auto w-full">
            
            {/* Question Card Frame */}
            <div className="w-full bg-surface-container-lowest rounded-3xl p-6 md:p-8 border border-outline-variant/30 shadow-editorial mb-8">
              
              <div className="flex justify-between items-center mb-4">
                <span className="inline-block px-3 py-1 bg-surface-container-high rounded-full font-label-sm text-xs text-on-surface uppercase tracking-wider font-bold">
                  Question {activeQuestionIndex + 1} of {questions.length}
                </span>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-label-md text-on-surface-variant">Time limit:</span>
                  {[15, 30, 60].map((t) => (
                    <button
                      key={t}
                      onClick={() => {
                        const updated = [...questions];
                        updated[activeQuestionIndex].timeLimit = t;
                        setQuestions(updated);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors ${
                        currentQ.timeLimit === t ? 'bg-primary text-on-primary border-primary' : 'border-outline-variant/50 hover:bg-surface-container'
                      }`}
                    >
                      {t}s
                    </button>
                  ))}
                </div>
              </div>

              {/* Question Textarea */}
              <div className="mb-6">
                <label className="block text-xs uppercase font-label-md text-on-surface-variant mb-2 font-bold">
                  Question Prompt
                </label>
                <textarea
                  rows={3}
                  value={currentQ.text}
                  onChange={(e) => handleUpdateQuestionText(e.target.value)}
                  placeholder="Type your question here..."
                  className="w-full bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-4 font-headline-lg text-xl text-primary focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none resize-none"
                />
              </div>

              {/* Options Section */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="text-xs uppercase font-label-md text-on-surface-variant font-bold">
                    Answer Options (Mark the correct answer)
                  </label>
                  {currentQ.options.length < 6 && (
                    <button 
                      onClick={handleAddOption}
                      className="text-xs text-primary font-bold hover:underline flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[14px]">add</span> Add Option
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {currentQ.options.map((opt, optIdx) => (
                    <div 
                      key={opt.id}
                      className={`p-4 rounded-2xl border transition-all flex items-center gap-3 relative ${
                        opt.isCorrect 
                          ? 'border-secondary bg-secondary-container/20 ring-1 ring-secondary' 
                          : 'border-outline-variant/40 bg-surface-container-lowest hover:border-outline-variant'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleToggleCorrect(optIdx)}
                        className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors shrink-0 ${
                          opt.isCorrect 
                            ? 'bg-secondary text-on-secondary' 
                            : 'border-2 border-outline-variant text-transparent hover:border-primary'
                        }`}
                        title="Mark as correct answer"
                      >
                        <span className="material-symbols-outlined text-[16px]">check</span>
                      </button>

                      <input 
                        type="text"
                        value={opt.text}
                        onChange={(e) => handleUpdateOptionText(optIdx, e.target.value)}
                        placeholder={`Option ${optIdx + 1}`}
                        className="bg-transparent border-none p-0 focus:ring-0 text-sm font-medium text-primary flex-1"
                      />

                      {currentQ.options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteOption(optIdx)}
                          className="text-outline hover:text-error p-1 rounded-full opacity-60 hover:opacity-100 transition-opacity"
                        >
                          <span className="material-symbols-outlined text-[16px]">close</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Quick Actions Footer */}
            <div className="flex justify-between items-center w-full">
              <button
                disabled={activeQuestionIndex === 0}
                onClick={() => setActiveQuestionIndex(prev => prev - 1)}
                className="px-5 py-2.5 rounded-full border border-outline-variant/50 font-label-md text-sm hover:bg-surface-container transition-colors disabled:opacity-40 flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">arrow_back</span>
                Previous Question
              </button>

              <button
                disabled={activeQuestionIndex === questions.length - 1}
                onClick={() => setActiveQuestionIndex(prev => prev + 1)}
                className="px-5 py-2.5 rounded-full bg-primary text-on-primary font-label-md text-sm hover:bg-primary-container transition-all disabled:opacity-40 flex items-center gap-1.5"
              >
                Next Question
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>

          </section>

        </div>
      </main>

    </div>
  );
};

export default SessionBuilder;
