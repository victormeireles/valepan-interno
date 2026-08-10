'use client';

import { type FormEvent, useState } from 'react';
import { signIn } from 'next-auth/react';

type LoginFormProps = {
  error?: string;
  email?: string;
};

function resolveLoginErrorMessage(errorCode: string | null | undefined): string | null {
  if (errorCode === 'UserNotFound') {
    return 'Usuário não encontrado. Solicite acesso ao administrador.';
  }
  if (errorCode === 'UserInactive') {
    return 'Conta desativada. Entre em contato com o administrador.';
  }
  if (errorCode === 'DatabaseError') {
    return 'Erro de conexão. Tente novamente.';
  }
  if (errorCode === 'Configuration') {
    return 'Login temporariamente indisponível. Tente mais tarde.';
  }
  return null;
}

export function LoginForm({ error, email }: LoginFormProps) {
  const [emailValue, setEmailValue] = useState(email ?? '');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    resolveLoginErrorMessage(error),
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await signIn('email', {
        email: emailValue.trim(),
        redirect: false,
        callbackUrl: '/',
      });

      if (result?.error) {
        setErrorMessage(
          resolveLoginErrorMessage(result.error) ??
            'Erro ao enviar link de acesso. Tente novamente.',
        );
        return;
      }

      if (result?.url) {
        const url = new URL(result.url, window.location.origin);
        const errorParam = url.searchParams.get('error');
        const mapped = resolveLoginErrorMessage(errorParam);
        if (mapped) {
          setErrorMessage(mapped);
          return;
        }
      }

      window.location.href = '/login/verify';
    } catch {
      setErrorMessage('Erro inesperado. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label
          htmlFor="email"
          className="block text-sm font-medium text-text-strong"
        >
          E-mail
        </label>
        <div className="relative">
          <span
            className="material-icons pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
            aria-hidden
          >
            mail
          </span>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            value={emailValue}
            onChange={(event) => setEmailValue(event.target.value)}
            placeholder="seu.email@valepan.com"
            className="h-11 w-full rounded-[var(--radius-control)] border border-border-default bg-surface pl-11 pr-3 text-sm text-text-strong shadow-[var(--shadow-control)] outline-none transition focus:border-accent focus:ring-2 focus:ring-ring focus:ring-offset-2"
          />
        </div>
      </div>

      {errorMessage ? (
        <p
          role="alert"
          className="rounded-[var(--radius-control)] border border-danger-border bg-danger-bg px-3 py-2 text-sm text-danger-fg"
        >
          {errorMessage}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isLoading || !emailValue.trim()}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-control)] bg-accent px-4 text-sm font-semibold text-white shadow-[var(--shadow-accent)] transition hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="material-icons text-base" aria-hidden>
          send
        </span>
        {isLoading ? 'Enviando…' : 'Enviar link de acesso'}
      </button>
    </form>
  );
}
