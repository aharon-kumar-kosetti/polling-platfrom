import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { sessionAPI } from '../api/client';
import QRScannerModal from '../components/QRScannerModal';

const JoinSession = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // State
  const [pin, setPin] = useState(searchParams.get('pin') || '');
  const [username, setUsername] = useState(localStorage.getItem('participant_name') || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // UI Steps
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [step, setStep] = useState(searchParams.get('pin') ? 'name' : 'pin'); // 'pin' or 'name'

  useEffect(() => {
    const urlPin = searchParams.get('pin');
    if (urlPin) {
      setPin(urlPin);
      setStep('name'); // Auto advance to name step if PIN provided in URL
    }
  }, [searchParams]);

  const handlePinSubmit = (e) => {
    e.preventDefault();
    if (!pin.trim()) return;
    setStep('name');
  };

  const handleQRScan = (decodedText) => {
    setShowQRScanner(false);
    
    // Parse the scanned text. Could be a URL or raw PIN.
    let extractedPin = decodedText;
    try {
      const url = new URL(decodedText);
      const urlPin = url.searchParams.get('pin');
      if (urlPin) extractedPin = urlPin;
    } catch (e) {
      // Not a valid URL, treat as raw text
    }

    setPin(extractedPin.toUpperCase());
    setStep('name');
  };

  const handleJoinSession = async (e) => {
    e.preventDefault();
    if (!pin.trim() || !username.trim()) {
      setError('Please provide a nickname.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      // Generate unique participantId per tab/device
      const participantId = `p_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      sessionStorage.setItem('participant_id', participantId);
      sessionStorage.setItem('participant_name', username);
      sessionStorage.setItem('participant_pin', pin.toUpperCase());
      sessionStorage.removeItem('participant_score'); // Reset score for new game
      
      localStorage.setItem('participant_name', username);
      localStorage.setItem('participant_pin', pin.toUpperCase());

      const res = await sessionAPI.joinSession(pin.toUpperCase(), username);
      if (res.sessionToken) {
        sessionStorage.setItem('participant_token', res.sessionToken);
        sessionStorage.setItem('participant_sessionId', res.session.id);
        if (res.participant?.id) {
          sessionStorage.setItem('participant_id', res.participant.id);
        }
      }
      const pId = sessionStorage.getItem('participant_id') || participantId;
      const sessId = res.session?.id ? `&sessionId=${encodeURIComponent(res.session.id)}` : '';
      navigate(`/waiting-room?pin=${pin.toUpperCase()}&username=${encodeURIComponent(username)}&participantId=${encodeURIComponent(pId)}${sessId}`);
    } catch (err) {
      console.warn('API Join notice:', err.message);
      const pId = sessionStorage.getItem('participant_id') || `p_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      navigate(`/waiting-room?pin=${pin.toUpperCase()}&username=${encodeURIComponent(username)}&participantId=${encodeURIComponent(pId)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-background text-on-background min-h-[calc(100vh-80px)] flex flex-col relative overflow-x-hidden antialiased selection:bg-secondary-container selection:text-on-secondary-container">
      
      {/* Ambient background styling */}
      <div className="fixed top-1/4 right-[-10%] w-[45vw] h-[45vw] rounded-full bg-secondary-container/20 blur-3xl pointer-events-none -z-10"></div>
      <div className="fixed bottom-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-surface-variant/40 blur-3xl pointer-events-none -z-10"></div>

      <main className="flex-grow flex items-center justify-center p-6 py-12 relative z-10 w-full">
        <div className="w-full max-w-[480px] bg-surface-container-lowest rounded-[28px] border border-outline-variant/30 p-8 md:p-10 flex flex-col items-center gap-8 shadow-editorial relative overflow-hidden transition-all duration-300">
          
          <div className="text-center w-full flex flex-col items-center gap-2">
            <Link to="/" className="font-display-sm text-xl font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-[24px] text-secondary">token</span>
              <span className="text-black">QuizCore</span>
            </Link>
            <p className="font-body-md text-sm text-on-surface-variant">
              {step === 'pin' ? 'Enter room PIN to join the session.' : `Joining Room ${pin.toUpperCase()}`}
            </p>
          </div>

          {error && (
            <div className="w-full p-3 bg-error-container text-on-error-container text-xs rounded-xl font-label-md text-center animate-fadeIn">
              {error}
            </div>
          )}

          {/* STEP 1: PIN ENTRY */}
          {step === 'pin' && (
            <form className="w-full flex flex-col gap-5 animate-fadeIn" onSubmit={handlePinSubmit}>
              <div>
                <label className="block text-xs uppercase font-label-md text-on-surface-variant font-bold mb-2">
                  Session PIN
                </label>
                <input
                  type="text"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.toUpperCase())}
                  placeholder="Enter your PIN"
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-2xl px-5 py-3.5 font-mono text-lg font-bold text-primary uppercase tracking-wider focus:border-primary focus:outline-none text-center"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-secondary text-on-secondary font-label-md text-sm py-4 rounded-full hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow active:scale-[0.98] mt-2"
              >
                <span>Next</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
              
              <div className="w-full flex items-center gap-4 py-2">
                <div className="h-px bg-outline-variant flex-grow"></div>
                <span className="text-xs text-on-surface-variant font-label-md">OR</span>
                <div className="h-px bg-outline-variant flex-grow"></div>
              </div>
              
              <button
                type="button"
                className="w-full bg-surface-variant text-on-surface-variant border border-outline-variant font-label-md text-sm py-4 rounded-full hover:bg-surface-container transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow active:scale-[0.98]"
                onClick={() => setShowQRScanner(true)}
              >
                <span className="material-symbols-outlined text-sm">qr_code_scanner</span>
                <span>Scan QR Code</span>
              </button>
            </form>
          )}

          {/* STEP 2: NICKNAME ENTRY */}
          {step === 'name' && (
            <form className="w-full flex flex-col gap-5 animate-fadeIn" onSubmit={handleJoinSession}>
              <div>
                <label className="block text-xs uppercase font-label-md text-on-surface-variant font-bold mb-2">
                  Your Nickname
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. PixelCrafter"
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-2xl px-5 py-3.5 font-body-md text-sm text-primary focus:border-primary focus:outline-none"
                  required
                  autoFocus
                />
              </div>

              <div className="flex gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setStep('pin')}
                  className="w-1/3 bg-surface-variant text-on-surface-variant font-label-md text-sm py-4 rounded-full hover:bg-surface-container transition-all"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-2/3 bg-primary text-on-primary font-label-md text-sm py-4 rounded-full hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow active:scale-[0.98] disabled:opacity-50"
                >
                  <span>{loading ? 'Joining...' : 'Enter Session'}</span>
                  <span className="material-symbols-outlined text-sm">login</span>
                </button>
              </div>
            </form>
          )}

          {/* Quick Shortcuts */}
          <div className="text-center text-xs text-on-surface-variant mt-2">
            Hosting an event? <Link to="/login" className="text-primary font-bold hover:underline">Host Login</Link>
          </div>

        </div>
      </main>

      {/* QR Scanner Modal */}
      {showQRScanner && (
        <QRScannerModal 
          onClose={() => setShowQRScanner(false)}
          onScan={handleQRScan}
        />
      )}

    </div>
  );
};

export default JoinSession;
