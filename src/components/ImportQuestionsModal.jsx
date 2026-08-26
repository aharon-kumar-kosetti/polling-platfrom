import React, { useEffect, useMemo, useRef, useState } from 'react';
import Modal from './ui/Modal';
import Button, { buttonClasses } from './ui/Button';
import { useToast } from './ui/Toast';
import { parseQuestionsJson } from '../utils/questionImport';
import { questionAPI } from '../api/client';

const TEMPLATE_JSON = `{
  "questions": [
    {
      "text": "What is the capital of France?",
      "type": "single_choice",
      "marks": 2,
      "timeLimitSeconds": 30,
      "imageUrl": "",
      "options": [
        { "text": "Paris", "isCorrect": true },
        { "text": "London", "isCorrect": false },
        { "text": "Berlin", "isCorrect": false }
      ]
    },
    {
      "text": "The Sun is a star.",
      "type": "true_false",
      "marks": 1,
      "answer": true
    },
    {
      "text": "Which of these are programming languages?",
      "type": "multiple_choice",
      "marks": 3,
      "options": [
        { "text": "Python", "isCorrect": true },
        { "text": "HTML", "isCorrect": false },
        { "text": "Rust", "isCorrect": true }
      ]
    }
  ]
}`;

const CHUNK_SIZE = 25;

