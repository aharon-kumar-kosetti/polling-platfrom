import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { questionAPI, sessionAPI } from '../api/client';
import Sidebar from '../components/ui/Sidebar';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Dropdown from '../components/ui/Dropdown';
import ImportQuestionsModal from '../components/ImportQuestionsModal';
import Button, { buttonClasses } from '../components/ui/Button';
import { useToast } from '../components/ui/Toast';

const TYPE_OPTIONS = [
  { value: 'single_choice', label: 'Single Choice' },
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'true_false', label: 'True / False' },
];

const MARKS_OPTIONS = [
  { value: 1, label: '1 Mark' },
  { value: 2, label: '2 Marks' },
  { value: 3, label: '3 Marks' },
  { value: 4, label: '4 Marks' },
];

const DRAFT_KEY = 'quizcore_builder_draft';

const createDefaultQuestion = () => ({
  id: Date.now(),
  text: '',
  type: 'single_choice',
  marks: 2,
  imageUrl: '',
  options: [
    { id: 'a', text: 'Option 1', isCorrect: true, imageUrl: '' },
    { id: 'b', text: 'Option 2', isCorrect: false, imageUrl: '' },
  ]
});

const SessionBuilder = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sessionTitle, setSessionTitle] = useState('');

  const [questions, setQuestions] = useState([
    {
      id: 1,
      text: '',
      type: 'single_choice',
      marks: 2,
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
  const [bankChoice, setBankChoice] = useState('existing'); // 'existing' | 'new'
  const [selectedBankName, setSelectedBankName] = useState('General');
  const [newBankName, setNewBankName] = useState('');

  const [deleteTarget, setDeleteTarget] = useState(null); // { kind: 'draft' | 'bank', index?, id?, title? }
  const [isDeleting, setIsDeleting] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [autosaveState, setAutosaveState] = useState('idle'); // idle | saving | saved | error

  const hydratedRef = useRef(false);
  const lastSnapshotRef = useRef('');
  const suppressAutosaveRef = useRef(false);

  // Hydrate from DB (sessions + bank). In bank-builder mode, restore any
  // unsaved local draft so questions are never lost between visits.
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

        if (!id) {
          // Restore the local working draft if one exists (takes priority over bank seed)
          const savedDraft = localStorage.getItem(DRAFT_KEY);
          if (savedDraft) {
            try {
              const parsedDraft = JSON.parse(savedDraft);
              if (Array.isArray(parsedDraft) && parsedDraft.length > 0) {
                setQuestions(parsedDraft);
                setActiveQuestionIndex(0);
                lastSnapshotRef.current = JSON.stringify(parsedDraft);
                hydratedRef.current = true;
                toast('Unsaved draft restored — press "Save Session" to store it in your bank.', 'info');
                return;
              }
            } catch (e) { localStorage.removeItem(DRAFT_KEY); }
          }
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
      } finally {
        lastSnapshotRef.current = JSON.stringify(questions);
        hydratedRef.current = true;
      }
    };
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // AUTOSAVE — sessions persist straight to the database; the standalone
  // builder keeps a local draft so nothing is ever lost on refresh/logout.
  useEffect(() => {
    if (!hydratedRef.current || isPublishing) return undefined;
    const snapshot = JSON.stringify(questions);
    if (snapshot === lastSnapshotRef.current) return undefined;

    // After an explicit save the content already lives in the DB/bank —
    // sync the snapshot once without writing a redundant draft.
    if (suppressAutosaveRef.current) {
      suppressAutosaveRef.current = false;
      lastSnapshotRef.current = snapshot;
      return undefined;
    }

    const delay = id ? 2000 : 600;
    const timer = setTimeout(async () => {
      if (id) {
        setAutosaveState('saving');
        try {
          await sessionAPI.updateSessionQuestions(id, questions.filter(q => q.text && q.text.trim() !== ''));
          lastSnapshotRef.current = snapshot;
          setAutosaveState('saved');
        } catch (e) {
          console.warn('Autosave failed:', e.message);
          setAutosaveState('error');
        }
      } else {
        try {
          localStorage.setItem(DRAFT_KEY, snapshot);
          lastSnapshotRef.current = snapshot;
          setAutosaveState('saved');
        } catch (e) {
          setAutosaveState('error');
        }
      }
    }, delay);
    return () => clearTimeout(timer);
  }, [questions, id, isPublishing]);

  const currentQ = questions[activeQuestionIndex] || questions[0];

  const handleAddQuestion = () => {
    const newQ = {
      id: Date.now(),
      text: 'New Question Title',
      type: 'single_choice',
      marks: 2,
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

  const requestDeleteBankGroup = (bankName, count) => {
    setDeleteTarget({ kind: 'bank_group', bankName, count });
  };

  const requestClearAllDrafts = () => {
    setDeleteTarget({ kind: 'clear_drafts', count: questions.length });
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
      } else if (deleteTarget.kind === 'clear_drafts') {
        const resetQ = [createDefaultQuestion()];
        setQuestions(resetQ);
        setActiveQuestionIndex(0);
        localStorage.removeItem(DRAFT_KEY);
        suppressAutosaveRef.current = true;
        lastSnapshotRef.current = JSON.stringify(resetQ);
        if (id) {
          try {
            await sessionAPI.updateSessionQuestions(id, []);
          } catch (err) {
            console.warn('Failed to clear session questions on server:', err);
          }
        }
        setAutosaveState('idle');
        toast('All draft questions cleared.', 'info');
      } else if (deleteTarget.kind === 'bank_group') {
        await questionAPI.deleteQuestionBank(deleteTarget.bankName);
        setBankQuestions(bankQuestions.filter(q => (q.bankName || 'General') !== deleteTarget.bankName));
        toast(`Question Bank "${deleteTarget.bankName}" deleted.`, 'info');
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

  // Suggests "Question Bank N" using the lowest unused number
  const suggestBankName = () => {
    const used = new Set();
    bankQuestions.forEach((q) => {
      const m = (q.bankName || '').match(/^question\s*bank\s*(\d+)$/i);
      if (m) used.add(Number(m[1]));
    });
    let n = 1;
    while (used.has(n)) n += 1;
    return `Question Bank ${n}`;
  };

  const openBankModal = (action) => {
    const bankNames = Object.keys(groupedBankQuestions);
    const hasBanks = bankNames.length > 0;
    setBankModalAction(action);
    setBankChoice(hasBanks ? 'existing' : 'new');
    setSelectedBankName(hasBanks ? bankNames[0] : '');
    setNewBankName(suggestBankName());
    setShowBankModal(true);
  };

  const handleSaveSession = async () => {
    const validQuestions = questions.filter(q => q.text && q.text.trim() !== '');
    if (validQuestions.length === 0) {
      toast('Please write at least one question before saving.', 'error');
      return;
    }
    if (id) {
      setIsPublishing(true);
      try {
        const sessionRes = await sessionAPI.updateSessionQuestions(id, validQuestions);
        if (sessionRes.questions) {
          const updatedQs = sessionRes.questions.map(q => ({
            ...q,
            options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options
          }));
          setQuestions(updatedQs);
        }
        toast('Successfully saved questions to this Session!', 'success');
      } catch (err) {
        toast('Error saving session: ' + err.message, 'error');
      } finally {
        setIsPublishing(false);
      }
      return;
    }

    openBankModal('bulk');
  };

  const handleSaveSingleToBank = async (q) => {
    if (!q.text || q.text.trim() === '') {
      toast('Write the question prompt before saving it to the bank.', 'error');
      return;
    }
    openBankModal('single');
  };

  const executeSaveToBank = async () => {
    const finalBankName = bankChoice === 'new'
      ? (newBankName.trim() || suggestBankName())
      : selectedBankName;
    if (!finalBankName) {
      toast('Pick a bank or name your new one first.', 'error');
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
          // This should never be reached now, but kept for completeness
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
          // Questions now live in the bank — clear the local draft
          localStorage.removeItem(DRAFT_KEY);
          suppressAutosaveRef.current = true;
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

  const handleEditBankQuestion = (bankQ) => {
    setActiveTab('drafts');
    const idx = questions.findIndex(q => q.id === bankQ.id);
    if (idx >= 0) {
      setActiveQuestionIndex(idx);
    } else {
      setQuestions([...questions, { ...bankQ }]);
      setActiveQuestionIndex(questions.length);
    }
    toast('Editing bank question — use "Save to Bank" to update it in place.', 'info');
  };

  const handleCopyFromBank = (bankQ) => {
    const newQ = { ...bankQ, id: Date.now() }; // new local ID
    setActiveTab('drafts');
    setQuestions([...questions, newQ]);
    setActiveQuestionIndex(questions.length);
    toast('Question copied into your session draft.', 'info');
  };

  const handleImported = (savedQuestions) => {
    setBankQuestions(prev => {
      const next = [...prev];
      savedQuestions.forEach((sq) => {
        const idx = next.findIndex(bq => bq.id === sq.id);
        if (idx >= 0) next[idx] = sq;
        else next.push(sq);
      });
      return next;
    });
    setActiveTab('bank');
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
      <Sidebar active="/builder" />

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

          <div className="flex items-center gap-2 md:gap-3">
            {/* Autosave indicator */}
            <span
              className={`hidden lg:inline-flex items-center gap-1.5 text-[11px] font-label-md transition-all duration-300 ${
                autosaveState === 'error' ? 'text-error' : 'text-on-surface-variant'
              }`}
              aria-live="polite"
            >
              {autosaveState === 'saving' && (<>
                <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Saving…
              </>)}
              {autosaveState === 'saved' && (<>
                <span className="material-symbols-outlined text-[14px] text-secondary">cloud_done</span>
                {id ? 'Saved to database' : 'Draft saved'}
              </>)}
              {autosaveState === 'error' && (<>
                <span className="material-symbols-outlined text-[14px]">cloud_off</span>
                Offline — will retry
              </>)}
            </span>

            <Button
              variant="outline-danger"
              size="sm"
              icon="delete_sweep"
              onClick={requestClearAllDrafts}
              title="Clear all draft questions"
              className="hidden sm:inline-flex"
            >
              Clear All Drafts
            </Button>
            <Button
              variant="outline-danger"
              size="sm"
              icon="delete_sweep"
              onClick={requestClearAllDrafts}
              title="Clear all draft questions"
              className="sm:hidden !px-3"
              aria-label="Clear All Drafts"
            />

            <Button
              variant="outline"
              size="sm"
              icon="upload_file"
              onClick={() => setShowImportModal(true)}
              title="Bulk import questions from a JSON file"
              className="hidden sm:inline-flex"
            >
              Import JSON
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon="upload_file"
              onClick={() => setShowImportModal(true)}
              title="Bulk import questions from a JSON file"
              className="sm:hidden !px-3"
              aria-label="Import JSON"
            />

            <Button
              variant="primary"
              size="sm"
              icon="save"
              loading={isPublishing}
              onClick={handleSaveSession}
            >
              {isPublishing ? 'Saving...' : 'Save Session'}
            </Button>
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
                <div className="p-4 border-b border-outline-variant/20 flex justify-between items-center gap-2">
                  <span className="font-label-md text-xs font-bold text-primary uppercase tracking-wider">Active List</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={requestClearAllDrafts}
                      className="text-[11px] font-label-md font-bold text-error hover:text-error hover:bg-error-container/40 px-2.5 py-1 rounded-full border border-error/30 flex items-center gap-1 transition-all press-effect shadow-xs"
                      title="Clear all draft questions"
                    >
                      <span className="material-symbols-outlined text-[14px]">delete_sweep</span>
                      <span>Clear All Drafts</span>
                    </button>
                    <button
                      onClick={handleAddQuestion}
                      className="w-7 h-7 rounded-full bg-surface-variant text-primary flex items-center justify-center hover:bg-primary hover:text-on-primary transition-all shadow-sm press-effect"
                      title="Add new question"
                    >
                      <span className="material-symbols-outlined text-[16px]">add</span>
                    </button>
                  </div>
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
                          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                            <span className="material-symbols-outlined text-[14px] text-secondary">psychology_alt</span>
                            <span className="text-[10px] uppercase font-bold text-on-surface-variant">
                              {q.type === 'single_choice' ? 'Single Choice' : q.type === 'multiple_choice' ? 'Multiple Choice' : 'True/False'}
                            </span>
                            <span className="text-[10px] font-label-md font-bold text-on-secondary-container bg-secondary-container/50 px-1.5 rounded-full">
                              {q.marks || 2}m
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
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-label-md text-xs font-bold text-primary uppercase tracking-wider">Question Bank</span>
                    <button
                      onClick={() => setShowImportModal(true)}
                      className={buttonClasses('primary', 'sm', '!px-2.5 !py-1 !text-[10px]')}
                      title="Bulk import questions from JSON"
                    >
                      <span className="material-symbols-outlined text-[13px]">upload_file</span>
                      Import JSON
                    </button>
                  </div>
                  <span className="text-[10px] text-on-surface-variant">Saved globally. Hover a card to edit, add or remove.</span>
                </div>

                <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-4 custom-scrollbar">
                  {Object.entries(groupedBankQuestions).map(([bankName, qs]) => (
                    <div key={bankName} className="flex flex-col gap-2">
                      <div className="flex items-center justify-between group/bankHead">
                        <h4 className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">{bankName} ({qs.length})</h4>
                        <button
                          onClick={() => requestDeleteBankGroup(bankName, qs.length)}
                          title={`Delete entire "${bankName}" question bank`}
                          aria-label={`Delete ${bankName} bank`}
                          className="opacity-0 group-hover/bankHead:opacity-100 hover:opacity-100 transition-opacity flex items-center gap-1 text-[11px] font-bold text-error/80 hover:text-error hover:bg-error-container/30 px-2 py-0.5 rounded-full border border-error/20"
                        >
                          <span className="material-symbols-outlined text-[13px]">delete_sweep</span>
                          <span>Delete Bank</span>
                        </button>
                      </div>
                      {qs.map((bq) => (
                        <div
                          key={bq.id}
                          className="group relative w-full flex flex-col gap-1.5 rounded-xl pl-4 pr-24 py-3 transition-all duration-200 bg-surface-container-low border border-outline-variant/30 hover:border-primary/50 hover:-translate-y-px hover:shadow-sm"
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-label-md text-[10px] opacity-70 uppercase tracking-widest">{bq.type.replace('_', ' ')}</span>
                            <span className="text-[10px] font-label-md font-bold text-on-secondary-container bg-secondary-container/50 border border-secondary/20 px-1.5 py-px rounded-full">
                              {bq.marks || 1} {((bq.marks || 1) === 1) ? 'Mark' : 'Marks'}
                            </span>
                          </div>
                          <span className="text-xs font-medium line-clamp-2 pr-1">{bq.text || 'Untitled'}</span>

                          {/* Action cluster: edit / add / delete */}
                          <div className="absolute top-1/2 -translate-y-1/2 right-2 flex opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 bg-surface-container-lowest shadow-sm rounded-full overflow-hidden border border-outline-variant/30">
                            <button
                              onClick={() => handleEditBankQuestion(bq)}
                              aria-label="Edit in builder"
                              title="Edit this question"
                              className="w-8 h-8 flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high hover:text-primary transition-colors press-effect"
                            >
                              <span className="material-symbols-outlined text-[15px]">edit</span>
                            </button>
                            <button
                              onClick={() => handleCopyFromBank(bq)}
                              aria-label="Add to session"
                              title="Add a copy to Session"
                              className="w-8 h-8 flex items-center justify-center text-on-surface-variant hover:bg-secondary-container hover:text-on-secondary-container transition-colors press-effect border-l border-outline-variant/30"
                            >
                              <span className="material-symbols-outlined text-[15px]">add</span>
                            </button>
                            <button
                              onClick={() => handleEditBankQuestion(bq)}
                              aria-label="Edit bank question"
                              title="Edit Bank Question"
                              className="w-8 h-8 flex items-center justify-center text-on-surface-variant hover:bg-primary-container hover:text-primary transition-colors press-effect border-l border-outline-variant/30"
                            >
                              <span className="material-symbols-outlined text-[15px]">edit</span>
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

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-label-md text-on-surface-variant">Marks:</span>
                  <Dropdown
                    ariaLabel="Question marks"
                    value={currentQ.marks ?? 2}
                    onChange={(v) => handleUpdateQuestion('marks', v)}
                    options={MARKS_OPTIONS}
                    icon="stars"
                  />

                  <span className="text-xs font-label-md text-on-surface-variant">Type:</span>
                  <Dropdown
                    ariaLabel="Question type"
                    value={currentQ.type}
                    onChange={(v) => handleUpdateQuestion('type', v)}
                    options={TYPE_OPTIONS}
                    icon="category"
                  />

                  <div className="w-px h-4 bg-outline-variant/40 mx-1"></div>

                  <button
                    onClick={() => handleSaveSingleToBank(currentQ)}
                    className={buttonClasses('outline', 'sm')}
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
                  {currentQ.options.map((opt, optIdx) => {
                    // Partial-credit preview: the 100% share is split evenly across
                    // correct options; each is worth (marks / totalCorrect) points.
                    const isMultiType = currentQ.type === 'multiple_choice';
                    const correctCount = currentQ.options.filter(o => o.isCorrect).length;
                    const qMarks = Number(currentQ.marks) > 0 ? Number(currentQ.marks) : 2;
                    const round2 = (n) => Math.round(n * 100) / 100;
                    const sharePct = isMultiType && correctCount > 0
                      ? Math.round((100 / correctCount) * 10) / 10
                      : 0;
                    const optWorth = isMultiType && opt.isCorrect && correctCount > 0
                      ? round2(qMarks / correctCount)
                      : 0;

                    return (
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
                          className="bg-transparent border-none p-0 focus:ring-0 focus:outline-none text-sm font-medium text-primary flex-1 disabled:opacity-80 min-w-0"
                        />

                        {/* Per-option point value — visible to admin only */}
                        {isMultiType && (
                          <span
                            title={opt.isCorrect ? `Worth ${sharePct}% of the question · awards ${optWorth} pts` : 'Selecting this option scores 0'}
                            className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-label-md font-bold border select-none ${
                              opt.isCorrect
                                ? 'bg-secondary-container/60 text-on-secondary-container border-secondary/30'
                                : 'bg-surface-container-high text-on-surface-variant/70 border-outline-variant/30 line-through'
                            }`}
                          >
                            {opt.isCorrect ? `${sharePct}% · ${optWorth} pts` : '0 pts'}
                          </span>
                        )}

                        {currentQ.type !== 'true_false' && currentQ.options.length > 2 && (
                          <button
                            type="button"
                            onClick={() => handleDeleteOption(optIdx)}
                            aria-label="Remove option"
                            className="text-outline hover:text-error p-1 rounded-full opacity-60 hover:opacity-100 hover:bg-error-container/40 transition-all press-effect shrink-0"
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
                    );
                  })}
                </div>

                {/* Partial-credit explainer (admin only) */}
                {currentQ.type === 'multiple_choice' && (
                  <p className="mt-4 text-[11px] font-label-md text-on-surface-variant flex items-start gap-1.5 bg-surface-container-low border border-outline-variant/30 rounded-xl px-3 py-2.5">
                    <span className="material-symbols-outlined text-[14px] text-secondary mt-px">percent</span>
                    <span>
                      Partial credit is on: the <strong className="text-primary">100%</strong> share is split across{' '}
                      <strong className="text-primary">{currentQ.options.filter(o => o.isCorrect).length || 0} correct option(s)</strong>
                      {currentQ.options.filter(o => o.isCorrect).length > 0 && (
                        <> — each correct pick earns{' '}
                        <strong className="text-primary">{Math.round(((Number(currentQ.marks) > 0 ? Number(currentQ.marks) : 2) / currentQ.options.filter(o => o.isCorrect).length) * 100) / 100} pts</strong>
                        {currentQ.options.filter(o => o.isCorrect).length > 1 ? ' (decimals allowed)' : ''}, but picking even one wrong option scores <strong className="text-error">0</strong>.</>
                      )}
                    </span>
                  </p>
                )}
              </div>

            </div>

            {/* Quick Actions Footer */}
            <div className="flex justify-between items-center w-full">
              <Button
                variant="outline"
                icon="arrow_back"
                disabled={activeQuestionIndex === 0}
                onClick={() => setActiveQuestionIndex(prev => prev - 1)}
              >
                Previous Question
              </Button>

              <Button
                variant="primary"
                iconRight="arrow_forward"
                disabled={activeQuestionIndex === questions.length - 1}
                onClick={() => setActiveQuestionIndex(prev => prev + 1)}
              >
                Next Question
              </Button>
            </div>

          </section>
        </div>
      </main>

      {/* Bank Chooser Modal */}
      <Modal open={showBankModal} onClose={() => setShowBankModal(false)} maxWidth="max-w-md">
        <div className="p-6 md:p-8">
          <div className="flex items-start gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined">inventory_2</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-on-surface">Choose a Question Bank</h3>
              <p className="text-sm text-on-surface-variant">
                {bankModalAction === 'single' ? 'This question will be saved into the bank you pick.' : `Your ${questions.filter(q => q.text?.trim()).length} question(s) will be saved into the bank you pick.`}
              </p>
            </div>
          </div>

          {/* Existing banks */}
          <div className="mt-6 max-h-44 overflow-y-auto custom-scrollbar flex flex-col gap-2 pr-1">
            {Object.entries(groupedBankQuestions).map(([bankName, qs]) => {
              const selected = bankChoice === 'existing' && selectedBankName === bankName;
              return (
                <button
                  key={bankName}
                  type="button"
                  onClick={() => { setBankChoice('existing'); setSelectedBankName(bankName); }}
                  className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
                    selected
                      ? 'border-primary bg-surface-container-low ring-1 ring-primary shadow-sm'
                      : 'border-outline-variant/40 bg-surface-container-lowest hover:border-outline-variant'
                  }`}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${selected ? 'border-primary bg-primary' : 'border-outline-variant'}`}>
                      {selected && <span className="w-1.5 h-1.5 rounded-full bg-on-primary" />}
                    </span>
                    <span className="text-sm font-label-md font-bold text-primary truncate">{bankName}</span>
                  </span>
                  <span className="text-[11px] font-label-md text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full shrink-0">
                    {qs.length} Q
                  </span>
                </button>
              );
            })}
            {Object.keys(groupedBankQuestions).length === 0 && (
              <div className="text-center text-xs text-on-surface-variant py-4 flex flex-col items-center gap-1">
                <span className="material-symbols-outlined text-2xl text-outline-variant">folder_open</span>
                No banks yet — create your first one below.
              </div>
            )}
          </div>

          {/* OR divider */}
          <div className="flex items-center gap-4 my-5">
            <div className="h-px bg-outline-variant/30 flex-1"></div>
            <span className="text-xs text-on-surface-variant font-bold uppercase tracking-wider">or create new</span>
            <div className="h-px bg-outline-variant/30 flex-1"></div>
          </div>

          {/* Create / rename new bank */}
          <div
            onClick={() => setBankChoice('new')}
            className={`rounded-xl border p-1.5 flex items-center gap-2 transition-all duration-200 cursor-text ${
              bankChoice === 'new'
                ? 'border-primary bg-surface-container-low ring-1 ring-primary shadow-sm'
                : 'border-outline-variant/40 bg-surface-container-lowest hover:border-outline-variant'
            }`}
          >
            <span className="material-symbols-outlined text-[18px] text-on-surface-variant pl-2">edit_note</span>
            <input
              type="text"
              placeholder="e.g. Question Bank 1"
              className="flex-1 bg-transparent border-none p-1.5 text-sm font-label-md text-primary focus:outline-none placeholder:text-outline min-w-0"
              value={newBankName}
              onChange={(e) => { setNewBankName(e.target.value); setBankChoice('new'); }}
            />
          </div>
          <p className="text-[11px] text-on-surface-variant mt-2">
            Tip: type a custom name to rename your new bank — questions will be grouped under it.
          </p>

          <div className="flex justify-end gap-3 mt-6">
            <Button variant="ghost" disabled={isPublishing} onClick={() => setShowBankModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" loading={isPublishing} onClick={executeSaveToBank} disabled={isPublishing}>
              {isPublishing ? 'Saving...' : `Save to ${(bankChoice === 'new' ? (newBankName.trim() || suggestBankName()) : selectedBankName) || 'Bank'}`}
            </Button>
          </div>
        </div>
      </Modal>

      {/* JSON Import flow */}
      <ImportQuestionsModal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        bankQuestions={bankQuestions}
        onImported={handleImported}
      />

      {/* Unified delete confirmation dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        busy={isDeleting}
        tone="danger"
        title={
          deleteTarget?.kind === 'clear_drafts'
            ? 'Clear All Draft Questions?'
            : deleteTarget?.kind === 'bank_group'
              ? `Delete Entire Question Bank "${deleteTarget?.bankName}"?`
              : deleteTarget?.kind === 'bank'
                ? 'Delete from Question Bank?'
                : 'Delete this question?'
        }
        message={
          deleteTarget?.kind === 'clear_drafts'
            ? `Are you sure you want to clear all ${deleteTarget?.count || questions.length} draft question(s)? This will reset your current draft session.`
            : deleteTarget?.kind === 'bank_group'
              ? `All ${deleteTarget?.count || 0} question(s) in "${deleteTarget?.bankName}" will be permanently removed from your global question bank. This action cannot be undone.`
              : deleteTarget?.kind === 'bank'
                ? `"${deleteTarget?.title || 'Untitled question'}" will be permanently removed from your global bank.`
                : `"${deleteTarget?.title || 'Untitled question'}" will be removed from this session draft.`
        }
        confirmLabel={
          deleteTarget?.kind === 'clear_drafts'
            ? 'Clear All Drafts'
            : deleteTarget?.kind === 'bank_group'
              ? 'Delete Bank'
              : 'Delete'
        }
        cancelLabel={deleteTarget?.kind === 'clear_drafts' ? 'Cancel' : 'Keep It'}
      />

    </div>
  );
};

export default SessionBuilder;
