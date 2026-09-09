import { describe, expect, it } from 'vitest';
import { InternoAuthLifecycleGuard } from './interno-auth-lifecycle-guard';

const enrolled = {
  kind: 'ok' as const,
  ativo: true,
  email: 'ana@valepan.com',
  passwordMustChange: false,
};

const semEmail = {
  kind: 'ok' as const,
  ativo: true,
  email: null as string | null,
  passwordMustChange: false,
};

describe('InternoAuthLifecycleGuard', () => {
  const guard = new InternoAuthLifecycleGuard();

  it('GET sem e-mail redireciona para completar-email e preserva destino', () => {
    expect(
      guard.decide({
        pathname: '/ordens-producao',
        search: '?pagina=2',
        method: 'GET',
        status: semEmail,
      }),
    ).toEqual({
      redirect: '/completar-email?returnTo=%2Fordens-producao%3Fpagina%3D2',
    });
  });

  it('POST sem e-mail devolve 409 e nao encerra sessao', () => {
    expect(
      guard.decide({
        pathname: '/ordens-producao',
        method: 'POST',
        status: semEmail,
      }),
    ).toEqual({
      json: {
        error: 'EmailRequired',
        redirectTo: '/completar-email?returnTo=%2Fordens-producao',
      },
      status: 409,
    });
  });

  it('GET de API sem e-mail devolve 409 em vez de redirect', () => {
    expect(
      guard.decide({
        pathname: '/api/ordens-producao',
        method: 'GET',
        status: semEmail,
      }),
    ).toMatchObject({
      status: 409,
      json: { error: 'EmailRequired' },
    });
  });

  it('permite /completar-email mesmo com senha pendente', () => {
    expect(
      guard.decide({
        pathname: '/completar-email',
        method: 'POST',
        status: {
          kind: 'ok',
          ativo: true,
          email: null,
          passwordMustChange: true,
        },
      }),
    ).toBe('allow');
  });

  it('password_must_change bloqueia o app e libera a propria tela', () => {
    const status = {
      kind: 'ok' as const,
      ativo: true,
      email: 'ana@valepan.com',
      passwordMustChange: true,
    };
    expect(
      guard.decide({ pathname: '/ordens-producao', status }),
    ).toEqual({ redirect: '/login/definir-senha' });
    expect(
      guard.decide({ pathname: '/login/definir-senha', status }),
    ).toBe('allow');
  });

  it('inativo encerra sessao', () => {
    expect(
      guard.decide({
        pathname: '/',
        status: {
          kind: 'ok',
          ativo: false,
          email: 'ana@valepan.com',
          passwordMustChange: false,
        },
      }),
    ).toEqual({
      redirect: '/login?error=UserInactive',
      clearSession: true,
    });
  });

  it('consulta indisponivel nao pula o gate de e-mail', () => {
    expect(
      guard.decide({
        pathname: '/',
        status: { kind: 'unavailable' },
      }),
    ).toEqual({ redirect: '/login?error=DatabaseError' });
  });

  it('returnTo malicioso cai no fallback', () => {
    const decision = guard.decide({
      pathname: '/login',
      search: '',
      method: 'GET',
      status: semEmail,
    });
    expect(decision).toEqual({
      redirect: '/completar-email?returnTo=%2F',
    });
  });

  it('quem ja tem e-mail segue', () => {
    expect(
      guard.decide({ pathname: '/ordens-producao', status: enrolled }),
    ).toBe('allow');
  });
});