const ImportQuestionsModal = ({ open, onClose, bankQuestions, onImported }) => {
  const { toast } = useToast();
  const fileInputRef = useRef(null);

  const [step, setStep] = useState('input'); // 'input' | 'bank'
  const [rawText, setRawText] = useState('');
  const [showTemplate, setShowTemplate] = useState(false);
  const [bankChoice, setBankChoice] = useState('existing');
  const [selectedBankName, setSelectedBankName] = useState('');
  const [newBankName, setNewBankName] = useState('');
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  const groupedBanks = useMemo(() => {
    const map = {};
    bankQuestions.forEach((q) => {
      const bank = q.bankName || 'General';
      map[bank] = (map[bank] || 0) + 1;
    });
    return map;
  }, [bankQuestions]);

  const suggestedName = useMemo(() => {
    const used = new Set();
    Object.keys(groupedBanks).forEach((b) => {
      const m = b.match(/^question\s*bank\s*(\d+)$/i);
      if (m) used.add(Number(m[1]));
    });
    let n = 1;
    while (used.has(n)) n += 1;
    return `Question Bank ${n}`;
  }, [groupedBanks]);

  const result = useMemo(() => parseQuestionsJson(rawText), [rawText]);
  const isValid = result.questions.length > 0 && result.errors.length === 0;

  useEffect(() => {
    if (!open) return undefined;
    // Reset state each time the modal opens
    setStep('input');
    setRawText('');
    setShowTemplate(false);
    setImporting(false);
    setProgress({ done: 0, total: 0 });
    const bankNames = Object.keys(groupedBanks);
    setBankChoice(bankNames.length > 0 ? 'existing' : 'new');
    setSelectedBankName(bankNames[0] || '');
    setNewBankName(suggestedName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleFileUpload = (file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.json') && file.type !== 'application/json') {
      toast('Please upload a .json file.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setRawText(String(reader.result || ''));
      toast(`${file.name} loaded — review the validation below.`, 'info');
    };
    reader.onerror = () => toast('Could not read that file.', 'error');
    reader.readAsText(file);
  };

  const handleCopyTemplate = () => {
    navigator.clipboard.writeText(TEMPLATE_JSON);
    toast('Template copied to clipboard!');
  };

  const finalBankName = bankChoice === 'new'
    ? (newBankName.trim() || suggestedName)
    : selectedBankName;

  const handleImport = async () => {
    if (!isValid || !finalBankName) return;
    const all = result.questions;
    setImporting(true);
    setProgress({ done: 0, total: all.length });
    const saved = [];

    try {
      for (let i = 0; i < all.length; i += CHUNK_SIZE) {
        const chunk = all.slice(i, i + CHUNK_SIZE).map((q) => ({ ...q, bankName: finalBankName }));
        const res = await questionAPI.saveToBank(chunk);
        if (res.questions) {
          res.questions.forEach((q) => {
            saved.push({ ...q, options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options });
          });
        }
        setProgress({ done: Math.min(i + CHUNK_SIZE, all.length), total: all.length });
      }

      onImported(saved, finalBankName);
      toast(`Imported ${saved.length} question${saved.length > 1 ? 's' : ''} into "${finalBankName}"!`);
      onClose();
    } catch (err) {
      console.error(err);
      toast(`Import failed: ${err.message}`, 'error');
    } finally {
      setImporting(false);
    }
  };

  const close = () => { if (!importing) onClose(); };

  return (
    <Modal open={open} onClose={close} maxWidth="max-w-2xl">
      <div className="p-6 md:p-8">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined">upload_file</span>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-on-surface">Import Questions from JSON</h3>
            <p className="text-sm text-on-surface-variant">
              {step === 'input' ? 'Paste your JSON or upload a .json file — bulk imports of 100+ supported.' : `Choose where to save ${result.questions.length} validated question${result.questions.length > 1 ? 's' : ''}.`}
            </p>
          </div>
          <button
            onClick={close}
            disabled={importing}
            className="text-on-surface-variant hover:text-primary p-1.5 rounded-full hover:bg-surface-container transition-colors disabled:opacity-40"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mt-4 select-none" aria-label="Import progress">
          {['Paste JSON', 'Choose Bank'].map((label, i) => {
            const current = (step === 'input' ? 0 : 1) === i;
            return (
              <React.Fragment key={label}>
                {i > 0 && <span className="flex-1 h-0.5 rounded-full bg-outline-variant/40" />}
                <span className={`flex items-center gap-1.5 text-[11px] font-label-md font-bold uppercase tracking-wider ${current ? 'text-primary' : 'text-on-surface-variant'}`}>
                  <span className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] ${current ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant'}`}>{i + 1}</span>
                  {label}
                </span>
              </React.Fragment>
            );
          })}
        </div>

        {step === 'input' ? (
          <div className="mt-5 animate-tabIn">
            {/* Toolbar */}
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-full bg-surface-container-high text-primary text-xs font-label-md hover:bg-surface-container-highest transition-colors press-effect flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">upload</span>
                  Upload .json
                </button>
                <input
                  type="file"
                  accept=".json,application/json"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={(e) => handleFileUpload(e.target.files[0])}
                />
                <button
                  type="button"
                  onClick={() => setShowTemplate((s) => !s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-label-md transition-colors press-effect flex items-center gap-1.5 border ${
                    showTemplate
                      ? 'bg-secondary-container text-on-secondary-container border-secondary/30'
                      : 'bg-surface-container-high text-primary border-transparent hover:bg-surface-container-highest'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">data_object</span>
                  {showTemplate ? 'Hide Template' : 'View Template'}
                </button>
              </div>
              {rawText && (
                <button
                  type="button"
                  onClick={() => setRawText('')}
                  className="text-xs text-on-surface-variant hover:text-error transition-colors flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">backspace</span>
                  Clear
                </button>
              )}
            </div>

            {/* Template viewer */}
            {showTemplate && (
              <div className="mb-3 rounded-xl border border-outline-variant/40 bg-surface-container-low overflow-hidden animate-slideDown">
                <div className="flex items-center justify-between px-3 py-2 border-b border-outline-variant/30 bg-surface-container">
                  <span className="text-[11px] font-label-md font-bold uppercase tracking-wider text-on-surface-variant">Accepted format</span>
                  <button
                    type="button"
                    onClick={handleCopyTemplate}
                    className="text-xs font-label-md text-primary hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">content_copy</span>
                    Copy
                  </button>
                </div>
                <pre className="p-3 text-[11px] leading-relaxed font-mono text-primary overflow-x-auto max-h-56 custom-scrollbar">{TEMPLATE_JSON}</pre>
                <div className="px-3 py-2 border-t border-outline-variant/30 text-[11px] text-on-surface-variant flex flex-wrap gap-x-4 gap-y-1">
                  <span><strong>type:</strong> single_choice · multiple_choice · true_false</span>
                  <span><strong>marks:</strong> 1–4</span>
                  <span><strong>answer:</strong> shortcut for string options / true_false</span>
                </div>
              </div>
            )}

            {/* JSON textarea */}
            <textarea
              rows={8}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder='[ { "text": "Your question?", "options": [ { "text": "Answer", "isCorrect": true } ] } ]'
              className="w-full bg-surface-container-lowest border border-outline-variant/60 rounded-xl p-4 font-mono text-xs text-primary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 resize-none transition-shadow placeholder:text-outline custom-scrollbar"
              spellCheck={false}
            />

            {/* Validation feedback */}
            {rawText.trim() !== '' && (
              <div className="mt-3 animate-fadeIn">
                {result.errors.length > 0 && (
                  <div className="p-3 rounded-xl bg-error-container/60 border border-error/30 text-on-error-container text-xs">
                    <div className="flex items-center gap-1.5 font-label-md font-bold mb-1">
                      <span className="material-symbols-outlined text-sm">error</span>
                      {result.errors.length} issue{result.errors.length > 1 ? 's' : ''} found — fix these to continue
                    </div>
                    <ul className="list-disc pl-5 space-y-0.5 max-h-24 overflow-y-auto custom-scrollbar">
                      {result.errors.slice(0, 8).map((e, i) => <li key={i}>{e}</li>)}
                      {result.errors.length > 8 && <li>…and {result.errors.length - 8} more</li>}
                    </ul>
                  </div>
                )}
                {result.warnings.length > 0 && result.errors.length === 0 && (
                  <div className="p-3 rounded-xl bg-surface-container-high border border-outline-variant/40 text-on-surface-variant text-xs">
                    <div className="flex items-center gap-1.5 font-label-md font-bold mb-1 text-primary">
                      <span className="material-symbols-outlined text-sm">warning</span>
                      {result.warnings.length} warning{result.warnings.length > 1 ? 's' : ''}
                    </div>
                    <ul className="list-disc pl-5 space-y-0.5 max-h-16 overflow-y-auto custom-scrollbar">
                      {result.warnings.slice(0, 4).map((w, i) => <li key={i}>{w}</li>)}
                    </ul>
                  </div>
                )}
                {isValid && (
                  <div className="p-3 rounded-xl bg-secondary-container/50 border border-secondary/30 text-on-secondary-container text-xs flex items-center gap-2 font-label-md font-bold">
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                    {result.questions.length} question{result.questions.length > 1 ? 's' : ''} validated successfully
                    <button
                      type="button"
                      onClick={() => setStep('bank')}
                      className={buttonClasses('primary', 'sm', 'ml-auto')}
                    >
                      Next: Choose Bank
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="mt-5 animate-tabIn">
            {/* Existing banks */}
            <div className="max-h-40 overflow-y-auto custom-scrollbar flex flex-col gap-2 pr-1">
              {Object.entries(groupedBanks).map(([bankName, count]) => {
                const selected = bankChoice === 'existing' && selectedBankName === bankName;
                return (
                  <button
                    key={bankName}
                    type="button"
                    onClick={() => { setBankChoice('existing'); setSelectedBankName(bankName); }}
                    className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
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
                    <span className="text-[11px] font-label-md text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full shrink-0">{count} Q</span>
                  </button>
                );
              })}
              {Object.keys(groupedBanks).length === 0 && (
                <div className="text-center text-xs text-on-surface-variant py-3">No banks yet — create one below.</div>
              )}
            </div>

            <div className="flex items-center gap-4 my-4">
              <div className="h-px bg-outline-variant/30 flex-1"></div>
              <span className="text-xs text-on-surface-variant font-bold uppercase tracking-wider">or create new</span>
              <div className="h-px bg-outline-variant/30 flex-1"></div>
            </div>

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
                placeholder={suggestedName}
                className="flex-1 bg-transparent border-none p-1.5 text-sm font-label-md text-primary focus:outline-none placeholder:text-outline min-w-0"
                value={newBankName}
                onChange={(e) => { setNewBankName(e.target.value); setBankChoice('new'); }}
              />
            </div>

            {/* Progress bar during import */}
            {importing && (
              <div className="mt-4 animate-fadeIn">
                <div className="flex justify-between text-xs font-label-md text-on-surface-variant mb-1.5">
                  <span>Importing…</span>
                  <span className="font-mono font-bold text-primary">{progress.done} / {progress.total}</span>
                </div>
                <div className="w-full h-2 bg-surface-container-highest rounded-full overflow-hidden">
                  <div
                    className="h-full bg-secondary rounded-full transition-all duration-300"
                    style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer actions */}
        <div className="flex justify-between items-center gap-3 mt-6">
          {step === 'bank' && !importing ? (
            <button
              onClick={() => setStep('input')}
              className="px-4 py-2.5 rounded-full font-label-md text-sm text-on-surface-variant hover:bg-surface-container transition-colors press-effect flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              Back
            </button>
          ) : <span />}

          <div className="flex gap-3">
            <button
              onClick={close}
              disabled={importing}
              className="px-5 py-2.5 rounded-full font-label-md text-sm border border-outline-variant/50 text-on-surface-variant hover:bg-surface-container transition-colors press-effect disabled:opacity-50"
            >
              Cancel
            </button>
            {step === 'bank' && (
              <Button
                variant="primary"
                loading={importing}
                disabled={!isValid || importing || !finalBankName}
                onClick={handleImport}
              >
                {importing ? 'Importing…' : `Import ${result.questions.length} Question${result.questions.length > 1 ? 's' : ''}`}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ImportQuestionsModal;
