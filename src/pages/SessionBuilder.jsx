import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { questionAPI, sessionAPI } from '../api/client';
import Sidebar from '../components/ui/Sidebar';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { useToast } from '../components/ui/Toast';

const SessionBuilder = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
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

  const [bankQuestions, setBankQuestions] = useState([]);
  const [activeTab, setActiveTab] = useState('drafts');
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [isPublishing, setIsPublishing] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [bankModalAction, setBankModalAction] = useState(null); // 'single' or 'bulk'
  const [selectedBankName, setSelectedBankName] = useState('General');
  const [newBankName, setNewBankName] = useState('');

  const [deleteTarget, setDeleteTarget] = useState(null); // { kind: 'draft' | 'bank', index?, id?, title? }
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        let res;
        if (id) {
          res = await sessionAPI.getSession(id);
          if (res.session && res.session.name) setSessionTitle(res.session.name);
        } else {
          res = await questionAPI.getSavedQuestions();
        }

        const sourceQuestions = id ? (res.session?.questions || []) : (res.questions || []);

        const bankRes = await questionAPI.getSavedQuestions();
        if (bankRes.questions) {
          const parsedBank = bankRes.questions.reduce((acc, q) => {
            try { acc.push({ ...q, options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options }); }
            catch (e) { console.warn(`Skipping question ${q.id}`); }
            return acc;
          }, []);
          setBankQuestions(parsedBank);
        }

        if (sourceQuestions.length > 0) {
          const parsed = sourceQuestions.reduce((acc, q) => {
            try { acc.push({ ...q, options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options }); }
            catch (e) { console.warn(`Skipping question ${q.id}`); }
            return acc;
          }, []);
          if (parsed.length > 0) {
            setQuestions(parsed);
            setActiveQuestionIndex(0);
          }
        }
      } catch (err) {
        console.error('Failed to fetch data:', err);
        toast('Failed to load your questions. Check your connection.', 'error');
      }
    };
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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
    setActiveTab('drafts');
    setQuestions([...questions, newQ]);
    setActiveQuestionIndex(questions.length);
    toast('New question added.', 'info');
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

  /* ---------- Deletion flow (in-app confirmation dialogs) ---------- */

  const requestDeleteDraftQuestion = (index) => {
    if (questions.length <= 1) {
      toast('You must keep at least one question in the session.', 'error');
      return;
    }
    setDeleteTarget({ kind: 'draft', index, title: questions[index]?.text });
  };

  const requestDeleteBankQuestion = (bankQId) => {
    const target = bankQuestions.find(q => q.id === bankQId);
    setDeleteTarget({ kind: 'bank', id: bankQId, title: target?.text });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      if (deleteTarget.kind === 'draft') {
        const updated = [...questions];
        updated.splice(deleteTarget.index, 1);
        setQuestions(updated);
        if (activeQuestionIndex >= updated.length) {
          setActiveQuestionIndex(Math.max(0, updated.length - 1));
        }
        toast('Question removed from draft.', 'info');
      } else {
        await questionAPI.deleteSavedQuestion(deleteTarget.id);
        setBankQuestions(bankQuestions.filter(q => q.id !== deleteTarget.id));
        toast('Removed from your Question Bank.', 'info');
      }
      setDeleteTarget(null);
    } catch (e) {
      console.error(e);
      toast('Failed to delete. Please try again.', 'error');
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  /* ---------- Save flows ---------- */

  const handleSaveSession = async () => {
    const validQuestions = questions.filter(q => q.text && q.text.trim() !== '');
    if (validQuestions.length === 0) {
      toast('Please write at least one question before saving.', 'error');
      return;
    }
    setBankModalAction('bulk');
    setShowBankModal(true);
  };

  const handleSaveSingleToBank = async (q) => {
    if (!q.text || q.text.trim() === '') {
      toast('Write the question prompt before saving it to the bank.', 'error');
      return;
    }
    setBankModalAction('single');
    setShowBankModal(true);
  };

  const executeSaveToBank = async () => {
    const finalBankName = newBankName.trim() || selectedBankName;
    if (!finalBankName) {
      toast('Please pick or name a bank first.', 'error');
      return;
    }

    setShowBankModal(false);
    setIsPublishing(true);

    try {
      if (bankModalAction === 'bulk') {
        const validQuestions = questions.filter(q => q.text && q.text.trim() !== '');
        // Apply bankName to all questions
        const questionsWithBank = validQuestions.map(q => ({ ...q, bankName: finalBankName }));

        if (id) {
          const sessionRes = await sessionAPI.updateSessionQuestions(id, validQuestions);
          const bankRes = await questionAPI.saveToBank(questionsWithBank);

          if (sessionRes.questions) {
            const updatedQs = sessionRes.questions.map(q => ({
              ...q,
              options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options
            }));
            setQuestions(updatedQs);
          }

          if (bankRes.questions) {
            const newBankQs = bankRes.questions.map(q => ({
              ...q,
              options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options
            }));
            setBankQuestions(prev => {
              const newBank = [...prev];
              newBankQs.forEach(newQ => {
                const idx = newBank.findIndex(bq => bq.id === newQ.id);
                if (idx >= 0) newBank[idx] = newQ;
                else newBank.push(newQ);
              });
              return newBank;
            });
          }
          toast(`Saved ${validQuestions.length} question${validQuestions.length > 1 ? 's' : ''} to this session and your bank!`);
        } else {
          const res = await questionAPI.saveToBank(questionsWithBank);
          if (res.questions) {
            const updatedQs = res.questions.map(q => ({
              ...q,
              options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options
            }));
            setQuestions(updatedQs);

            setBankQuestions(prev => {
              const newBank = [...prev];
              updatedQs.forEach(newQ => {
                const idx = newBank.findIndex(bq => bq.id === newQ.id);
                if (idx >= 0) newBank[idx] = newQ;
                else newBank.push(newQ);
              });
              return newBank;
            });
          }
          toast(`Saved ${validQuestions.length} question${validQuestions.length > 1 ? 's' : ''} to your Question Bank!`);
        }
      } else if (bankModalAction === 'single') {
        const qToSave = { ...questions[activeQuestionIndex], bankName: finalBankName };
        const res = await questionAPI.saveToBank([qToSave]);
        if (res.questions && res.questions.length > 0) {
          const newBankQ = { ...res.questions[0], options: typeof res.questions[0].options === 'string' ? JSON.parse(res.questions[0].options) : res.questions[0].options };

          setBankQuestions(prev => {
            const exists = prev.findIndex(bq => bq.id === newBankQ.id);
            if (exists >= 0) {
              const copy = [...prev];
              copy[exists] = newBankQ;
              return copy;
            }
            return [...prev, newBankQ];
          });

          setQuestions(prev => {
            const copy = [...prev];
            const idx = copy.findIndex(activeQ => activeQ.id === qToSave.id);
            if (idx >= 0) copy[idx] = newBankQ;
            return copy;
          });

          toast('Saved to your Question Bank!');
        }
      }
    } catch (err) {
      toast('Error saving questions: ' + err.message, 'error');
    } finally {
      setIsPublishing(false);
      setNewBankName('');
    }
  };

  const handleCopyFromBank = (bankQ) => {
    const newQ = { ...bankQ, id: Date.now() }; // new local ID
    setActiveTab('drafts');
    setQuestions([...questions, newQ]);
    setActiveQuestionIndex(questions.length);
    toast('Question copied into your session draft.', 'info');
  };

  const groupedBankQuestions = bankQuestions.reduce((acc, q) => {
    const bank = q.bankName || 'General';
    if (!acc[bank]) acc[bank] = [];
    acc[bank].push(q);
    return acc;
  }, {});

  return (
    <div className="bg-surface-container-lowest text-on-surface antialiased flex h-screen overflow-hidden font-body-md text-body-md">

      {/* Side Navigation Bar (consistent across all workspace pages) */}
      <Sidebar
        active="/builder"
        action={
          <button
            onClick={handleAddQuestion}
            className="w-full flex items-center justify-center gap-2 bg-primary text-on-primary rounded-full px-4 py-2.5 font-label-md text-label-md hover:bg-primary-container transition-all shadow-sm press-effect"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Add Question
          </button>
        }
      />

      {/* Main Workspace Area */}
      <main className="flex-1 flex flex-col w-full h-full bg-surface-bright overflow-hidden animate-pageEnter md:pl-64">

        {/* Top Header Action Bar */}
        <header className="h-20 px-4 md:px-8 flex items-center justify-between border-b border-outline-variant/20 bg-surface-container-lowest shrink-0">
          <div className="flex items-center gap-2 md:gap-4 flex-1 max-w-xl min-w-0">
            <button
              onClick={() => navigate('/dashboard')}
              className="w-10 h-10 rounded-full hover:bg-surface-variant flex items-center justify-center text-on-surface-variant transition-colors shrink-0"
              aria-label="Back to dashboard"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-[11px] font-label-md text-on-surface-variant uppercase tracking-wider">
                {id ? 'Session Builder' : 'Question Bank Builder'}
              </span>
              <h1 className="font-display-sm text-xl md:text-2xl font-bold text-primary truncate w-full">
                {id ? `Editing: ${sessionTitle}` : 'Create & Save Questions'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveSession}
              disabled={isPublishing}
              className="px-4 md:px-6 py-2.5 rounded-full bg-secondary text-on-secondary font-label-md text-sm hover:brightness-95 transition-all shadow flex items-center gap-2 press-effect disabled:opacity-50 disabled:pointer-events-none"
            >
              {isPublishing
                ? <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                : <span className="material-symbols-outlined text-[18px]">save</span>}
              {isPublishing ? 'Saving...' : 'Save Session'}
            </button>
          </div>
        </header>

        {/* Builder Split Layout */}
        <div className="flex flex-1 overflow-hidden">

          {/* Left Panel: Question Outline List */}
          <aside className="w-72 bg-surface-container-lowest border-r border-outline-variant/20 hidden sm:flex flex-col shrink-0">
            {/* Tabs */}
            <div className="relative flex border-b border-outline-variant/20">
              {[
                { key: 'drafts', label: `Drafts (${questions.length})` },
                { key: 'bank', label: `Bank (${bankQuestions.length})` },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`relative flex-1 py-3 text-xs font-label-md transition-colors duration-200 ${
                    activeTab === tab.key ? 'text-primary font-bold' : 'text-on-surface-variant hover:text-primary'
                  }`}
                >
                  {tab.label}
                  {/* Animated underline indicator */}
                  <span
                    className={`absolute left-3 right-3 bottom-0 h-0.5 rounded-full bg-primary origin-left transition-transform duration-300 ${
                      activeTab === tab.key ? 'scale-x-100' : 'scale-x-0'
                    }`}
                  />
                </button>
              ))}
            </div>

            {activeTab === 'drafts' ? (
              <div key="drafts-panel" className="animate-tabIn flex flex-col flex-1 overflow-hidden">
                <div className="p-4 border-b border-outline-variant/20 flex justify-between items-center">
                  <span className="font-label-md text-xs font-bold text-primary uppercase tracking-wider">Active List</span>
                  <button
                    onClick={handleAddQuestion}
                    className="w-7 h-7 rounded-full bg-surface-variant text-primary flex items-center justify-center hover:bg-primary hover:text-on-primary transition-all shadow-sm press-effect"
                    title="Add new question"
                  >
                    <span className="material-symbols-outlined text-[16px]">add</span>
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 custom-scrollbar">
                  {questions.map((q, idx) => {
                    const isActive = idx === activeQuestionIndex;
                    return (
                      <div
                        key={q.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => setActiveQuestionIndex(idx)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setActiveQuestionIndex(idx); }}
                        className={`group relative rounded-xl p-3 pr-10 flex gap-3 cursor-pointer transition-all duration-200 border ${
                          isActive
                            ? 'bg-surface-container-lowest border-primary shadow-sm ring-1 ring-primary scale-[1.01]'
                            : 'bg-surface-container-low border-outline-variant/30 hover:border-outline hover:bg-surface-container hover:-translate-y-px'
                        }`}
                      >
                        <div className="flex flex-col items-center justify-center font-bold text-xs shrink-0 w-5">
                          <span className={isActive ? 'text-primary' : 'text-outline-variant'}>{idx + 1}</span>
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

                        {/* Refined delete button: always visible when active, slides in on group hover */}
                        <button
                          onClick={(e) => { e.stopPropagation(); requestDeleteDraftQuestion(idx); }}
                          aria-label="Delete question"
                          title="Delete Question"
                          className={`absolute top-1/2 -translate-y-1/2 right-2 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 press-effect ${
                            isActive
                              ? 'opacity-100 bg-error-container text-error hover:bg-error hover:text-on-error'
                              : 'opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 bg-surface-container-high text-on-surface-variant hover:bg-error hover:text-on-error'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[15px]">delete</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div key="bank-panel" className="animate-tabIn flex flex-col flex-1 overflow-hidden">
                <div className="p-4 border-b border-outline-variant/20 flex flex-col gap-1">
                  <span className="font-label-md text-xs font-bold text-primary uppercase tracking-wider">Question Bank</span>
                  <span className="text-[10px] text-on-surface-variant">Saved globally. Hover a card to add or remove.</span>
                </div>

                <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-4 custom-scrollbar">
                  {Object.entries(groupedBankQuestions).map(([bankName, qs]) => (
                    <div key={bankName} className="flex flex-col gap-2">
                      <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">{bankName} ({qs.length})</h4>
                      {qs.map((bq) => (
                        <div
                          key={bq.id}
                          className="group relative w-full flex flex-col gap-1.5 rounded-xl pl-4 pr-16 py-3 transition-all duration-200 bg-surface-container-low border border-outline-variant/30 hover:border-primary/50 hover:-translate-y-px hover:shadow-sm"
                        >
                          <span className="font-label-md text-[10px] opacity-70 uppercase tracking-widest">{bq.type.replace('_', ' ')}</span>
                          <span className="text-xs font-medium line-clamp-2">{bq.text || 'Untitled'}</span>

                          {/* Refined action cluster */}
                          <div className="absolute top-1/2 -translate-y-1/2 right-2 flex opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 bg-surface-container-lowest shadow-sm rounded-full overflow-hidden border border-outline-variant/30">
                            <button
                              onClick={() => handleCopyFromBank(bq)}
                              aria-label="Add to session"
                              title="Add to Session"
                              className="w-8 h-8 flex items-center justify-center text-on-surface-variant hover:bg-secondary-container hover:text-on-secondary-container transition-colors press-effect"
                            >
                              <span className="material-symbols-outlined text-[15px]">add</span>
                            </button>
                            <button
                              onClick={() => requestDeleteBankQuestion(bq.id)}
                              aria-label="Delete from bank"
                              title="Delete from Bank"
                              className="w-8 h-8 flex items-center justify-center text-on-surface-variant hover:bg-error-container hover:text-error transition-colors press-effect border-l border-outline-variant/30"
                            >
                              <span className="material-symbols-outlined text-[15px]">delete</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                  {Object.keys(groupedBankQuestions).length === 0 && (
                    <div className="p-6 text-center text-sm text-on-surface-variant opacity-70 flex flex-col items-center gap-2 animate-fadeIn">
                      <span className="material-symbols-outlined text-3xl animate-float">inventory_2</span>
                      Your Question Bank is empty.
                    </div>
                  )}
                </div>
              </div>
            )}
          </aside>

          {/* Center Workspace: Active Question Editor */}
          <section className="flex-1 overflow-y-auto p-6 md:p-10 flex flex-col items-center justify-start max-w-4xl mx-auto w-full custom-scrollbar">

            {/* Question Card Frame — re-keyed so switching questions animates */}
            <div key={currentQ?.id ?? activeQuestionIndex} className="animate-tabIn w-full bg-surface-container-lowest rounded-3xl p-6 md:p-8 border border-outline-variant/30 shadow-editorial mb-8">

              <div className="flex justify-between items-center mb-4 gap-3 flex-wrap">
                <span className="inline-block px-3 py-1 bg-surface-container-high rounded-full font-label-sm text-xs text-on-surface uppercase tracking-wider font-bold">
                  Question {activeQuestionIndex + 1} of {questions.length}
                </span>

                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-xs font-label-md text-on-surface-variant">Type:</span>
                  <select
                    value={currentQ.type}
                    onChange={(e) => handleUpdateQuestion('type', e.target.value)}
                    className="bg-surface-container border border-outline-variant/50 rounded-lg px-2 py-1 text-xs font-bold text-primary focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer transition-shadow"
                  >
                    <option value="single_choice">Single Choice</option>
                    <option value="multiple_choice">Multiple Choice</option>
                    <option value="true_false">True / False</option>
                  </select>

                  <div className="w-px h-4 bg-outline-variant/40 mx-1"></div>

                  <button
                    onClick={() => handleSaveSingleToBank(currentQ)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-high text-on-surface-variant hover:bg-secondary-container hover:text-on-secondary-container transition-colors text-xs font-label-md shadow-sm border border-outline-variant/20 press-effect"
                    title="Save this specific question to your global Question Bank"
                  >
                    <span className="material-symbols-outlined text-[14px]">inventory_2</span>
                    <span>Save to Bank</span>
                  </button>
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
                  className="w-full bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-4 font-headline-lg text-xl text-primary focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none resize-none mb-3 transition-shadow"
                />

                {/* Question Image Input */}
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-outline-variant text-[18px]">image</span>
                  <input
                    type="text"
                    value={currentQ.imageUrl || ''}
                    onChange={(e) => handleUpdateQuestion('imageUrl', e.target.value)}
                    placeholder="Paste an image URL or click upload..."
                    className="flex-1 min-w-0 bg-surface-container-lowest border border-outline-variant/50 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-shadow"
                  />
                  <label className="cursor-pointer bg-surface-variant hover:bg-surface-container text-on-surface-variant px-3 py-2 rounded-xl text-xs font-label-md transition-colors flex items-center gap-1 shrink-0 press-effect">
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
                  <div className="mt-3 relative rounded-xl overflow-hidden border border-outline-variant/30 max-w-sm animate-scaleIn">
                    <img src={currentQ.imageUrl} alt="Question Attachment" className="w-full h-auto object-cover max-h-48" onError={(e) => e.target.parentElement.style.display = 'none'} />
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
                      className="text-xs text-primary font-bold hover:underline flex items-center gap-1 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[14px]">add</span> Add Option
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {currentQ.options.map((opt, optIdx) => (
                    <div
                      key={`${opt.id}-${optIdx}`}
                      className={`p-4 rounded-2xl border transition-all duration-200 flex flex-col gap-3 relative ${
                        opt.isCorrect
                          ? 'border-secondary bg-secondary-container/10 ring-1 ring-secondary'
                          : 'border-outline-variant/40 bg-surface-container-lowest hover:border-outline-variant hover:-translate-y-px'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleToggleCorrect(optIdx)}
                          className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 shrink-0 press-effect ${
                            opt.isCorrect
                              ? 'bg-secondary text-on-secondary icon-fill'
                              : 'border-2 border-outline-variant text-transparent hover:border-primary'
                          } ${currentQ.type === 'multiple_choice' ? '!rounded-md' : ''}`}
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
                          className="bg-transparent border-none p-0 focus:ring-0 focus:outline-none text-sm font-medium text-primary flex-1 disabled:opacity-80"
                        />

                        {currentQ.type !== 'true_false' && currentQ.options.length > 2 && (
                          <button
                            type="button"
                            onClick={() => handleDeleteOption(optIdx)}
                            aria-label="Remove option"
                            className="text-outline hover:text-error p-1 rounded-full opacity-60 hover:opacity-100 hover:bg-error-container/40 transition-all press-effect"
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
                              className="text-xs bg-surface-container border border-outline-variant/50 rounded-md px-2 py-1 flex-1 min-w-0 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-shadow"
                            />
                            <label className="cursor-pointer bg-surface-variant hover:bg-surface-container text-on-surface-variant px-2 py-1 rounded-md text-[10px] font-label-md transition-colors flex items-center shrink-0 press-effect">
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
                           <div className="mt-2 rounded-md overflow-hidden border border-outline-variant/30 h-24 w-full animate-scaleIn">
                              <img src={opt.imageUrl} alt="Option Attachment" className="w-full h-full object-cover" onError={(e) => e.target.parentElement.style.display = 'none'} />
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
                className="px-5 py-2.5 rounded-full border border-outline-variant/50 font-label-md text-sm hover:bg-surface-container transition-colors flex items-center gap-1.5 press-effect disabled:opacity-40 disabled:pointer-events-none"
              >
                <span className="material-symbols-outlined text-sm">arrow_back</span>
                Previous Question
              </button>

              <button
                disabled={activeQuestionIndex === questions.length - 1}
                onClick={() => setActiveQuestionIndex(prev => prev + 1)}
                className="px-5 py-2.5 rounded-full bg-primary text-on-primary font-label-md text-sm hover:bg-primary-container transition-all flex items-center gap-1.5 press-effect disabled:opacity-40 disabled:pointer-events-none"
              >
                Next Question
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>

          </section>
        </div>
      </main>

      {/* Bank Selection Modal */}
      <Modal open={showBankModal} onClose={() => setShowBankModal(false)} maxWidth="max-w-md">
        <div className="p-6 md:p-8">
          <h3 className="font-display-sm text-2xl font-bold text-on-surface mb-2">Save to Question Bank</h3>
          <p className="text-sm text-on-surface-variant mb-6">Select a section or create a new one to organize your questions.</p>

          <div className="flex flex-col gap-4 mb-6">
            <div>
              <label className="block text-xs font-bold text-on-surface-variant mb-1">Select Existing Bank</label>
              <select
                className="w-full bg-surface-container border border-outline-variant/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer transition-shadow"
                value={selectedBankName}
                onChange={(e) => { setSelectedBankName(e.target.value); setNewBankName(''); }}
              >
                <option value="General">General</option>
                {Object.keys(groupedBankQuestions).filter(b => b !== 'General').map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-4">
              <div className="h-px bg-outline-variant/30 flex-1"></div>
              <span className="text-xs text-on-surface-variant font-bold uppercase tracking-wider">OR</span>
              <div className="h-px bg-outline-variant/30 flex-1"></div>
            </div>

            <div>
              <label className="block text-xs font-bold text-on-surface-variant mb-1">Create New Bank</label>
              <input
                type="text"
                placeholder="e.g. Math Quiz 101"
                className="w-full bg-surface-container border border-outline-variant/50 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-shadow"
                value={newBankName}
                onChange={(e) => { setNewBankName(e.target.value); if (e.target.value) setSelectedBankName(''); }}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowBankModal(false)}
              className="px-5 py-2.5 rounded-full font-label-md text-sm border border-outline-variant/50 text-on-surface-variant hover:bg-surface-container transition-colors press-effect disabled:opacity-50"
              disabled={isPublishing}
            >
              Cancel
            </button>
            <button
              onClick={executeSaveToBank}
              className="px-5 py-2.5 rounded-full font-label-md text-sm bg-primary text-on-primary hover:bg-primary-container transition-all shadow-sm flex items-center gap-2 press-effect disabled:opacity-50"
              disabled={isPublishing}
            >
              {isPublishing && <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />}
              {isPublishing ? 'Saving...' : 'Save Questions'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Unified delete confirmation dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        busy={isDeleting}
        tone="danger"
        title={deleteTarget?.kind === 'bank' ? 'Delete from Question Bank?' : 'Delete this question?'}
        message={
          deleteTarget?.kind === 'bank'
            ? `"${deleteTarget?.title || 'Untitled question'}" will be permanently removed from your global bank.`
            : `"${deleteTarget?.title || 'Untitled question'}" will be removed from this session draft.`
        }
        confirmLabel="Delete"
        cancelLabel="Keep It"
      />

    </div>
  );
};

export default SessionBuilder;
