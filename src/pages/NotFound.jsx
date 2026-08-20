import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div className="bg-background text-on-background min-h-screen flex flex-col justify-between items-center p-6 antialiased selection:bg-secondary-container selection:text-on-secondary-container relative overflow-hidden">
      
      {/* Ambient Blob */}
      <div className="fixed top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-surface-variant/40 blur-3xl pointer-events-none -z-10"></div>

      <header className="w-full max-w-4xl flex items-center justify-between py-4">
        <Link to="/" className="font-display-sm text-2xl font-bold text-primary flex items-center gap-2">
          <span className="material-symbols-outlined text-secondary">token</span>
          QUIZCORE
        </Link>
      </header>

      <main className="max-w-md w-full text-center py-12 flex flex-col items-center">
        
        <div className="w-24 h-24 rounded-3xl bg-surface-container-highest flex items-center justify-center text-primary mb-6 shadow-sm">
          <span className="material-symbols-outlined text-5xl text-outline">search_off</span>
        </div>

        <h1 className="font-display-lg text-3xl md:text-4xl font-bold text-primary mb-3">
          Session Not Found or Ended
        </h1>
        <p className="font-body-md text-sm text-on-surface-variant mb-8 leading-relaxed">
          The room PIN you requested does not exist, has expired, or the host has concluded the live interactive presentation.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
          <Link
            to="/join"
            className="px-6 py-3.5 rounded-full bg-secondary text-on-secondary font-label-md text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow"
          >
            <span>Enter Another PIN</span>
            <span className="material-symbols-outlined text-sm">login</span>
          </Link>

          <Link
            to="/"
            className="px-6 py-3.5 rounded-full border border-outline-variant font-label-md text-sm hover:bg-surface-container transition-colors flex items-center justify-center"
          >
            Return to Homepage
          </Link>
        </div>

      </main>

      <footer className="py-4 text-center text-xs text-outline font-label-md">
        QUIZCORE • Platform Navigation
      </footer>

    </div>
  );
};

export default NotFound;
