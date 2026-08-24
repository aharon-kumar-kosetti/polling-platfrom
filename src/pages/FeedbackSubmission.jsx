import React, { useState, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useToast } from '../components/ui/Toast';

const FeedbackSubmission = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const pin = searchParams.get('pin') || 'TECH-88';

  const [name, setName] = useState('');
  const [branch, setBranch] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [feedback, setFeedback] = useState('');
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const fileInputRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitting(true);
    // Simulate persistence round-trip for a consistent async UX
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
      toast('Feedback submitted. Thank you!');
    }, 900);
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col justify-between antialiased selection:bg-secondary-container selection:text-on-secondary-container relative p-6">
      
      {/* Ambient Blob */}
      <div className="fixed top-0 right-0 w-96 h-96 rounded-full bg-secondary-container/20 blur-3xl pointer-events-none -z-10"></div>

      <header className="max-w-2xl mx-auto w-full flex items-center justify-between py-4">
        <Link to="/" className="font-display-sm text-2xl font-bold text-primary flex items-center gap-2">
          <span className="material-symbols-outlined text-secondary">token</span><span className="text-primary">QuizCore</span>
        </Link>
        <div className="text-xs font-mono text-on-surface-variant font-bold">
          ROOM: {pin}
        </div>
      </header>

      <main className="max-w-xl mx-auto w-full flex-1 flex flex-col justify-center py-8">
        
        {!submitted ? (
          <div className="bg-surface-container-lowest rounded-3xl p-8 md:p-10 border border-outline-variant/30 shadow-editorial">
            <div className="text-center mb-8">
              <span className="px-3 py-1 bg-surface-container-high rounded-full font-label-sm text-xs font-bold uppercase tracking-wider text-on-surface">
                Student Feedback
              </span>
              <h1 className="font-display-sm text-3xl font-bold text-primary mt-3 mb-1">
                Share your experience
              </h1>
              <p className="text-sm text-on-surface-variant">
                Your feedback helps us improve future sessions.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              
              {/* 1. Name of the Student */}
              <div>
                <label className="block text-xs uppercase font-label-md text-on-surface-variant font-bold mb-2">
                  1. Name of the Student <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full bg-surface-container-lowest border border-outline-variant/60 rounded-xl px-4 h-12 font-body-md text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-shadow"
                />
              </div>

              {/* 2. Branch */}
              <div>
                <label className="block text-xs uppercase font-label-md text-on-surface-variant font-bold mb-2">
                  2. Branch
                </label>
                <select
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant/60 rounded-xl px-4 h-12 font-body-md text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none appearance-none cursor-pointer transition-shadow"
                >
                  <option value="" disabled>Select your branch</option>
                  <option value="CSD">CSD</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* 3. Difficulty Level */}
              <div>
                <label className="block text-xs uppercase font-label-md text-on-surface-variant font-bold mb-3">
                  3. How was the difficulty level of the quiz questions?
                </label>
                <div className="flex flex-col gap-3">
                  {['Very Easy', 'Easy', 'Moderate', 'Difficult', 'Very Difficult'].map((level) => (
                    <label key={level} className="flex items-center gap-3 cursor-pointer group">
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${difficulty === level ? 'border-primary bg-primary' : 'border-outline-variant group-hover:border-primary'}`}>
                        {difficulty === level && <div className="w-2 h-2 rounded-full bg-on-primary"></div>}
                      </div>
                      <input
                        type="radio"
                        name="difficulty"
                        value={level}
                        checked={difficulty === level}
                        onChange={(e) => setDifficulty(e.target.value)}
                        className="hidden"
                      />
                      <span className="font-body-md text-sm text-on-surface">{level}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 4. Feedback in Your Own Words */}
              <div>
                <label className="block text-xs uppercase font-label-md text-on-surface-variant font-bold mb-2">
                  4. Your Feedback in Your Own Words
                </label>
                <textarea
                  rows={4}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Share your experience and suggestions..."
                  className="w-full bg-surface-container-lowest border border-outline-variant/60 rounded-xl p-4 font-body-md text-sm focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none resize-none transition-shadow"
                />
              </div>

              {/* 5. Add File */}
              <div>
                <label className="block text-xs uppercase font-label-md text-on-surface-variant font-bold mb-2">
                  5. Add File (Optional)
                </label>
                <div className="border-2 border-dashed border-outline-variant/50 rounded-2xl p-6 text-center">
                  {!file ? (
                    <div className="flex flex-col items-center gap-3">
                      <span className="material-symbols-outlined text-4xl text-outline-variant">cloud_upload</span>
                      <p className="text-xs text-on-surface-variant">Supported formats: PDF, DOC/DOCX, PNG, JPG/JPEG</p>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 mt-2 bg-secondary-container text-on-secondary-container rounded-full font-label-md text-xs hover:bg-secondary hover:text-on-secondary transition-colors press-effect"
                      >
                        Upload File
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex items-center gap-2 text-primary">
                        <span className="material-symbols-outlined">description</span>
                        <span className="font-label-md text-sm truncate max-w-[200px]">{file.name}</span>
                      </div>
                      <span className="text-xs text-on-surface-variant">{formatFileSize(file.size)}</span>
                      <button
                        type="button"
                        onClick={handleRemoveFile}
                        className="px-4 py-2 mt-2 border border-error text-error rounded-full font-label-md text-xs hover:bg-error-container transition-colors"
                      >
                        Remove File
                      </button>
                    </div>
                  )}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 rounded-full bg-primary text-on-primary font-label-md text-sm hover:bg-primary-container transition-all shadow-md active:scale-98 mt-2 flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {submitting && <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />}
                {submitting ? 'Submitting...' : 'Submit Feedback'}
              </button>

            </form>
          </div>
        ) : (
          <div className="bg-surface-container-lowest rounded-3xl p-10 border border-outline-variant/30 shadow-editorial text-center animate-scaleIn">
            <div className="w-16 h-16 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center mx-auto mb-4 border border-secondary/30">
              <span className="material-symbols-outlined text-3xl icon-fill">check_circle</span>
            </div>
            <h2 className="font-display-sm text-3xl font-bold text-primary mb-2">Thank you for your feedback!</h2>
            <p className="text-sm text-on-surface-variant mb-8 max-w-sm mx-auto">
              Your responses have been recorded successfully.
            </p>

            <div className="flex justify-center">
              <Link
                to="/"
                className="px-8 py-3 rounded-full bg-primary text-on-primary font-label-md text-sm hover:bg-primary-container transition-all"
              >
                Return to Home
              </Link>
            </div>
          </div>
        )}

      </main>

      <footer className="py-4 text-center text-xs text-outline font-label-md"><span className="text-primary">QuizCore</span> • Audience Feedback
      </footer>

    </div>
  );
};

export default FeedbackSubmission;

