'use client';

type Props = {
  icon: string;
  label: string;
  onClick: () => void;
};

export function ReclamacaoFotoLightboxBotao({ icon, label, onClick }: Props) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={[
        'inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full',
        'bg-[rgb(28_25_23/0.72)] text-stone-50 ring-1 ring-white/15',
        'shadow-[0_6px_18px_-8px_rgb(28_25_23/0.55)]',
        'transition-[background,color,transform,box-shadow] duration-[130ms] ease-out',
        'hover:bg-[rgb(28_25_23/0.9)] hover:text-white',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-900',
        'active:translate-y-px',
      ].join(' ')}
    >
      <span className="material-icons text-[22px]" aria-hidden="true">
        {icon}
      </span>
    </button>
  );
}
