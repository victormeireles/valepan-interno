'use client';

import { useEffect, useState } from 'react';
import {
  confirmarCadastroEmail,
  solicitarCadastroEmail,
} from '@/app/actions/cadastro-email-actions';
import { definirNovaSenha } from '@/app/actions/password-auth-actions';
import { emailEnrollmentReturnPath } from '@/lib/auth/email-enrollment';
import { PASSWORD_MIN_LENGTH } from '@/lib/auth/email-otp/login-email-otp-constants';

const inputClass =
  'h-11 w-full rounded-[var(--radius-control)] border border-border-default bg-surface px-3 text-sm text-text-strong shadow-[var(--shadow-control)] outline-none transition focus:border-accent focus:ring-2 focus:ring-ring focus:ring-offset-2';
const primaryButton =
  'inline-flex h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-control)] bg-accent px-4 text-sm font-semibold text-white shadow-[var(--shadow-accent)] transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60';
const secondaryButton =
  'inline-flex h-11 w-full items-center justify-center rounded-[var(--radius-control)] border border-border-default bg-surface px-4 text-sm font-semibold text-text-strong transition hover:bg-surface-sunken disabled:opacity-60';

type Step = 'email' | 'code' | 'done';

export function CadastroEmailForm({ returnTo }: { returnTo: string }) {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [createPassword, setCreatePassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  function proceed() {
    window.location.assign(emailEnrollmentReturnPath(returnTo));
  }

  async function send() {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await solicitarCadastroEmail(email);
      if (!result.success) {
        setError(result.message);
        return;
      }
      setEmail(email.trim().toLowerCase());
      setCode('');
      setStep('code');
      setCooldown(60);
      setMessage(result.message);
    } catch {
      setError('Não foi possível enviar o código. Tente novamente.');
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await confirmarCadastroEmail(email, code);
      if (!result.success) {
        setError(result.message);
        return;
      }
      setStep('done');
    } catch {
      setError('Não foi possível confirmar. Tente novamente.');
    } finally {
      setBusy(false);
    }
  }

  async function savePassword() {
    setError('');
    if (password !== confirmation) {
      setError('As senhas não coincidem.');
      return;
    }
    setBusy(true);
    try {
      const result = await definirNovaSenha(password);
      if (!result.success) {
        setError(result.message);
        return;
      }
      proceed();
    } catch {
      setError(
        'Não foi possível salvar a senha. Seu e-mail já está confirmado.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      {error ? (
        <p
          role="alert"
          className="rounded-[var(--radius-control)] border border-danger-border bg-danger-bg p-3 text-sm text-danger-fg"
        >
          {error}
        </p>
      ) : null}
      {message ? (
        <p role="status" className="text-sm text-text-muted">
          {message}
        </p>
      ) : null}

      {step === 'email' ? (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void send();
          }}
        >
          <div className="space-y-2">
            <label htmlFor="cadastro-email" className="block text-sm font-medium text-text-strong">
              Seu e-mail
            </label>
            <input
              id="cadastro-email"
              type="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              required
              maxLength={255}
              value={email}
              disabled={busy}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="voce@exemplo.com"
              className={inputClass}
            />
            <p className="text-xs text-text-muted">
              Use um endereço ao qual você tem acesso. Enviaremos um código para
              confirmar.
            </p>
          </div>
          <button className={primaryButton} disabled={busy || cooldown > 0} type="submit">
            {busy ? 'Enviando…' : cooldown > 0 ? `Aguarde ${cooldown}s` : 'Receber código'}
          </button>
        </form>
      ) : null}

      {step === 'code' ? (
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void confirm();
          }}
        >
          <p className="break-all text-sm text-text-muted">
            Enviamos um código para <strong className="text-text-strong">{email}</strong>.
          </p>
          <div className="space-y-2">
            <label htmlFor="cadastro-codigo" className="block text-sm font-medium text-text-strong">
              Código de confirmação
            </label>
            <input
              id="cadastro-codigo"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              required
              pattern="[0-9]{6}"
              maxLength={6}
              value={code}
              disabled={busy}
              className={`${inputClass} text-center text-2xl tracking-[0.3em]`}
              placeholder="000000"
              onChange={(event) =>
                setCode(event.target.value.replace(/\D/g, ''))
              }
            />
            <p className="text-xs text-text-muted">
              Válido por 10 minutos. Confira também a pasta de spam.
            </p>
          </div>
          <button className={primaryButton} type="submit" disabled={busy || code.length !== 6}>
            {busy ? 'Aguarde…' : 'Confirmar e-mail'}
          </button>
          <div className="flex flex-wrap justify-between gap-2">
            <button
              type="button"
              className="min-h-11 text-sm font-medium text-accent hover:text-accent-hover disabled:opacity-60"
              disabled={busy || cooldown > 0}
              onClick={() => void send()}
            >
              {cooldown > 0 ? `Reenviar em ${cooldown}s` : 'Reenviar código'}
            </button>
            <button
              type="button"
              className="min-h-11 text-sm font-medium text-text-muted hover:text-text-strong"
              disabled={busy}
              onClick={() => {
                setStep('email');
                setError('');
                setMessage('');
                setCode('');
              }}
            >
              Corrigir e-mail
            </button>
          </div>
        </form>
      ) : null}

      {step === 'done' ? (
        <div className="space-y-4">
          <div className="space-y-2 text-center" role="status">
            <span className="material-icons text-4xl text-emerald-700" aria-hidden>
              check_circle
            </span>
            <h2 className="text-lg font-semibold text-text-strong">
              E-mail confirmado!
            </h2>
            <p className="break-all text-sm text-text-muted">
              Você já pode entrar usando códigos enviados para {email}.
            </p>
          </div>
          {!createPassword ? (
            <>
              <button
                className={primaryButton}
                type="button"
                onClick={() => setCreatePassword(true)}
              >
                Criar uma senha também
              </button>
              <button className={secondaryButton} type="button" onClick={proceed}>
                Continuar sem criar senha
              </button>
              <p className="text-xs text-text-muted">
                A senha é opcional e permite entrar sem esperar por um código.
              </p>
            </>
          ) : (
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                void savePassword();
              }}
            >
              <div className="space-y-2">
                <label htmlFor="cadastro-senha" className="block text-sm font-medium text-text-strong">
                  Nova senha
                </label>
                <input
                  id="cadastro-senha"
                  type="password"
                  required
                  minLength={PASSWORD_MIN_LENGTH}
                  maxLength={128}
                  autoComplete="new-password"
                  disabled={busy}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className={inputClass}
                />
                <p className="text-xs text-text-muted">
                  Use pelo menos {PASSWORD_MIN_LENGTH} caracteres.
                </p>
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="cadastro-confirma-senha"
                  className="block text-sm font-medium text-text-strong"
                >
                  Confirmar senha
                </label>
                <input
                  id="cadastro-confirma-senha"
                  type="password"
                  required
                  maxLength={128}
                  autoComplete="new-password"
                  disabled={busy}
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  className={inputClass}
                />
              </div>
              <button className={primaryButton} type="submit" disabled={busy}>
                {busy ? 'Salvando…' : 'Salvar senha e continuar'}
              </button>
              <button
                className="w-full min-h-11 text-sm font-medium text-text-muted hover:text-text-strong"
                type="button"
                disabled={busy}
                onClick={proceed}
              >
                Continuar sem criar senha
              </button>
            </form>
          )}
        </div>
      ) : null}

      {step !== 'done' ? (
        <details className="border-t border-border-default pt-4 text-sm text-text-muted">
          <summary className="cursor-pointer font-medium text-brand-vinho">
            Precisa de ajuda?
          </summary>
          <p className="mt-2">
            Se não tiver e-mail ou não conseguir receber o código, fale com seu
            contato habitual na equipe Valepan para regularizar seu cadastro.
            Mantenha esta página aberta e não saia da sua conta.
          </p>
        </details>
      ) : null}
    </div>
  );
}
