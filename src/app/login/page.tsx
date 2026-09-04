import { redirect } from 'next/navigation';
import { AuthDevBypass } from '@/lib/auth/dev-bypass';
import { LoginForm } from './login-form';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; email?: string; callbackUrl?: string }>;
}) {
  if (AuthDevBypass.isEnabled()) {
    redirect('/');
  }

  const params = await searchParams;

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center">
      <div className="mb-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-vinho">
          Valepan
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-text-strong">
          Sistema de Produção
        </h1>
        <p className="mt-2 text-sm text-text-muted">
          Acesse com WhatsApp, e-mail ou QR
        </p>
      </div>

      <div className="rounded-xl border border-border-default bg-surface p-6 shadow-sm">
        <LoginForm
          error={params.error}
          email={params.email}
          callbackUrl={params.callbackUrl}
        />
      </div>

      <p className="mt-6 text-center text-sm text-text-muted">
        Sem acesso? Fale com o administrador do sistema.
      </p>
    </div>
  );
}
