'use client';

import { signOut } from 'next-auth/react';

export default function SemAcessoPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center">
      <div className="rounded-xl border border-border-default bg-surface p-6 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-danger-bg text-danger-fg">
          <span className="material-icons" aria-hidden>
            lock
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-text-strong">
          Sem acesso
        </h1>
        <p className="mt-3 text-sm text-text-muted">
          Sem permissão para o Sistema de Produção.
        </p>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-control)] border border-border-default bg-surface px-4 text-sm font-semibold text-text-strong transition hover:bg-surface-sunken focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <span className="material-icons text-base" aria-hidden>
            logout
          </span>
          Sair
        </button>
      </div>
    </div>
  );
}
