'use client';

import { signOut } from 'next-auth/react';

export const LOGOUT_REDIRECT_URL = '/login';

export type LogoutNavigationActionVariant = 'desktop' | 'mobile';

type LogoutNavigationActionProps = {
  variant: LogoutNavigationActionVariant;
};

function logoutButtonClassName(variant: LogoutNavigationActionVariant): string {
  if (variant === 'desktop') {
    return [
      'hidden min-h-11 items-center gap-1 rounded-[9px] border border-transparent',
      'px-2 py-1.5 text-[0.8125rem] font-medium leading-none tracking-[-0.004em]',
      'text-white/65 transition-colors duration-[130ms] hover:bg-white/8 hover:text-white/90',
      'lg:inline-flex',
    ].join(' ');
  }

  return [
    'flex min-h-11 w-full items-center gap-3 rounded-[9px] px-3 py-2.5 text-left',
    'text-sm font-medium tracking-[-0.004em] text-stone-700',
    'transition-colors duration-[130ms] hover:bg-stone-50',
  ].join(' ');
}

export default function LogoutNavigationAction({
  variant,
}: LogoutNavigationActionProps) {
  const handleLogout = () => {
    void signOut({ redirectTo: LOGOUT_REDIRECT_URL });
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      className={logoutButtonClassName(variant)}
      aria-label="Sair do sistema"
    >
      <span
        className={[
          'material-icons shrink-0',
          variant === 'desktop' ? 'text-base' : 'text-xl text-stone-500',
        ].join(' ')}
        aria-hidden="true"
      >
        logout
      </span>
      <span>Sair</span>
    </button>
  );
}
