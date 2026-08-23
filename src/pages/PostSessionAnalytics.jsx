import React from 'react';
import { useSearchParams, Link } from 'react-router-dom';

const PostSessionAnalytics = () => {
  const [searchParams] = useSearchParams();
  const sessionTitle = searchParams.get('title') || 'Interactive Quiz Masterclass';
  const pin = searchParams.get('pin') || 'TECH-88';

  const questionsData = [
    {
      id: 1,
      text: 'What is the primary purpose of negative space in UI design?',
      correctRate: 86,
      avgTime: '8.4s',
      difficulty: 'Easy'
    },
    {
      id: 2,
      text: 'Which color palette approach creates the most impactful editorial visual hierarchy?',
      correctRate: 64,
      avgTime: '14.2s',
      difficulty: 'Medium'
    },
    {
      id: 3,
      text: 'How should interactive feedback states respond to touch events?',
      correctRate: 42,
      avgTime: '18.1s',
      difficulty: 'Hard'
    }
  ];

  const handleExportCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Question,Accuracy,AvgTime,Difficulty\n"
      + questionsData.map(q => `"${q.text}",${q.correctRate}%,${q.avgTime},${q.difficulty}`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `quizcore_analytics_${pin}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col antialiased selection:bg-secondary-container selection:text-on-secondary-container">
      
      {/* Top Bar */}
      <header className="h-20 bg-surface-container-lowest border-b border-outline-variant/30 px-6 md:px-12 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="w-10 h-10 rounded-full hover:bg-surface-variant flex items-center justify-center text-on-surface-variant transition-colors">
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <div>
            <div className="text-[11px] font-label-md uppercase tracking-wider text-on-surface-variant">Post-Session Analytics</div>
            <h1 className="font-display-sm text-xl font-bold text-primary truncate">{sessionTitle}</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={handleExportCSV}
            className="px-4 py-2 rounded-full border border-outline-variant/50 text-xs font-label-md hover:bg-surface-variant flex items-center gap-1.5 transition-colors"
          >
            <span className="material-symbols-outlined text-sm">download</span>
            Export CSV
          </button>
          <Link
            to="/dashboard"
            className="px-5 py-2 rounded-full bg-primary text-on-primary text-xs font-label-md hover:bg-primary-container transition-all"
          >
            Dashboard
          </Link>
        </div>
      </header>

      {/* Main Analytics Content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8 md:py-12 flex flex-col gap-10">
        
        {/* KPI Counter Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-surface-container-lowest rounded-3xl p-6 border border-outline-variant/30 shadow-sm">
            <span className="text-xs font-label-md text-on-surface-variant uppercase tracking-wider">Total Participants</span>
            <div className="font-display-sm text-4xl font-bold text-primary mt-2">28</div>
            <div className="text-xs text-secondary font-bold mt-1">100% Attendance Rate</div>
          </div>

          <div className="bg-surface-container-lowest rounded-3xl p-6 border border-outline-variant/30 shadow-sm">
            <span className="text-xs font-label-md text-on-surface-variant uppercase tracking-wider">Average Accuracy</span>
            <div className="font-display-sm text-4xl font-bold text-primary mt-2">78%</div>
            <div className="text-xs text-on-surface-variant mt-1">Above platform average</div>
          </div>

          <div className="bg-surface-container-lowest rounded-3xl p-6 border border-outline-variant/30 shadow-sm">
            <span className="text-xs font-label-md text-on-surface-variant uppercase tracking-wider">Avg Answer Time</span>
            <div className="font-display-sm text-4xl font-bold text-primary mt-2">11.8s</div>
            <div className="text-xs text-on-surface-variant mt-1">Fast response velocity</div>
          </div>

          <div className="bg-surface-container-lowest rounded-3xl p-6 border border-outline-variant/30 shadow-sm">
            <span className="text-xs font-label-md text-on-surface-variant uppercase tracking-wider">Session NPS</span>
            <div className="font-display-sm text-4xl font-bold text-secondary mt-2">+84</div>
            <div className="text-xs text-on-surface-variant mt-1">High audience rating</div>
          </div>
        </div>

        {/* Question Performance Breakdown */}
        <div className="bg-surface-container-lowest rounded-3xl p-8 border border-outline-variant/30 shadow-editorial">
          <div className="flex justify-between items-center mb-6 pb-3 border-b border-outline-variant/20">
            <h2 className="font-display-sm text-2xl font-bold text-primary">Question Performance</h2>
            <span className="text-xs font-label-md text-on-surface-variant">Sorted by presentation order</span>
          </div>

          <div className="flex flex-col gap-6">
            {questionsData.map((q) => (
              <div key={q.id} className="p-5 rounded-2xl bg-surface-container-low border border-outline-variant/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-8 h-8 rounded-xl bg-surface-container-highest flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    Q{q.id}
                  </div>
                  <div>
                    <h3 className="font-label-md text-base font-bold text-primary mb-1">{q.text}</h3>
                    <div className="flex items-center gap-3 text-xs text-on-surface-variant">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        q.difficulty === 'Easy' ? 'bg-secondary-container text-on-secondary-container' : q.difficulty === 'Medium' ? 'bg-surface-container-highest text-primary' : 'bg-error-container text-on-error-container'
                      }`}>
                        {q.difficulty}
                      </span>
                      <span>Avg time: {q.avgTime}</span>
                    </div>
                  </div>
                </div>

                {/* Accuracy bar */}
                <div className="w-full md:w-56 flex flex-col gap-1">
                  <div className="flex justify-between text-xs font-label-md">
                    <span className="text-on-surface-variant font-bold">Accuracy</span>
                    <span className="font-mono font-bold text-primary">{q.correctRate}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-surface-container-highest rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${q.correctRate >= 70 ? 'bg-secondary' : 'bg-primary'}`}
                      style={{ width: `${q.correctRate}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Feedback Quick Link */}
        <div className="bg-secondary-container/20 rounded-3xl p-8 border border-secondary/30 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="font-display-sm text-2xl font-bold text-primary mb-1">Audience Feedback Available</h3>
            <p className="font-body-md text-sm text-on-surface-variant">Review verbatim ratings, feedback submissions, and comments from your audience.</p>
          </div>
          <Link
            to="/feedback/responses"
            className="px-6 py-3 rounded-full bg-primary text-on-primary font-label-md text-sm hover:bg-primary-container transition-all shrink-0"
          >
            View Feedback Responses &rarr;
          </Link>
        </div>

      </main>

      <footer className="py-6 text-center text-xs text-outline font-label-md"><span className="text-black">QuizCore</span> Analytics Platform
      </footer>

    </div>
  );
};

export default PostSessionAnalytics;
