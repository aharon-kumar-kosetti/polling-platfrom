import React from 'react';
import { Link } from 'react-router-dom';

const FeedbackResponses = () => {
  const feedbackData = [
    {
      id: 1,
      author: 'Elena Rostova',
      rating: 5,
      nps: 10,
      comment: 'The negative space explanation was super intuitive! Loved the live podium reveal.',
      time: '15m ago'
    },
    {
      id: 2,
      author: 'PixelCrafter',
      rating: 5,
      nps: 9,
      comment: 'Great pace and awesome visuals. The countdown timer kept the adrenaline going.',
      time: '18m ago'
    },
    {
      id: 3,
      author: 'Marcus Vance',
      rating: 4,
      nps: 8,
      comment: 'Very engaging workshop. Would love to have more multi-choice trivia questions next time!',
      time: '24m ago'
    }
  ];

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col antialiased selection:bg-secondary-container selection:text-on-secondary-container">
      
      {/* Top Bar */}
      <header className="h-20 bg-surface-container-lowest border-b border-outline-variant/30 px-6 md:px-12 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="w-10 h-10 rounded-full hover:bg-surface-variant flex items-center justify-center text-on-surface-variant transition-colors">
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <div>
            <div className="text-[11px] font-label-md uppercase tracking-wider text-on-surface-variant">Feedback Aggregator</div>
            <h1 className="font-display-sm text-xl font-bold text-primary">Audience Responses &amp; Sentiment</h1>
          </div>
        </div>

        <Link
          to="/analytics"
          className="px-5 py-2 rounded-full border border-outline-variant/60 text-xs font-label-md hover:bg-surface-container transition-colors"
        >
          View Analytics
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-8 md:py-12 flex flex-col gap-8">
        
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-surface-container-lowest rounded-3xl p-6 border border-outline-variant/30 shadow-sm">
            <span className="text-xs font-label-md text-on-surface-variant uppercase tracking-wider">Average Rating</span>
            <div className="font-display-sm text-4xl font-bold text-primary mt-1">4.8 / 5.0</div>
            <div className="text-xs text-secondary font-bold mt-1">★ ★ ★ ★ ★ (24 reviews)</div>
          </div>

          <div className="bg-surface-container-lowest rounded-3xl p-6 border border-outline-variant/30 shadow-sm">
            <span className="text-xs font-label-md text-on-surface-variant uppercase tracking-wider">Net Promoter Score</span>
            <div className="font-display-sm text-4xl font-bold text-secondary mt-1">+84</div>
            <div className="text-xs text-on-surface-variant mt-1">92% Promoters</div>
          </div>

          <div className="bg-surface-container-lowest rounded-3xl p-6 border border-outline-variant/30 shadow-sm">
            <span className="text-xs font-label-md text-on-surface-variant uppercase tracking-wider">Response Rate</span>
            <div className="font-display-sm text-4xl font-bold text-primary mt-1">86%</div>
            <div className="text-xs text-on-surface-variant mt-1">24 of 28 participants</div>
          </div>
        </div>

        {/* Verbatim Responses List */}
        <div className="bg-surface-container-lowest rounded-3xl p-8 border border-outline-variant/30 shadow-editorial">
          <div className="flex justify-between items-center mb-6 pb-3 border-b border-outline-variant/20">
            <h2 className="font-display-sm text-2xl font-bold text-primary">Attendee Comments</h2>
            <span className="text-xs font-label-md text-on-surface-variant">Real-time submissions</span>
          </div>

          <div className="flex flex-col gap-4">
            {feedbackData.map((f) => (
              <div key={f.id} className="p-5 rounded-2xl bg-surface-container-low border border-outline-variant/30 flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center font-bold text-xs">
                      {f.author.charAt(0)}
                    </div>
                    <div>
                      <span className="font-label-md text-sm font-bold text-primary">{f.author}</span>
                      <span className="text-xs text-on-surface-variant ml-2">• {f.time}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-sm font-bold text-secondary">
                    {'★'.repeat(f.rating)}
                  </div>
                </div>

                <p className="font-body-md text-sm text-primary leading-relaxed">
                  "{f.comment}"
                </p>

                <div className="text-[11px] font-mono text-on-surface-variant">
                  NPS Score: <strong>{f.nps}/10</strong>
                </div>
              </div>
            ))}
          </div>
        </div>

      </main>

      <footer className="py-6 text-center text-xs text-outline font-label-md"><span className="text-black">QuizCore</span> • Audience Feedback Intelligence
      </footer>

    </div>
  );
};

export default FeedbackResponses;
