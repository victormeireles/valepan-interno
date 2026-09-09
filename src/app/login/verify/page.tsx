import Link from 'next/link';
import { EmailOtpVerifyForm } from '../email-otp-verify-form';

export default async function LoginVerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; callbackUrl?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center">
      <div className="rounded-xl border border-border-default bg-surface p-6 shadow-sm">
        <div className="mb-4 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-800">
            <span className="material-icons" aria-hidden>
              pin
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-text-strong">
            Digite o código
          </h1>
          <p className="mt-3 text-sm text-text-muted">
            Enviamos um código de 6 dígitos. Digite-o neste aparelho.
          </p>
        </div>
        <EmailOtpVerifyForm
          email={params.email}
          callbackUrl={params.callbackUrl}
        />
      </div>

      <div className="mt-6 text-center">
        <Link
          href="/login"
          className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-accent hover:text-accent-hover"
        >
          <span className="material-icons text-base" aria-hidden>
            arrow_back
          </span>
          Voltar para login
        </Link>
      </div>
    </div>
  );
}
