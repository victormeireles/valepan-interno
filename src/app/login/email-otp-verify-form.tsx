'use client';

import { type FormEvent, useState } from 'react';
import { signIn } from 'next-auth/react';
import { solicitarCodigoEmail } from '@/app/actions/email-auth-actions';
import { LoginCallbackUrlResolver } from '@/lib/auth/login-callback-url-resolver';

const callbackResolver = new LoginCallbackUrlResolver();

const inputClass =
  'h-11 w-full rounded-[var(--radius-control)] border border-border-default bg-surface px-3 text-sm text-text-strong shadow-[var(--shadow-control)] outline-none transition focus:border-accent focus:ring-2 focus:ring-ring focus:ring-offset-2';

type EmailOtpVerifyFormProps = {
  email?: string;
  callbackUrl?: string;
};

export function EmailOtpVerifyForm({
  email: initialEmail,
  callbackUrl,
}: EmailOtpVerifyFormProps) {
  const resolvedCallback = callbackResolver.resolve(callbackUrl, '/');
  const [email, setEmail] = useState(initialEmail ?? '');
  const [codigo, setCodigo] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const result = await signIn('email-otp', {
        email: email.trim().toLowerCase(),
        codigo,
        redirect: false,
        callbackUrl: resolvedCallback,
      });
      if (result?.error) {
        setErrorMessage('Código incorreto ou expirado. Tente novamente.');
        return;
      }
      window.location.href = resolvedCallback;
    } catch {
      setErrorMessage('Erro inesperado. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResend() {
    setIsResending(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const response = await solicitarCodigoEmail(email);
      if (!response.success) {
        setErrorMessage(response.message);
        return;
      }
      setSuccessMessage('Novo código enviado! Verifique seu e-mail.');
      setCodigo('');
    } catch {
      setErrorMessage('Erro ao reenviar código.');
    } finally {
      setIsResending(false);
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
      {successMessage ? (
        <p
          role="status"
          className="rounded-[var(--radius-control)] border border-success-border bg-success-bg px-3 py-2 text-sm text-success-fg"
        >
          {successMessage}
        </p>
      ) : null}
      <div className="space-y-2">
        <label htmlFor="verify-email" className="block text-sm font-medium text-text-strong">
          E-mail
        </label>
        <input
          id="verify-email"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={inputClass}
          disabled={isLoading}
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="codigo" className="block text-sm font-medium text-text-strong">
          Código de 6 dígitos
        </label>
        <input
          id="codigo"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          required
          maxLength={6}
          autoFocus
          value={codigo}
          onChange={(event) =>
            setCodigo(event.target.value.replace(/\D/g, '').slice(0, 6))
          }
          placeholder="000000"
          className={`${inputClass} text-center font-mono text-lg tracking-[0.4em]`}
          disabled={isLoading}
        />
        <p className="text-xs text-text-muted">
          Digite o código <strong>neste aparelho</strong>. Não clique no link no
          celular se quem precisa entrar é outro dispositivo.
        </p>
      </div>
      <button
        type="submit"
        disabled={isLoading || codigo.length !== 6 || !email.trim()}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-control)] bg-accent px-4 text-sm font-semibold text-white shadow-[var(--shadow-accent)] transition hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? 'Validando…' : 'Entrar'}
      </button>
      <div className="text-center">
        <button
          type="button"
          onClick={() => void handleResend()}
          disabled={isResending || isLoading || !email.trim()}
          className="text-sm font-medium text-accent hover:text-accent-hover disabled:opacity-60"
        >
          {isResending ? 'Reenviando…' : 'Não recebeu? Reenviar código'}
        </button>
      </div>
    </form>
  );
}
