import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';

const FeedbackSubmission = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const pin = searchParams.get('pin') || 'TECH-88';
  const username = searchParams.get('username') || 'PixelCrafter';

  const [rating, setRating] = useState(5);
  const [nps, setNps] = useState(9);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col justify-between antialiased selection:bg-secondary-container selection:text-on-secondary-container relative p-6">
      
      {/* Ambient Blob */}
      <div className="fixed top-0 right-0 w-96 h-96 rounded-full bg-secondary-container/20 blur-3xl pointer-events-none -z-10"></div>

      <header className="max-w-2xl mx-auto w-full flex items-center justify-between py-4">
        <Link to="/" className="font-display-sm text-2xl font-bold text-primary flex items-center gap-2">
          <span className="material-symbols-outlined text-secondary">token</span>
          QUIZCORE
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
                Attendee Feedback
              </span>
              <h1 className="font-display-sm text-3xl font-bold text-primary mt-3 mb-1">
                How was the session?
              </h1>
              <p className="text-sm text-on-surface-variant">
                Your feedback helps the host craft better interactive experiences.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              
              {/* Star Rating */}
              <div>
                <label className="block text-xs uppercase font-label-md text-on-surface-variant font-bold mb-3 text-center">
                  Overall Experience Rating
                </label>
                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className={`text-3xl transition-transform hover:scale-125 ${
                        star <= rating ? 'text-secondary-fixed-dim' : 'text-outline-variant/50'
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              {/* NPS 1-10 Scale */}
              <div>
                <label className="block text-xs uppercase font-label-md text-on-surface-variant font-bold mb-2 text-center">
                  Likelihood to Recommend (NPS)
                </label>
                <div className="grid grid-cols-10 gap-1">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setNps(num)}
                      className={`h-10 rounded-xl text-xs font-bold font-mono transition-colors ${
                        nps === num 
                          ? 'bg-primary text-on-primary' 
                          : 'bg-surface-container-low hover:bg-surface-container border border-outline-variant/30'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
                <div className="flex justify-between text-[10px] text-on-surface-variant mt-1">
                  <span>Not likely (1)</span>
                  <span>Extremely likely (10)</span>
                </div>
              </div>

              {/* Comment Textarea */}
              <div>
                <label className="block text-xs uppercase font-label-md text-on-surface-variant font-bold mb-2">
                  What was your favorite takeaway?
                </label>
                <textarea
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Share any thoughts, favorite questions, or suggestions..."
                  className="w-full bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-4 font-body-md text-sm focus:border-primary focus:outline-none resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-4 rounded-full bg-primary text-on-primary font-label-md text-sm hover:bg-primary-container transition-all shadow-md active:scale-98"
              >
                Submit Feedback
              </button>

            </form>
          </div>
        ) : (
          <div className="bg-surface-container-lowest rounded-3xl p-10 border border-outline-variant/30 shadow-editorial text-center animate-fadeIn">
            <div className="w-16 h-16 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center text-3xl mx-auto mb-4 border border-secondary/30">
              ✓
            </div>
            <h2 className="font-display-sm text-3xl font-bold text-primary mb-2">Thank you, {username}!</h2>
            <p className="text-sm text-on-surface-variant mb-8 max-w-sm mx-auto">
              Your responses have been recorded and shared directly with the organizer.
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <Link
                to="/profile"
                className="px-6 py-3 rounded-full border border-outline-variant font-label-md text-xs hover:bg-surface-container transition-colors"
              >
                View Player History
              </Link>
              <Link
                to="/"
                className="px-6 py-3 rounded-full bg-primary text-on-primary font-label-md text-xs hover:bg-primary-container transition-all"
              >
                Return to Home
              </Link>
            </div>
          </div>
        )}

      </main>

      <footer className="py-4 text-center text-xs text-outline font-label-md">
        QUIZCORE • Audience Feedback
      </footer>

    </div>
  );
};

export default FeedbackSubmission;
