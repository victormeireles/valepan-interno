import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/clients/supabase-client-factory';
import {
  emailEnrollmentReturnPath,
  needsEmailEnrollment,
} from '@/lib/auth/email-enrollment';
import { CadastroEmailForm } from './cadastro-email-form';

export const dynamic = 'force-dynamic';

export default async function CompletarEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login');
  }
  const returnTo = emailEnrollmentReturnPath((await searchParams).returnTo);
  const { data: user, error } = await createServiceRoleClient()
    .from('usuarios')
    .select('email, ativo')
    .eq('id', session.user.id)
    .single();

  if (error || !user || user.ativo === false) {
    return (
      <main className="mx-auto max-w-md p-8 text-center" role="alert">
        Não foi possível consultar sua conta. Tente atualizar a página em
        instantes. Se o problema continuar, fale com a equipe Valepan. Sua
        sessão não foi encerrada.
      </main>
    );
  }
  if (!needsEmailEnrollment(user.email)) {
    redirect(returnTo);
  }

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center">
      <div className="mb-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-vinho">
          Valepan
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-text-strong">
          Proteja seu acesso
        </h1>
        <p className="mt-2 text-sm text-text-muted">
          Cadastre um e-mail para continuar acessando, mesmo sem códigos de
          WhatsApp.
        </p>
      </div>
      <div className="rounded-xl border border-border-default bg-surface p-6 shadow-sm">
        <CadastroEmailForm returnTo={returnTo} />
      </div>
      <p className="mt-6 text-center text-sm text-text-muted">
        Você continua conectado. Esta etapa é necessária apenas uma vez.
      </p>
    </main>
  );
}
