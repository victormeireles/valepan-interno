'use client';

import { type FormEvent, useEffect, useState } from 'react';
import { signIn } from 'next-auth/react';
import { solicitarCodigoWhatsApp } from '@/app/actions/whatsapp-auth-actions';

type Step = 'phone' | 'code';

function formatPhoneInput(value: string): string {
  const numbers = value.replace(/\D/g, '').slice(0, 11);
  if (numbers.length <= 2) return numbers;
  if (numbers.length <= 7) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  }
  return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
}

export function WhatsAppLoginForm() {
  const [step, setStep] = useState<Step>('phone');
  const [telefone, setTelefone] = useState('');
  const [codigo, setCodigo] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [expiresIn, setExpiresIn] = useState(10);

  useEffect(() => {
    if (step !== 'code' || expiresIn <= 0) return;
    const timer = setInterval(() => {
      setExpiresIn((prev) => Math.max(0, prev - 1));
    }, 60_000);
    return () => clearInterval(timer);
  }, [step, expiresIn]);

  async function handleSolicitarCodigo(event: FormEvent) {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await solicitarCodigoWhatsApp(telefone);
      if (response.success) {
        setSuccessMessage(response.message);
        setExpiresIn(response.expiresIn ?? 10);
        setStep('code');
      } else {
        setErrorMessage(response.message);
      }
    } catch {
      setErrorMessage('Erro inesperado. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleValidarCodigo(event: FormEvent) {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await signIn('whatsapp', {
        telefone,
        codigo,
        redirect: false,
        callbackUrl: '/',
      });

      if (result?.error) {
        setErrorMessage('Código incorreto ou expirado. Tente novamente.');
        return;
      }

      if (result?.url) {
        const url = new URL(result.url, window.location.origin);
        if (url.searchParams.get('error') === 'SemPermissao') {
          setErrorMessage(
            'Sem permissão para o Sistema de Produção. Solicite acesso ao administrador.',
          );
          return;
        }
      }

      if (result?.ok) {
        window.location.href = '/';
      }
    } catch {
      setErrorMessage('Erro inesperado. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleReenviarCodigo() {
    setIsLoading(true);
    setErrorMessage(null);
    setCodigo('');

    try {
      const response = await solicitarCodigoWhatsApp(telefone);
      if (response.success) {
        setSuccessMessage('Novo código enviado.');
        setExpiresIn(response.expiresIn ?? 10);
      } else {
        setErrorMessage(response.message);
      }
    } catch {
      setErrorMessage('Erro ao reenviar código. Tente novamente.');
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

      {step === 'phone' ? (
        <form onSubmit={handleSolicitarCodigo} className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="telefone"
              className="block text-sm font-medium text-text-strong"
            >
              Número do WhatsApp
            </label>
            <div className="relative">
              <span
                className="material-icons pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                aria-hidden
              >
                smartphone
              </span>
              <input
                id="telefone"
                name="telefone"
                type="tel"
                required
                disabled={isLoading}
                maxLength={15}
                value={telefone}
                onChange={(event) =>
                  setTelefone(formatPhoneInput(event.target.value))
                }
                placeholder="(11) 99999-9999"
                className="h-11 w-full rounded-[var(--radius-control)] border border-border-default bg-surface pl-11 pr-3 text-sm text-text-strong shadow-[var(--shadow-control)] outline-none transition focus:border-accent focus:ring-2 focus:ring-ring focus:ring-offset-2"
              />
            </div>
            <p className="text-xs text-text-muted">
              Digite o número cadastrado no sistema
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoading || telefone.length < 14}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-control)] bg-accent px-4 text-sm font-semibold text-white shadow-[var(--shadow-accent)] transition hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="material-icons text-base" aria-hidden>
              smartphone
            </span>
            {isLoading ? 'Enviando…' : 'Enviar código via WhatsApp'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleValidarCodigo} className="space-y-4">
          <div className="flex items-center justify-between rounded-[var(--radius-control)] border border-border-default bg-surface-sunken px-3 py-2.5">
            <div className="flex items-center gap-2 text-sm text-text-strong">
              <span className="material-icons text-base text-text-muted" aria-hidden>
                smartphone
              </span>
              {telefone}
            </div>
            <button
              type="button"
              onClick={() => {
                setStep('phone');
                setCodigo('');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              disabled={isLoading}
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-vinho hover:underline"
            >
              <span className="material-icons text-sm" aria-hidden>
                arrow_back
              </span>
              Alterar
            </button>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="codigo"
              className="block text-sm font-medium text-text-strong"
            >
              Código de verificação
            </label>
            <div className="relative">
              <span
                className="material-icons pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
                aria-hidden
              >
                lock
              </span>
              <input
                id="codigo"
                name="codigo"
                type="text"
                inputMode="numeric"
                required
                autoFocus
                disabled={isLoading}
                maxLength={6}
                value={codigo}
                onChange={(event) =>
                  setCodigo(event.target.value.replace(/\D/g, '').slice(0, 6))
                }
                placeholder="000000"
                className="h-11 w-full rounded-[var(--radius-control)] border border-border-default bg-surface pl-11 pr-3 text-center font-mono text-lg tracking-[0.35em] text-text-strong shadow-[var(--shadow-control)] outline-none transition focus:border-accent focus:ring-2 focus:ring-ring focus:ring-offset-2"
              />
            </div>
            <p className="text-xs text-text-muted">Digite o código de 6 dígitos</p>
          </div>

          {expiresIn > 0 ? (
            <p className="text-center text-sm text-text-muted">
              Código expira em{' '}
              <span className="font-semibold tabular-nums text-text-strong">
                {expiresIn} minuto(s)
              </span>
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isLoading || codigo.length !== 6}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-control)] bg-accent px-4 text-sm font-semibold text-white shadow-[var(--shadow-accent)] transition hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="material-icons text-base" aria-hidden>
              lock
            </span>
            {isLoading ? 'Validando…' : 'Entrar'}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={handleReenviarCodigo}
              disabled={isLoading || expiresIn > 9}
              className="text-sm font-medium text-brand-vinho hover:underline disabled:cursor-not-allowed disabled:opacity-50"
            >
              {expiresIn > 9
                ? 'Aguarde para reenviar'
                : 'Não recebeu? Reenviar código'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
