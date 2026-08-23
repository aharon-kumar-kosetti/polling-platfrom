import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { questionAPI } from '../api/client';

const SessionBuilder = () => {
  const navigate = useNavigate();
  const [sessionTitle, setSessionTitle] = useState('');
  const [sessionType, setSessionType] = useState('quiz'); // quiz, poll, feedback
  const [joinCode, setJoinCode] = useState('');

  const [questions, setQuestions] = useState([
    {
      id: 1,
      text: '',
      type: 'single_choice',
      imageUrl: '',
      options: [
        { id: 'a', text: 'Option 1', isCorrect: true, imageUrl: '' },
        { id: 'b', text: 'Option 2', isCorrect: false, imageUrl: '' },
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
      type: 'single_choice',
      imageUrl: '',
      options: [
        { id: 'a', text: 'Option 1', isCorrect: true, imageUrl: '' },
        { id: 'b', text: 'Option 2', isCorrect: false, imageUrl: '' },
        { id: 'c', text: 'Option 3', isCorrect: false, imageUrl: '' },
        { id: 'd', text: 'Option 4', isCorrect: false, imageUrl: '' },
      ]
    };
    setQuestions([...questions, newQ]);
    setActiveQuestionIndex(questions.length);
  };

  const handleUpdateQuestion = (key, value) => {
    const updated = [...questions];
    updated[activeQuestionIndex][key] = value;
    
    // If switching to true/false, reset options
    if (key === 'type' && value === 'true_false') {
      updated[activeQuestionIndex].options = [
        { id: 'a', text: 'True', isCorrect: true, imageUrl: '' },
        { id: 'b', text: 'False', isCorrect: false, imageUrl: '' }
      ];
    } else if (key === 'type' && currentQ.type === 'true_false' && value !== 'true_false') {
      // If switching away from true/false, give some default options
       updated[activeQuestionIndex].options = [
        { id: 'a', text: 'Option 1', isCorrect: true, imageUrl: '' },
        { id: 'b', text: 'Option 2', isCorrect: false, imageUrl: '' },
        { id: 'c', text: 'Option 3', isCorrect: false, imageUrl: '' },
        { id: 'd', text: 'Option 4', isCorrect: false, imageUrl: '' },
      ];
    }
    setQuestions(updated);
  };

  const handleUpdateOption = (optIndex, key, value) => {
    const updated = [...questions];
    updated[activeQuestionIndex].options[optIndex][key] = value;
    setQuestions(updated);
  };

  const handleToggleCorrect = (optIndex) => {
    const updated = [...questions];
    const qType = updated[activeQuestionIndex].type;
    
    if (qType === 'single_choice' || qType === 'true_false') {
      updated[activeQuestionIndex].options = updated[activeQuestionIndex].options.map((opt, i) => ({
        ...opt,
        isCorrect: i === optIndex
      }));
    } else if (qType === 'multiple_choice') {
      updated[activeQuestionIndex].options[optIndex].isCorrect = !updated[activeQuestionIndex].options[optIndex].isCorrect;
    }
    
    setQuestions(updated);
  };

  const handleAddOption = () => {
    const updated = [...questions];
    const opts = updated[activeQuestionIndex].options;
    if (opts.length >= 6) return; // limit to 6 options
    opts.push({
      id: String.fromCharCode(97 + opts.length),
      text: `Option ${opts.length + 1}`,
      isCorrect: false,
      imageUrl: ''
    });
    setQuestions(updated);
  };

  const handleDeleteOption = (optIndex) => {
    const updated = [...questions];
    if (updated[activeQuestionIndex].options.length <= 2) return;
    updated[activeQuestionIndex].options.splice(optIndex, 1);
    setQuestions(updated);
  };

  const handleFileUpload = (file, callback) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      callback(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveToBank = async () => {
    try {
      setIsPublishing(true);
      await questionAPI.saveToBank(questions);
      alert('Successfully saved questions to your bank!');
      // Optionally navigate back to dashboard
      navigate('/dashboard');
    } catch (err) {
      alert('Error saving to bank: ' + err.message);
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="bg-surface-container-lowest text-on-surface antialiased flex h-screen overflow-hidden font-body-md text-body-md">
      
      {/* Side Navigation Bar */}
      <nav className="h-screen w-64 hidden md:flex flex-col py-6 bg-surface-container-low border-r border-outline-variant/30 shrink-0">
        <div className="px-6 mb-6">
          <Link to="/dashboard" className="font-display-sm text-xl font-bold flex items-center gap-2 mb-6">
            <span className="material-symbols-outlined text-[24px] text-secondary">token</span>
            <span className="text-black">QuizCore</span>
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
              <span className="text-[11px] font-label-md text-on-surface-variant uppercase tracking-wider">Question Bank Builder</span>
              <div className="font-body-lg text-lg font-bold text-primary w-full">Create & Save Questions</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={handleSaveToBank}
              disabled={isPublishing}
              className="px-6 py-2.5 rounded-full bg-secondary text-on-secondary font-label-md text-sm hover:opacity-90 transition-all shadow flex items-center gap-2 active:scale-95 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">save</span>
              {isPublishing ? 'Saving...' : 'Save to Bank'}
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
                        <span className="text-[10px] uppercase font-bold text-on-surface-variant">
                          {q.type === 'single_choice' ? 'Single Choice' : q.type === 'multiple_choice' ? 'Multiple Choice' : 'True/False'}
                        </span>
                      </div>
                      <p className="text-xs text-primary font-medium truncate">{q.text || 'Untitled Question'}</p>
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
                  <span className="text-xs font-label-md text-on-surface-variant">Type:</span>
                  <select 
                    value={currentQ.type}
                    onChange={(e) => handleUpdateQuestion('type', e.target.value)}
                    className="bg-surface-container border border-outline-variant/50 rounded-lg px-2 py-1 text-xs font-bold text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="single_choice">Single Choice</option>
                    <option value="multiple_choice">Multiple Choice</option>
                    <option value="true_false">True / False</option>
                  </select>
                </div>
              </div>

              {/* Question Textarea */}
              <div className="mb-4">
                <label className="block text-xs uppercase font-label-md text-on-surface-variant mb-2 font-bold">
                  Question Prompt
                </label>
                <textarea
                  rows={3}
                  value={currentQ.text}
                  onChange={(e) => handleUpdateQuestion('text', e.target.value)}
                  placeholder="Type your question here..."
                  className="w-full bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-4 font-headline-lg text-xl text-primary focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none resize-none mb-3"
                />
                
                {/* Question Image Input */}
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-outline-variant text-[18px]">image</span>
                  <input
                    type="text"
                    value={currentQ.imageUrl || ''}
                    onChange={(e) => handleUpdateQuestion('imageUrl', e.target.value)}
                    placeholder="Paste an image URL or click upload..."
                    className="flex-1 bg-surface-container-lowest border border-outline-variant/50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                  <label className="cursor-pointer bg-surface-variant hover:bg-surface-container text-on-surface-variant px-3 py-2 rounded-xl text-xs font-label-md transition-colors flex items-center gap-1 shrink-0">
                    <span className="material-symbols-outlined text-[16px]">upload</span>
                    Upload
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => handleFileUpload(e.target.files[0], (url) => handleUpdateQuestion('imageUrl', url))}
                    />
                  </label>
                </div>
                {currentQ.imageUrl && (
                  <div className="mt-3 relative rounded-xl overflow-hidden border border-outline-variant/30 max-w-sm">
                    <img src={currentQ.imageUrl} alt="Question Attachment" className="w-full h-auto object-cover max-h-48" onError={(e) => e.target.style.display = 'none'} />
                  </div>
                )}
              </div>

              {/* Options Section */}
              <div className="mt-8 border-t border-outline-variant/20 pt-6">
                <div className="flex justify-between items-center mb-3">
                  <label className="text-xs uppercase font-label-md text-on-surface-variant font-bold">
                    Answer Options (Mark the correct {currentQ.type === 'multiple_choice' ? 'answers' : 'answer'})
                  </label>
                  {currentQ.type !== 'true_false' && currentQ.options.length < 6 && (
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
                      className={`p-4 rounded-2xl border transition-all flex flex-col gap-3 relative ${
                        opt.isCorrect 
                          ? 'border-secondary bg-secondary-container/10 ring-1 ring-secondary' 
                          : 'border-outline-variant/40 bg-surface-container-lowest hover:border-outline-variant'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleToggleCorrect(optIdx)}
                          className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors shrink-0 ${
                            opt.isCorrect 
                              ? 'bg-secondary text-on-secondary' 
                              : 'border-2 border-outline-variant text-transparent hover:border-primary'
                          } ${currentQ.type === 'multiple_choice' ? 'rounded-md' : ''}`}
                          title="Mark as correct answer"
                        >
                          <span className="material-symbols-outlined text-[16px]">check</span>
                        </button>

                        <input 
                          type="text"
                          value={opt.text}
                          onChange={(e) => handleUpdateOption(optIdx, 'text', e.target.value)}
                          placeholder={`Option ${optIdx + 1}`}
                          disabled={currentQ.type === 'true_false'}
                          className="bg-transparent border-none p-0 focus:ring-0 text-sm font-medium text-primary flex-1 disabled:opacity-80"
                        />

                        {currentQ.type !== 'true_false' && currentQ.options.length > 2 && (
                          <button
                            type="button"
                            onClick={() => handleDeleteOption(optIdx)}
                            className="text-outline hover:text-error p-1 rounded-full opacity-60 hover:opacity-100 transition-opacity"
                          >
                            <span className="material-symbols-outlined text-[16px]">close</span>
                          </button>
                        )}
                      </div>

                      {/* Option Image Input */}
                      <div className="pl-10">
                         <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-outline-variant text-[14px]">image</span>
                            <input 
                              type="text"
                              value={opt.imageUrl || ''}
                              onChange={(e) => handleUpdateOption(optIdx, 'imageUrl', e.target.value)}
                              placeholder="Image URL or upload"
                              className="text-xs bg-surface-container border border-outline-variant/50 rounded-md px-2 py-1 flex-1 min-w-0 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                            />
                            <label className="cursor-pointer bg-surface-variant hover:bg-surface-container text-on-surface-variant px-2 py-1 rounded-md text-[10px] font-label-md transition-colors flex items-center shrink-0">
                              <span className="material-symbols-outlined text-[14px]">upload</span>
                              <input 
                                type="file" 
                                accept="image/*" 
                                className="hidden" 
                                onChange={(e) => handleFileUpload(e.target.files[0], (url) => handleUpdateOption(optIdx, 'imageUrl', url))}
                              />
                            </label>
                         </div>
                         {opt.imageUrl && (
                           <div className="mt-2 rounded-md overflow-hidden border border-outline-variant/30 h-24 w-full">
                              <img src={opt.imageUrl} alt="Option Attachment" className="w-full h-full object-cover" onError={(e) => e.target.style.display = 'none'} />
                           </div>
                         )}
                      </div>

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
