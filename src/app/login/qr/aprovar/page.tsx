import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { approveLoginQrRequest } from '@/app/actions/login-qr-approve';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function resolveMessage(reason: string): string {
  if (reason === 'expired') {
    return 'Este QR expirou. Peça um QR novo na TV.';
  }
  if (reason === 'already_used' || reason === 'not_found') {
    return 'Este QR já foi usado ou é inválido. Peça um QR novo na TV.';
  }
  if (reason === 'inactive') {
    return 'Sua conta está desativada. Entre em contato com o administrador.';
  }
  if (reason === 'sem_permissao') {
    return 'Sem permissão para o Sistema de Produção. Solicite acesso ao administrador.';
  }
  return 'Não foi possível autorizar o dispositivo. Tente novamente.';
}

/**
 * Página aberta pelo scan do QR no celular já autenticado.
 */
export default async function LoginQrAprovarPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}): Promise<React.ReactElement> {
  const params = await searchParams;
  const id = params.id ?? '';

  if (!UUID_RE.test(id)) {
    return (
      <QrResultShell
        title="QR inválido"
        message="Peça um QR novo na TV e tente novamente."
      />
    );
  }

  const session = await auth();
  if (!session?.user?.id) {
    redirect(
      `/login?callbackUrl=${encodeURIComponent(`/login/qr/aprovar?id=${id}`)}`,
    );
  }

  const result = await approveLoginQrRequest(id);
  if (!result.ok) {
    if (result.reason === 'unauthenticated') {
      redirect(
        `/login?callbackUrl=${encodeURIComponent(`/login/qr/aprovar?id=${id}`)}`,
      );
    }
    return (
      <QrResultShell
        title="Não autorizado"
        message={resolveMessage(result.reason)}
      />
    );
  }

  return (
    <QrResultShell
      title="Dispositivo autorizado"
      message="Você pode voltar à TV. O acesso deve completar em alguns segundos."
    />
  );
}

function QrResultShell({
  title,
  message,
}: {
  title: string;
  message: string;
}): React.ReactElement {
  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center">
      <div className="mb-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-vinho">
          Valepan
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-text-strong">
          {title}
        </h1>
      </div>

      <div className="space-y-4 rounded-xl border border-border-default bg-surface p-6 text-center shadow-sm">
        <p className="text-sm text-text-muted">{message}</p>
        <Link
          href="/"
          className="inline-flex h-11 items-center justify-center rounded-[var(--radius-control)] bg-accent px-4 text-sm font-semibold text-white shadow-[var(--shadow-accent)] transition hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          Ir para o sistema
        </Link>
      </div>
    </div>
  );
}
