import type { CSSProperties, ReactNode } from 'react';

export interface ToastProps {
  children: ReactNode;
  tone?: 'success' | 'error' | 'warning' | 'info';
  icon?: string;
  onClose?: () => void;
  style?: CSSProperties;
  className?: string;
}

const toneMap = {
  success: {
    className: 'bg-success-bg border-success-border text-success-fg',
    icon: 'check_circle',
  },
  error: {
    className: 'bg-danger-bg border-danger-border text-danger-fg',
    icon: 'error',
  },
  warning: {
    className: 'bg-warning-bg border-warning-border text-warning-fg',
    icon: 'warning',
  },
  info: {
    className: 'bg-amber-50 border-amber-200 text-amber-800',
    icon: 'info',
  },
} as const;

export function Toast({
  children,
  tone = 'success',
  icon,
  onClose,
  style,
  className = '',
}: ToastProps) {
  const t = toneMap[tone];

  return (
    <div
      role="status"
      style={style}
      className={[
        'flex items-center gap-2.5 rounded-xl border px-4 py-3',
        'text-sm font-medium tracking-[-0.004em]',
        t.className,
        className,
      ].join(' ')}
    >
      <span className="material-icons text-xl" aria-hidden="true">
        {icon ?? t.icon}
      </span>
      <span className="flex-1">{children}</span>
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="inline-flex cursor-pointer border-none bg-transparent p-0 text-inherit"
        >
          <span className="material-icons text-lg" aria-hidden="true">
            close
          </span>
        </button>
      ) : null}
    </div>
  );
}
