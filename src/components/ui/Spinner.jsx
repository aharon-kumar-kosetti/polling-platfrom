import React from 'react';

export const Spinner = ({ size = 32, label = '' }) => (
  <div className="flex flex-col items-center justify-center gap-3 py-10 animate-fadeIn" role="status" aria-live="polite">
    <div
      className="rounded-full border-[3px] border-primary border-t-transparent animate-spin"
      style={{ width: size, height: size }}
    />
    {label && <span className="text-xs font-label-md uppercase tracking-wider text-on-surface-variant">{label}</span>}
  </div>
);

export const SkeletonCard = ({ lines = 2, className = '' }) => (
  <div className={`bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/30 ${className}`}>
    <div className="flex items-center gap-4">
      <div className="skeleton w-12 h-12 !rounded-xl shrink-0" />
      <div className="flex-1 flex flex-col gap-2">
        <div className="skeleton h-4 w-1/3" />
        <div className="skeleton h-3 w-2/3" />
      </div>
    </div>
    {Array.from({ length: lines }).map((_, i) => (
      <div key={i} className="skeleton h-3 w-full mt-3" style={{ opacity: 1 - i * 0.25 }} />
    ))}
  </div>
);

export default Spinner;
