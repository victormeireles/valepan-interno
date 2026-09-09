'use client';

import { type FormEvent, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  redefinirSenhaComCodigo,
  solicitarResetSenha,
} from '@/app/actions/password-auth-actions';
import { PASSWORD_MIN_LENGTH } from '@/lib/auth/email-otp/login-email-otp-constants';

const inputClass =
  'h-11 w-full rounded-[var(--radius-control)] border border-border-default bg-surface px-3 text-sm text-text-strong shadow-[var(--shadow-control)] outline-none transition focus:border-accent focus:ring-2 focus:ring-ring focus:ring-offset-2';

type Step = 'email' | 'reset';

export function EsqueciSenhaForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialEmail = searchParams.get('email') ?? '';
  const [step, setStep] = useState<Step>(initialEmail ? 'reset' : 'email');
  const [email, setEmail] = useState(initialEmail);
  const [codigo, setCodigo] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmaSenha, setConfirmaSenha] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleSolicitar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await solicitarResetSenha(email);
      if (!response.success) {
        setErrorMessage(response.message);
        return;
      }
      setSuccessMessage(response.message);
      setStep('reset');
    } catch {
      setErrorMessage('Erro inesperado. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRedefinir(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    if (novaSenha !== confirmaSenha) {
      setErrorMessage('As senhas não coincidem.');
      setIsLoading(false);
      return;
    }
    try {
      const response = await redefinirSenhaComCodigo({
        email,
        codigo,
        novaSenha,
      });
      if (!response.success) {
        setErrorMessage(response.message);
        return;
      }
      setSuccessMessage(response.message);
      setTimeout(() => {
        router.push('/login');
      }, 1500);
    } catch {
      setErrorMessage('Erro inesperado. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-4">
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

      {step === 'email' ? (
        <form onSubmit={handleSolicitar} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium text-text-strong">
              E-mail cadastrado
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={inputClass}
              disabled={isLoading}
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !email.trim()}
            className="inline-flex h-11 w-full items-center justify-center rounded-[var(--radius-control)] bg-accent px-4 text-sm font-semibold text-white shadow-[var(--shadow-accent)] transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? 'Enviando…' : 'Enviar código'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleRedefinir} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email-reset" className="block text-sm font-medium text-text-strong">
              E-mail
            </label>
            <input
              id="email-reset"
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
              required
              maxLength={6}
              value={codigo}
              onChange={(event) =>
                setCodigo(event.target.value.replace(/\D/g, '').slice(0, 6))
              }
              className={`${inputClass} text-center font-mono text-lg tracking-[0.4em]`}
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="nova-senha" className="block text-sm font-medium text-text-strong">
              Nova senha
            </label>
            <input
              id="nova-senha"
              type="password"
              required
              minLength={PASSWORD_MIN_LENGTH}
              autoComplete="new-password"
              value={novaSenha}
              onChange={(event) => setNovaSenha(event.target.value)}
              className={inputClass}
              disabled={isLoading}
            />
            <p className="text-xs text-text-muted">
              Mínimo de {PASSWORD_MIN_LENGTH} caracteres.
            </p>
          </div>
          <div className="space-y-2">
            <label htmlFor="confirma-senha" className="block text-sm font-medium text-text-strong">
              Confirmar senha
            </label>
            <input
              id="confirma-senha"
              type="password"
              required
              minLength={PASSWORD_MIN_LENGTH}
              autoComplete="new-password"
              value={confirmaSenha}
              onChange={(event) => setConfirmaSenha(event.target.value)}
              className={inputClass}
              disabled={isLoading}
            />
          </div>
          <button
            type="submit"
            disabled={
              isLoading ||
              codigo.length !== 6 ||
              novaSenha.length < PASSWORD_MIN_LENGTH
            }
            className="inline-flex h-11 w-full items-center justify-center rounded-[var(--radius-control)] bg-accent px-4 text-sm font-semibold text-white shadow-[var(--shadow-accent)] transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? 'Salvando…' : 'Redefinir senha'}
          </button>
          <button
            type="button"
            className="w-full text-sm font-medium text-accent hover:text-accent-hover"
            disabled={isLoading}
            onClick={() => {
              setStep('email');
              setCodigo('');
              setNovaSenha('');
              setConfirmaSenha('');
              setSuccessMessage(null);
            }}
          >
            Solicitar novo código
          </button>
        </form>
      )}
    </div>
  );
}
