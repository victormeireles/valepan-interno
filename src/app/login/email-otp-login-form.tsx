'use client';

import { type FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { solicitarCodigoEmail } from '@/app/actions/email-auth-actions';
import { LoginErrorMessageResolver } from '@/lib/auth/login-error-message-resolver';

const errorResolver = new LoginErrorMessageResolver();

const inputClass =
  'h-11 w-full rounded-[var(--radius-control)] border border-border-default bg-surface pl-11 pr-3 text-sm text-text-strong shadow-[var(--shadow-control)] outline-none transition focus:border-accent focus:ring-2 focus:ring-ring focus:ring-offset-2';

type EmailOtpLoginFormProps = {
  error?: string;
  email?: string;
};

export function EmailOtpLoginForm({ error, email: initialEmail }: EmailOtpLoginFormProps) {
  const router = useRouter();
  const [emailValue, setEmailValue] = useState(initialEmail ?? '');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    errorResolver.resolve(error),
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await solicitarCodigoEmail(emailValue);
      if (!response.success) {
        setErrorMessage(response.message);
        return;
      }
      router.push(
        `/login/verify?email=${encodeURIComponent(emailValue.trim().toLowerCase())}`,
      );
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
        <label htmlFor="email" className="block text-sm font-medium text-text-strong">
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
            maxLength={255}
            value={emailValue}
            onChange={(event) => setEmailValue(event.target.value)}
            placeholder="seu.email@valepan.com"
            className={inputClass}
          />
        </div>
        <p className="text-xs text-text-muted">
          Enviaremos um código de 6 dígitos. Digite-o neste aparelho.
        </p>
      </div>
      <button
        type="submit"
        disabled={isLoading || !emailValue.trim()}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-control)] bg-accent px-4 text-sm font-semibold text-white shadow-[var(--shadow-accent)] transition hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="material-icons text-base" aria-hidden>
          send
        </span>
        {isLoading ? 'Enviando…' : 'Receber código por e-mail'}
      </button>
    </form>
  );
}
