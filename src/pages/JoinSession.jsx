import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { sessionAPI } from '../api/client';
import QRScannerModal from '../components/QRScannerModal';
import Button from '../components/ui/Button';

const JoinSession = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // State
  const [pin, setPin] = useState(searchParams.get('pin') || '');
  const [username, setUsername] = useState(() => {
    const saved = localStorage.getItem('participant_name') || sessionStorage.getItem('participant_name') || '';
    if (saved === 'PixelCrafter') {
      localStorage.removeItem('participant_name');
      sessionStorage.removeItem('participant_name');
      return '';
    }
    return saved;
  });
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
    <div className="bg-background text-on-background min-h-[calc(100vh-80px)] flex flex-col relative overflow-x-hidden antialiased selection:bg-secondary-container selection:text-on-secondary-container pt-safe pb-safe">

      {/* Ambient background styling */}
      <div className="fixed top-1/4 right-[-10%] w-[45vw] h-[45vw] rounded-full bg-secondary-container/20 blur-3xl pointer-events-none -z-10 animate-subtle-ripple"></div>
      <div className="fixed bottom-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-surface-variant/40 blur-3xl pointer-events-none -z-10"></div>

      <main className="flex-grow flex items-center justify-center p-6 py-12 relative z-10 w-full">
        <div className="w-full max-w-[480px] bg-surface-container-lowest rounded-[28px] border border-outline-variant/30 p-8 md:p-10 flex flex-col items-center gap-6 shadow-editorial relative overflow-hidden transition-all duration-300 animate-scaleIn">

          {/* Step header */}
          <div className="text-center w-full flex flex-col items-center gap-4">
            {/* Step progress indicator */}
            <div className="flex items-center gap-2 select-none" aria-label="Join progress">
              {['pin', 'name'].map((s, i) => {
                const stepIndex = step === 'pin' ? 0 : 1;
                const done = i < stepIndex;
                const current = i === stepIndex;
                return (
                  <React.Fragment key={s}>
                    {i > 0 && <span className="w-10 h-0.5 rounded-full bg-outline-variant/40" />}
                    <span
                      className={`flex items-center justify-center w-7 h-7 rounded-full text-[11px] font-bold font-label-md transition-all duration-300 ${
                        current
                          ? 'bg-primary text-on-primary shadow-sm'
                          : done
                            ? 'bg-secondary-container text-on-secondary-container'
                            : 'bg-surface-container-high text-on-surface-variant'
                      }`}
                    >
                      {done ? <span className="material-symbols-outlined text-[14px]">check</span> : i + 1}
                    </span>
                  </React.Fragment>
                );
              })}
            </div>

            <div key={step} className="animate-fadeIn">
              <h1 className="font-headline-lg text-xl font-bold text-primary">
                {step === 'pin' ? 'Join a Session' : 'Pick Your Nickname'}
              </h1>
              <p className="font-body-md text-sm text-on-surface-variant mt-1">
                {step === 'pin' ? 'Enter the room PIN from the presenter screen.' : 'This is how you\u2019ll appear on the leaderboard.'}
              </p>
            </div>
          </div>

          {error && (
            <div className="w-full p-3 bg-error-container text-on-error-container text-xs rounded-xl font-label-md text-center flex items-center justify-center gap-2 animate-slideDown">
              <span className="material-symbols-outlined text-sm">error</span>
              {error}
            </div>
          )}

          {/* STEP 1: PIN ENTRY */}
          {step === 'pin' && (
            <form key="step-pin" className="w-full flex flex-col gap-5 animate-tabIn" onSubmit={handlePinSubmit}>
              <div>
                <label className="block text-xs uppercase font-label-md text-on-surface-variant font-bold mb-2 text-center">
                  Session PIN
                </label>
                <input
                  type="text"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.toUpperCase())}
                  placeholder="ENTER PIN"
                  maxLength={12}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-5 py-3.5 font-mono text-lg font-bold text-primary uppercase tracking-[0.3em] focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 text-center transition-all placeholder:tracking-[0.15em] placeholder:text-outline placeholder:font-medium"
                  required
                  autoFocus
                />
              </div>

              <Button type="submit" variant="primary" size="lg" fullWidth iconRight="arrow_forward">
                Next
              </Button>

              <div className="w-full flex items-center gap-4 py-1">
                <div className="h-px bg-outline-variant/50 flex-grow"></div>
                <span className="text-xs text-on-surface-variant font-label-md select-none">OR</span>
                <div className="h-px bg-outline-variant/50 flex-grow"></div>
              </div>

              <Button
                type="button"
                variant="outline"
                size="lg"
                fullWidth
                icon="qr_code_scanner"
                onClick={() => setShowQRScanner(true)}
              >
                Scan QR Code
              </Button>
            </form>
          )}

          {/* STEP 2: NICKNAME ENTRY */}
          {step === 'name' && (
            <form key="step-name" className="w-full flex flex-col gap-5 animate-tabIn" onSubmit={handleJoinSession}>
              <div>
                <div className="flex justify-center mb-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary-container/40 border border-secondary/20 text-xs font-label-md font-bold text-on-secondary-container select-none">
                    <span className="material-symbols-outlined text-sm">meeting_room</span>
                    Room {pin.toUpperCase()}
                  </div>
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. Alex, Rahul, Sam"
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-xl px-5 py-3.5 font-body-md text-base font-semibold text-primary focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all placeholder:font-normal placeholder:text-outline"
                  required
                  autoFocus
                />
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  icon="arrow_back"
                  className="w-1/3"
                  onClick={() => setStep('pin')}
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  loading={loading}
                  iconRight={!loading ? 'login' : null}
                  className="w-2/3"
                >
                  {loading ? 'Joining...' : 'Enter Session'}
                </Button>
              </div>
            </form>
          )}

          {/* Quick Shortcuts */}
          <div className="text-center text-xs text-on-surface-variant mt-1 select-none">
            Hosting an event? <Link to="/login" className="text-primary font-bold hover:underline cursor-pointer">Host Login</Link>
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
