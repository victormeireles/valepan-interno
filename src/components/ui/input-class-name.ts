export function controlInputClassName({
  numeric = false,
  hasError = false,
  hasIcon = false,
  fullWidth = true,
  size = 'default',
  className = '',
}: {
  numeric?: boolean;
  hasError?: boolean;
  hasIcon?: boolean;
  fullWidth?: boolean;
  size?: 'default' | 'compact';
  className?: string;
}) {
  const heightClass =
    size === 'compact'
      ? 'h-[2.375rem] min-h-0 py-0 text-sm'
      : 'min-h-11 text-base';

  return [
    fullWidth ? 'w-full' : 'w-auto shrink-0',
    'px-3',
    heightClass,
    hasIcon ? 'pl-9' : '',
    'rounded-[9px] border bg-surface font-medium tracking-[-0.006em] text-text-strong',
    'shadow-control transition-[border-color,box-shadow] duration-[130ms] ease-out',
    'placeholder:text-text-muted',
    'disabled:cursor-not-allowed disabled:opacity-50',
    hasError
      ? 'border-danger focus:border-danger focus:ring-2 focus:ring-danger/25'
      : 'border-border-default focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/35',
    numeric ? 'font-mono tabular-nums' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');
}
