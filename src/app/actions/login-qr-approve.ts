'use server';

import { auth } from '@/lib/auth';
import { createServiceRoleClient } from '@/lib/clients/supabase-client-factory';
import { InternoAccessManager } from '@/lib/auth/interno-access-manager';
import { LoginQrRequestManager } from '@/lib/auth/qr/login-qr-request-manager';
import { UsuarioAuthzLoader } from '@/lib/auth/usuario-authz-loader';
import type { DatabaseComAuthz } from '@/types/database-authz';

export type LoginQrApproveActionResult =
  | { ok: true }
  | {
      ok: false;
      reason: 'unauthenticated' | 'inactive' | 'sem_permissao' | 'invalid' | string;
    };

/**
 * Aprova um pedido de login QR com a sessão atual do celular.
 */
export async function approveLoginQrRequest(
  id: string,
): Promise<LoginQrApproveActionResult> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return { ok: false, reason: 'unauthenticated' };
  }

  const supabase = createServiceRoleClient();
  const authzClient = supabase as unknown as import('@supabase/supabase-js').SupabaseClient<DatabaseComAuthz>;
  const snap = await new UsuarioAuthzLoader(authzClient).load(userId);
  if (!snap) {
    return { ok: false, reason: 'inactive' };
  }
  if (!new InternoAccessManager().podeAcessarApp(snap)) {
    return { ok: false, reason: 'sem_permissao' };
  }

  const manager = new LoginQrRequestManager(supabase);
  const result = await manager.approve(id, userId);
  if (!result.ok) {
    return { ok: false, reason: result.reason };
  }
  return { ok: true };
}
