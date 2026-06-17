'use client';

type OverflowMenuItemProps = {
  label: string;
  onClick: () => void;
  icon?: string;
  disabled?: boolean;
  tone?: 'default' | 'danger';
  variant?: 'stone' | 'gray';
};

export default function OverflowMenuItem({
  label,
  onClick,
  icon,
  disabled = false,
  tone = 'default',
  variant = 'stone',
}: OverflowMenuItemProps) {
  const toneClass =
    tone === 'danger'
      ? 'text-red-700 hover:bg-red-50 focus-visible:bg-red-50'
      : variant === 'gray'
        ? 'font-medium text-gray-700 hover:bg-gray-50 focus-visible:bg-gray-50'
        : 'text-stone-700 hover:bg-stone-50 focus-visible:bg-stone-50';

  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className={`flex w-full min-h-11 items-center gap-2 px-3 text-left text-sm disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none ${toneClass}`}
    >
      {icon ? (
        <span className="material-icons text-base text-current/70" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      {label}
    </button>
  );
}
