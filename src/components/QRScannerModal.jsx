import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

const QRScannerModal = ({ onClose, onScan }) => {
  const [error, setError] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [hasInsecureContext, setHasInsecureContext] = useState(false);
  const scannerRef = useRef(null);
  const fileInputRef = useRef(null);
  const isCleanedUp = useRef(false);

  useEffect(() => {
    isCleanedUp.current = false;
    const elementId = 'qr-camera-view';

    // Check if secure context for camera
    if (!window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      setHasInsecureContext(true);
    }

    const html5QrCode = new Html5Qrcode(elementId);
    scannerRef.current = html5QrCode;

    const startCamera = async () => {
      try {
        const config = {
          fps: 10,
          qrbox: { width: 240, height: 240 },
          aspectRatio: 1.0,
        };

        await html5QrCode.start(
          { facingMode: 'environment' }, // prefers rear camera on mobile
          config,
          (decodedText) => {
            // QR Code successfully scanned!
            if (!isCleanedUp.current) {
              isCleanedUp.current = true;
              html5QrCode.stop().then(() => {
                html5QrCode.clear();
                onScan(decodedText);
              }).catch(() => {
                onScan(decodedText);
              });
            }
          },
          (errorMessage) => {
            // Continuous scanning parse attempts
          }
        );

        if (!isCleanedUp.current) {
          setIsScanning(true);
        }
      } catch (err) {
        console.error('Camera start error:', err);
        if (!isCleanedUp.current) {
          setError(
            err?.message?.includes('Permission') || err?.name === 'NotAllowedError'
              ? 'Camera permission was denied. Please allow camera access in your browser settings.'
              : !window.isSecureContext && window.location.hostname !== 'localhost'
              ? 'Browser requires HTTPS or localhost for live camera access. Use the image upload below or enable HTTPS.'
              : 'Could not access device camera. You can upload a QR image/screenshot below.'
          );
        }
      }
    };

    // Small delay to ensure DOM element is mounted
    const timer = setTimeout(() => {
      startCamera();
    }, 150);

    return () => {
      isCleanedUp.current = true;
      clearTimeout(timer);
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            scannerRef.current.stop().then(() => {
              scannerRef.current.clear();
            }).catch(console.error);
          } else {
            scannerRef.current.clear();
          }
        } catch (e) {
          // ignore cleanup errors
        }
      }
    };
  }, [onScan]);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !scannerRef.current) return;

    setError('');
    try {
      // Stop the active camera scan before scanning a file
      const scanner = scannerRef.current;
      if (scanner.getState && scanner.getState() === 2) { // SCANNING state
        await scanner.stop();
      }
      const decodedText = await scanner.scanFile(file, true);
      onScan(decodedText);
    } catch (err) {
      setError('No valid QR code found in this image. Please try another image.');
    } finally {
      // Reset file input so re-selecting the same file works
      e.target.value = '';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-surface-container-lowest rounded-3xl p-6 max-w-sm w-full relative animate-fadeIn shadow-2xl border border-outline-variant/30 text-center">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-surface-container text-on-surface-variant transition-all z-20"
        >
          <span className="material-symbols-outlined text-xl">close</span>
        </button>

        <h3 className="font-display-sm text-xl font-bold text-primary mb-1">Scan Session QR</h3>
        <p className="text-xs text-on-surface-variant mb-4">Point your camera at the host's screen</p>

        {/* Camera View Container */}
        <div className="w-full relative aspect-square bg-black rounded-2xl overflow-hidden border-2 border-outline-variant/30 flex items-center justify-center shadow-inner">
          <div id="qr-camera-view" className="w-full h-full object-cover"></div>
          
          {/* Overlay scanner target outline */}
          {!error && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-48 h-48 border-2 border-dashed border-secondary/80 rounded-2xl animate-pulse"></div>
            </div>
          )}

          {/* Loading indicator before stream arrives */}
          {!isScanning && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-white gap-2">
              <span className="material-symbols-outlined text-3xl animate-spin">progress_activity</span>
              <span className="text-xs font-label-md">Opening Camera...</span>
            </div>
          )}
        </div>

        {/* Error message / Fallback */}
        {error && (
          <div className="mt-4 p-3 bg-error-container/80 text-on-error-container text-xs rounded-xl font-label-md text-center leading-relaxed">
            {error}
          </div>
        )}

        {/* File Upload Alternative */}
        <div className="mt-4 pt-3 border-t border-outline-variant/20 flex flex-col gap-2">
          <input 
            type="file" 
            ref={fileInputRef} 
            accept="image/*" 
            className="hidden" 
            onChange={handleFileUpload} 
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-2.5 px-4 bg-surface-variant hover:bg-surface-container text-on-surface text-xs font-label-md rounded-full transition-all flex items-center justify-center gap-2 border border-outline-variant/40"
          >
            <span className="material-symbols-outlined text-sm">photo_camera</span>
            <span>Upload QR Image / Screenshot</span>
          </button>
        </div>

        <p className="text-[11px] text-on-surface-variant/80 mt-3">
          Or you can use your phone's default Camera app to scan directly from the host screen.
        </p>

      </div>
    </div>
  );
};

export default QRScannerModal;
