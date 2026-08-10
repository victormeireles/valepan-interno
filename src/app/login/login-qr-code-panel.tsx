'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { signIn } from 'next-auth/react';
import {
  LoginQrPollingController,
  type LoginQrClientState,
} from './login-qr-polling-controller';

/**
 * Painel de QR para login em TV/PC.
 */
export function LoginQrCodePanel() {
  const [state, setState] = useState<LoginQrClientState>({ kind: 'loading' });
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  useEffect(() => {
    const controller = new LoginQrPollingController(signIn);
    controller.start(setState);
    return () => controller.stop();
  }, []);

  useEffect(() => {
    if (state.kind !== 'waiting') {
      setQrDataUrl(null);
      return;
    }

    let cancelled = false;
    void QRCode.toDataURL(state.approveUrl, {
      width: 320,
      margin: 2,
      errorCorrectionLevel: 'M',
    }).then((url) => {
      if (!cancelled) {
        setQrDataUrl(url);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [state]);

  useEffect(() => {
    if (state.kind !== 'waiting') {
      setSecondsLeft(null);
      return;
    }

    const tick = () => {
      const remainingMs = new Date(state.expiresAt).getTime() - Date.now();
      setSecondsLeft(Math.max(0, Math.ceil(remainingMs / 1000)));
    };
    tick();
    const interval = setInterval(tick, 500);
    return () => clearInterval(interval);
  }, [state]);

  if (state.kind === 'loading') {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-sm text-text-muted">
        <span className="material-icons animate-spin text-xl" aria-hidden>
          refresh
        </span>
        Gerando QR Code…
      </div>
    );
  }

  if (state.kind === 'error') {
    return (
      <div className="space-y-4 text-center">
        <p
          role="alert"
          className="rounded-[var(--radius-control)] border border-danger-border bg-danger-bg px-3 py-2 text-sm text-danger-fg"
        >
          {state.message}
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[var(--radius-control)] bg-accent px-4 text-sm font-semibold text-white shadow-[var(--shadow-accent)] transition hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  if (state.kind === 'signing-in') {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-sm text-text-muted">
        <span className="material-icons animate-spin text-xl" aria-hidden>
          refresh
        </span>
        Autorizando dispositivo…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-center text-sm text-text-muted">
        Escaneie com um celular ou tablet já logado no sistema.
      </p>
      <div className="mx-auto flex min-h-[280px] min-w-[280px] items-center justify-center rounded-[var(--radius-control)] border border-border-default bg-surface p-3">
        {qrDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- data URL gerado no client
          <img
            src={qrDataUrl}
            alt="QR Code para login"
            width={256}
            height={256}
            className="h-64 w-64"
          />
        ) : (
          <span className="material-icons animate-spin text-xl text-text-muted" aria-hidden>
            refresh
          </span>
        )}
      </div>
      <p className="text-center font-mono text-sm font-medium tabular-nums text-text-strong">
        {secondsLeft === null
          ? 'Aguardando leitura…'
          : `Expira em ${secondsLeft}s`}
      </p>
    </div>
  );
}
