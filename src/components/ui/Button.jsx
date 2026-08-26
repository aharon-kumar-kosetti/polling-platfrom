import React from 'react';

/**
 * QuizCore button system — derived from the landing-page reference pair:
 *  primary = lime pill  ·  outline = bordered pill
 * Everything shares one motion/motion-language: hover lift, press scale.
 */

export const BUTTON_BASE =
  'inline-flex items-center justify-center gap-2 rounded-full font-label-md transition-all duration-300 select-none cursor-pointer whitespace-nowrap box-border hover:-translate-y-0.5 active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary/60';

export const BUTTON_VARIANTS = {
  /* The lime CTA — main actions */
  primary:
    'bg-secondary-container text-on-secondary-container border-2 border-secondary-container hover:bg-secondary hover:text-on-secondary shadow-sm hover:shadow-md',
  /* Bordered — secondary actions */
  outline:
    'bg-transparent text-primary border-2 border-outline hover:border-primary hover:bg-surface-variant',
  /* Solid black — strong neutral actions */
  dark:
    'bg-primary text-on-primary border-2 border-primary hover:bg-primary-container shadow-sm hover:shadow-md',
  /* Destructive */
  danger:
    'bg-error text-on-error border-2 border-error hover:brightness-110 shadow-sm hover:shadow-md',
  'outline-danger':
    'bg-transparent text-error border-2 border-error/50 hover:bg-error-container hover:border-error',
  /* Quiet tertiary */
  ghost:
    'bg-transparent text-primary border-2 border-transparent hover:bg-surface-container',
  /* Dark-surface adaptations (leaderboard / presenter) */
  'primary-on-dark':
    'bg-secondary-container text-on-secondary-container border-2 border-secondary-container hover:bg-secondary hover:text-on-secondary shadow-sm hover:shadow-md',
  'outline-on-dark':
    'bg-white/10 text-white border-2 border-white/25 hover:bg-white/20 hover:border-white/40',
};

export const BUTTON_SIZES = {
  sm: 'h-9 px-4 text-xs font-bold leading-none',
  md: 'h-11 px-5 text-sm font-bold leading-none',
  lg: 'h-14 px-8 text-base font-bold leading-none',
};

export const buttonClasses = (variant = 'primary', size = 'md', className = '') =>
  [BUTTON_BASE, BUTTON_VARIANTS[variant] || BUTTON_VARIANTS.primary, BUTTON_SIZES[size] || BUTTON_SIZES.md, className]
    .filter(Boolean)
    .join(' ');

const Button = ({
  variant = 'primary',
  size = 'md',
  icon = null,
  iconRight = null,
  loading = false,
  fullWidth = false,
  className = '',
  children,
  disabled,
  ...rest
}) => {
  const iconSizeClass = size === 'sm' ? 'text-[16px]' : size === 'lg' ? 'text-[20px]' : 'text-[18px]';

  return (
    <button
      disabled={disabled || loading}
      className={buttonClasses(variant, size, `${fullWidth ? 'w-full ' : ''}${className}`)}
      {...rest}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" aria-hidden="true" />
      ) : (
        icon && <span className={`material-symbols-outlined ${iconSizeClass} shrink-0 leading-none`} aria-hidden="true">{icon}</span>
      )}
      {children}
      {iconRight && !loading && (
        <span className={`material-symbols-outlined ${iconSizeClass} shrink-0 leading-none`} aria-hidden="true">{iconRight}</span>
      )}
    </button>
  );
};

export default Button;
