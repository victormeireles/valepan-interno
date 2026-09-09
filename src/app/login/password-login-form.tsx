'use client';

import Link from 'next/link';
import { type FormEvent, useState } from 'react';
import { signIn } from 'next-auth/react';
import { LoginCallbackUrlResolver } from '@/lib/auth/login-callback-url-resolver';

const callbackResolver = new LoginCallbackUrlResolver();

const inputClass =
  'h-11 w-full rounded-[var(--radius-control)] border border-border-default bg-surface pl-11 pr-3 text-sm text-text-strong shadow-[var(--shadow-control)] outline-none transition focus:border-accent focus:ring-2 focus:ring-ring focus:ring-offset-2';

type PasswordLoginFormProps = {
  callbackUrl?: string;
};

export function PasswordLoginForm({ callbackUrl }: PasswordLoginFormProps) {
  const resolvedCallback = callbackResolver.resolve(callbackUrl, '/');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const result = await signIn('password', {
        identifier,
        password,
        redirect: false,
        callbackUrl: resolvedCallback,
      });
      if (result?.error) {
        setErrorMessage('E-mail/telefone ou senha incorretos.');
        return;
      }
      window.location.href = resolvedCallback;
    } catch {
      setErrorMessage('Erro inesperado. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errorMessage ? (
        <p
          role="alert"
          className="rounded-[var(--radius-control)] border border-danger-border bg-danger-bg px-3 py-2 text-sm text-danger-fg"
        >
          {errorMessage}
        </p>
      ) : null}
      <div className="space-y-2">
        <label htmlFor="identifier" className="block text-sm font-medium text-text-strong">
          E-mail ou telefone
        </label>
        <div className="relative">
          <span
            className="material-icons pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
            aria-hidden
          >
            person
          </span>
          <input
            id="identifier"
            type="text"
            required
            autoComplete="username"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            placeholder="email@empresa.com ou (11) 99999-9999"
            className={inputClass}
            disabled={isLoading}
          />
        </div>
      </div>
      <div className="space-y-2">
        <label htmlFor="password" className="block text-sm font-medium text-text-strong">
          Senha
        </label>
        <div className="relative">
          <span
            className="material-icons pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
            aria-hidden
          >
            lock
          </span>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Digite sua senha"
            className={inputClass}
            disabled={isLoading}
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={isLoading || !identifier.trim() || !password}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-control)] bg-accent px-4 text-sm font-semibold text-white shadow-[var(--shadow-accent)] transition hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? 'Entrando…' : 'Entrar com senha'}
      </button>
      <div className="text-center">
        <Link
          href="/login/esqueci-senha"
          className="text-sm font-medium text-accent hover:text-accent-hover"
        >
          Esqueci a senha
        </Link>
      </div>
    </form>
  );
}
