import { Suspense } from 'react';
import Link from 'next/link';
import { EsqueciSenhaForm } from './esqueci-senha-form';

export default function EsqueciSenhaPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center">
      <div className="mb-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-vinho">
          Valepan
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-text-strong">
          Esqueci a senha
        </h1>
        <p className="mt-2 text-sm text-text-muted">
          Enviaremos um código para o e-mail cadastrado.
        </p>
      </div>
      <div className="rounded-xl border border-border-default bg-surface p-6 shadow-sm">
        <Suspense fallback={<p className="text-center text-sm text-text-muted">Carregando…</p>}>
          <EsqueciSenhaForm />
        </Suspense>
      </div>
      <div className="mt-6 text-center">
        <Link
          href="/login"
          className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-accent hover:text-accent-hover"
        >
          <span className="material-icons text-base" aria-hidden>
            arrow_back
          </span>
          Voltar para login
        </Link>
      </div>
    </div>
  );
}
