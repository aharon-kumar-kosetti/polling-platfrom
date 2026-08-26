import React, { useEffect, useRef, useState } from 'react';

/**
 * Replaces the native scrollbar: a slim progress bar fixed to the top of the
 * viewport that fills as the page scrolls. Hidden when the page isn't
 * scrollable, so fixed-viewport screens (landing, player arena) show nothing.
 */
const ScrollProgress = () => {
  const [progress, setProgress] = useState(0);
  const ticking = useRef(false);

  useEffect(() => {
    const update = () => {
      ticking.current = false;
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - window.innerHeight;
      setProgress(scrollable > 40 ? Math.min(100, Math.max(0, (window.scrollY / scrollable) * 100)) : 0);
    };
    const onScroll = () => {
      if (!ticking.current) {
        ticking.current = true;
        requestAnimationFrame(update);
      }
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 h-[3px] z-[300] pointer-events-none" aria-hidden="true">
      <div
        className="h-full bg-secondary rounded-r-full transition-[width] duration-150 ease-out shadow-[0_0_8px_rgba(87,101,0,0.4)]"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
};

export default ScrollProgress;
