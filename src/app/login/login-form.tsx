'use client';

import { type FormEvent, useState } from 'react';
import { signIn } from 'next-auth/react';
import { LoginCallbackUrlResolver } from '@/lib/auth/login-callback-url-resolver';
import { LoginErrorMessageResolver } from '@/lib/auth/login-error-message-resolver';
import { LoginQrCodePanel } from './login-qr-code-panel';
import { WhatsAppLoginForm } from './whatsapp-login-form';

type LoginMethod = 'whatsapp' | 'email' | 'qr';

type LoginFormProps = {
  error?: string;
  email?: string;
  callbackUrl?: string;
};

const errorResolver = new LoginErrorMessageResolver();
const callbackResolver = new LoginCallbackUrlResolver();

export function LoginForm({ error, email, callbackUrl }: LoginFormProps) {
  const resolvedCallback = callbackResolver.resolve(callbackUrl, '/');
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('whatsapp');
  const [emailValue, setEmailValue] = useState(email ?? '');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    errorResolver.resolve(error),
  );

  async function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await signIn('email', {
        email: emailValue.trim(),
        redirect: false,
        callbackUrl: resolvedCallback,
      });

      if (result?.error) {
        setErrorMessage(
          errorResolver.resolve(result.error) ??
            'Erro ao enviar link de acesso. Tente novamente.',
        );
        return;
      }

      if (result?.url) {
        const url = new URL(result.url, window.location.origin);
        const mapped = errorResolver.resolve(url.searchParams.get('error'));
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
    <div className="space-y-5">
      {errorMessage ? (
        <p
          role="alert"
          className="rounded-[var(--radius-control)] border border-danger-border bg-danger-bg px-3 py-2 text-sm text-danger-fg"
        >
          {errorMessage}
        </p>
      ) : null}

      <div className="flex gap-1 rounded-[var(--radius-control)] bg-surface-sunken p-1">
        <button
          type="button"
          onClick={() => {
            setLoginMethod('whatsapp');
            setErrorMessage(null);
          }}
          className={[
            'inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-[calc(var(--radius-control)-2px)] text-sm font-semibold transition',
            loginMethod === 'whatsapp'
              ? 'bg-surface text-text-strong shadow-sm'
              : 'text-text-muted hover:text-text-strong',
          ].join(' ')}
          aria-pressed={loginMethod === 'whatsapp'}
        >
          <span className="material-icons text-base" aria-hidden>
            smartphone
          </span>
          WhatsApp
        </button>
        <button
          type="button"
          onClick={() => {
            setLoginMethod('email');
            setErrorMessage(null);
          }}
          className={[
            'inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-[calc(var(--radius-control)-2px)] text-sm font-semibold transition',
            loginMethod === 'email'
              ? 'bg-surface text-text-strong shadow-sm'
              : 'text-text-muted hover:text-text-strong',
          ].join(' ')}
          aria-pressed={loginMethod === 'email'}
        >
          <span className="material-icons text-base" aria-hidden>
            mail
          </span>
          E-mail
        </button>
        <button
          type="button"
          onClick={() => {
            setLoginMethod('qr');
            setErrorMessage(null);
          }}
          className={[
            'inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-[calc(var(--radius-control)-2px)] text-sm font-semibold transition',
            loginMethod === 'qr'
              ? 'bg-surface text-text-strong shadow-sm'
              : 'text-text-muted hover:text-text-strong',
          ].join(' ')}
          aria-pressed={loginMethod === 'qr'}
        >
          <span className="material-icons text-base" aria-hidden>
            qr_code_2
          </span>
          QR
        </button>
      </div>

      {loginMethod === 'whatsapp' ? (
        <WhatsAppLoginForm callbackUrl={resolvedCallback} />
      ) : null}
      {loginMethod === 'email' ? (
        <form onSubmit={handleEmailSubmit} className="space-y-4">
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
      ) : null}
      {loginMethod === 'qr' ? <LoginQrCodePanel /> : null}
    </div>
  );
}
