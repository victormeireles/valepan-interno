import {
  DEFINIR_SENHA_PATH,
  EMAIL_ENROLLMENT_PATH,
  emailEnrollmentReturnPath,
  needsEmailEnrollment,
} from './email-enrollment';
import type {
  InternoAuthLifecycleDecision,
  InternoAuthLifecycleInput,
} from './interno-auth-lifecycle-types';

/**
 * Travas 2–4 do middleware: inativo → e-mail → senha obrigatória.
 * A ausência de sessão é tratada antes, pelo guard de rotas.
 */
export class InternoAuthLifecycleGuard {
  decide(input: InternoAuthLifecycleInput): InternoAuthLifecycleDecision {
    if (input.status.kind === 'unavailable') {
      return { redirect: '/login?error=DatabaseError' };
    }

    if (input.status.ativo === false) {
      return {
        redirect: '/login?error=UserInactive',
        clearSession: true,
      };
    }

    if (input.pathname === EMAIL_ENROLLMENT_PATH) {
      return 'allow';
    }

    if (needsEmailEnrollment(input.status.email)) {
      return this.emailRequired(input);
    }

    const mustChange = input.status.passwordMustChange === true;
    if (input.pathname === DEFINIR_SENHA_PATH) {
      return mustChange ? 'allow' : { redirect: '/' };
    }

    if (mustChange) {
      return { redirect: DEFINIR_SENHA_PATH };
    }

    return 'allow';
  }

  private emailRequired(
    input: InternoAuthLifecycleInput,
  ): InternoAuthLifecycleDecision {
    const method = (input.method ?? 'GET').toUpperCase();
    const returnTo = emailEnrollmentReturnPath(
      `${input.pathname}${input.search ?? ''}`,
    );
    const redirectTo = `${EMAIL_ENROLLMENT_PATH}?returnTo=${encodeURIComponent(returnTo)}`;
    const isReadNavigation = method === 'GET' || method === 'HEAD';
    if (!isReadNavigation || input.pathname.startsWith('/api/')) {
      return {
        json: { error: 'EmailRequired', redirectTo },
        status: 409,
      };
    }
    return { redirect: redirectTo };
  }
}
