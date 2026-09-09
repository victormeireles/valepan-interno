'use client';

import { useState } from 'react';
import { LoginCallbackUrlResolver } from '@/lib/auth/login-callback-url-resolver';
import { LoginErrorMessageResolver } from '@/lib/auth/login-error-message-resolver';
import { EmailOtpLoginForm } from './email-otp-login-form';
import { LoginQrCodePanel } from './login-qr-code-panel';
import { PasswordLoginForm } from './password-login-form';
import { WhatsAppLoginForm } from './whatsapp-login-form';

type LoginMethod = 'whatsapp' | 'email' | 'password' | 'qr';

type LoginFormProps = {
  error?: string;
  email?: string;
  callbackUrl?: string;
};

const errorResolver = new LoginErrorMessageResolver();
const callbackResolver = new LoginCallbackUrlResolver();

const TABS: Array<{ id: LoginMethod; label: string; icon: string }> = [
  { id: 'whatsapp', label: 'WhatsApp', icon: 'smartphone' },
  { id: 'email', label: 'E-mail', icon: 'mail' },
  { id: 'password', label: 'Senha', icon: 'lock' },
  { id: 'qr', label: 'QR', icon: 'qr_code_2' },
];

export function LoginForm({ error, email, callbackUrl }: LoginFormProps) {
  const resolvedCallback = callbackResolver.resolve(callbackUrl, '/');
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('whatsapp');
  const bannerError =
    loginMethod === 'email' ? null : errorResolver.resolve(error);

  return (
    <div className="space-y-5">
      {bannerError ? (
        <p
          role="alert"
          className="rounded-[var(--radius-control)] border border-danger-border bg-danger-bg px-3 py-2 text-sm text-danger-fg"
        >
          {bannerError}
        </p>
      ) : null}

      <div className="flex gap-1 rounded-[var(--radius-control)] bg-surface-sunken p-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setLoginMethod(tab.id)}
            className={[
              'inline-flex h-10 flex-1 items-center justify-center gap-1 rounded-[calc(var(--radius-control)-2px)] px-1 text-xs font-semibold transition sm:text-sm',
              loginMethod === tab.id
                ? 'bg-surface text-text-strong shadow-sm'
                : 'text-text-muted hover:text-text-strong',
            ].join(' ')}
            aria-pressed={loginMethod === tab.id}
          >
            <span className="material-icons text-base" aria-hidden>
              {tab.icon}
            </span>
            <span className="truncate">{tab.label}</span>
          </button>
        ))}
      </div>

      {loginMethod === 'whatsapp' ? (
        <WhatsAppLoginForm callbackUrl={resolvedCallback} />
      ) : null}
      {loginMethod === 'email' ? (
        <EmailOtpLoginForm error={error} email={email} />
      ) : null}
      {loginMethod === 'password' ? (
        <PasswordLoginForm callbackUrl={resolvedCallback} />
      ) : null}
      {loginMethod === 'qr' ? <LoginQrCodePanel /> : null}
    </div>
  );
}
