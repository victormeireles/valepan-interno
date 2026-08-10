import Link from 'next/link';

export default function LoginVerifyPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center">
      <div className="rounded-xl border border-border-default bg-surface p-6 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-800">
          <span className="material-icons" aria-hidden>
            mark_email_read
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-text-strong">
          Verifique seu e-mail
        </h1>
        <p className="mt-3 text-sm text-text-muted">
          Enviamos um link de acesso. Abra o e-mail e entre no sistema.
        </p>
        <div className="mt-4 rounded-[var(--radius-control)] border border-warning-border bg-warning-bg px-3 py-2 text-sm text-warning-fg">
          O link expira em 1 hora.
        </div>
        <p className="mt-4 text-xs text-text-muted">
          Não recebeu? Confira spam ou solicite um novo link.
        </p>
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
