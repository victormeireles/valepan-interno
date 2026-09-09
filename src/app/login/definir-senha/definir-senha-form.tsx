'use client';

import { type FormEvent, useState } from 'react';
import { definirNovaSenha } from '@/app/actions/password-auth-actions';
import { PASSWORD_MIN_LENGTH } from '@/lib/auth/email-otp/login-email-otp-constants';

const inputClass =
  'h-11 w-full rounded-[var(--radius-control)] border border-border-default bg-surface px-3 text-sm text-text-strong shadow-[var(--shadow-control)] outline-none transition focus:border-accent focus:ring-2 focus:ring-ring focus:ring-offset-2';

export function DefinirSenhaForm() {
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmaSenha, setConfirmaSenha] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    if (novaSenha !== confirmaSenha) {
      setErrorMessage('As senhas não coincidem.');
      return;
    }
    setIsLoading(true);
    try {
      const response = await definirNovaSenha(novaSenha);
      if (!response.success) {
        setErrorMessage(response.message);
        return;
      }
      window.location.href = '/';
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
        disabled={isLoading || novaSenha.length < PASSWORD_MIN_LENGTH}
        className="inline-flex h-11 w-full items-center justify-center rounded-[var(--radius-control)] bg-accent px-4 text-sm font-semibold text-white shadow-[var(--shadow-accent)] transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? 'Salvando…' : 'Salvar nova senha'}
      </button>
    </form>
  );
}
