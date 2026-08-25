import React, { useEffect, useRef, useState } from 'react';

const Dropdown = ({ value, onChange, options, icon = null, ariaLabel = 'Select' }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const current = options.find((o) => o.value === value) || options[0];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 bg-surface-container border rounded-lg pl-2.5 pr-2 py-1.5 text-xs font-bold text-primary transition-all duration-200 cursor-pointer select-none hover:border-outline-variant ${
          open ? 'border-primary ring-2 ring-primary/15' : 'border-outline-variant/50'
        }`}
      >
        {icon && <span className="material-symbols-outlined text-[14px] text-on-surface-variant">{icon}</span>}
        <span>{current?.label}</span>
        <span className={`material-symbols-outlined text-[16px] text-on-surface-variant transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
          expand_more
        </span>
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute z-30 mt-1.5 right-0 min-w-full w-max bg-surface-container-lowest border border-outline-variant/40 rounded-xl shadow-xl py-1 animate-scaleIn origin-top-right overflow-hidden"
        >
          {options.map((opt) => {
            const selected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`w-full flex items-center justify-between gap-3 px-3 py-2 text-xs font-label-md whitespace-nowrap transition-colors cursor-pointer ${
                  selected
                    ? 'bg-secondary-container text-on-secondary-container font-bold'
                    : 'text-on-surface hover:bg-surface-container'
                }`}
              >
                <span>{opt.label}</span>
                {selected && <span className="material-symbols-outlined text-[14px]">check</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Dropdown;
