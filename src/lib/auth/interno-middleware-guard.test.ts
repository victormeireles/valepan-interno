import { describe, expect, it } from 'vitest';
import { InternoAccessManager } from './interno-access-manager';
import { InternoMiddlewareGuard } from './interno-middleware-guard';
import { InternoRouteAccessMap } from './interno-route-access-map';

describe('InternoMiddlewareGuard', () => {
  const guard = new InternoMiddlewareGuard(
    new InternoRouteAccessMap(),
    new InternoAccessManager(),
  );

  const tabletFermentacao = {
    sub: 'user-tablet',
    isSystemOwner: false,
    modulosEfetivos: {
      interno_fermentacao: 'editar' as const,
      interno_painel: 'ler' as const,
    },
  };

  const semModulos = {
    sub: 'user-sem-acesso',
    isSystemOwner: false,
    modulosEfetivos: {},
  };

  it('sem token em rota protegida redireciona para login com callbackUrl', () => {
    expect(
      guard.decide({ pathname: '/ordens-producao', token: null }),
    ).toEqual({
      redirect: `/login?callbackUrl=${encodeURIComponent('/ordens-producao')}`,
    });
  });

  it('token sem módulos no hub redireciona para login', () => {
    expect(guard.decide({ pathname: '/', token: semModulos })).toEqual({
      redirect: '/login?error=SemPermissao',
    });
  });

  it('tablet fermentação sem config redireciona para hub com erro', () => {
    expect(
      guard.decide({ pathname: '/config', token: tabletFermentacao }),
    ).toEqual({ redirect: '/?erro=sem-permissao' });
  });

  it('tablet fermentação acessa realizado/fermentacao', () => {
    expect(
      guard.decide({
        pathname: '/realizado/fermentacao',
        token: tabletFermentacao,
      }),
    ).toBe('allow');
  });

  it('sem token em rota pública permite', () => {
    expect(
      guard.decide({ pathname: '/api/public/saidas', token: null }),
    ).toBe('allow');
    expect(guard.decide({ pathname: '/login', token: null })).toBe('allow');
  });

  it('tablet fermentação não chama API de forno', () => {
    expect(
      guard.decide({
        pathname: '/api/producao/forno/x',
        token: tabletFermentacao,
      }),
    ).toEqual({ redirect: '/?erro=sem-permissao' });
  });

  it('tablet fermentação faz upload de foto de produção', () => {
    expect(
      guard.decide({
        pathname: '/api/upload/photo',
        token: tabletFermentacao,
      }),
    ).toBe('allow');
    expect(
      guard.decide({
        pathname: '/api/upload/producao-photo',
        token: tabletFermentacao,
      }),
    ).toBe('allow');
    expect(
      guard.decide({
        pathname: '/api/photo/abc',
        token: tabletFermentacao,
      }),
    ).toBe('allow');
  });

  it('sem token em upload de foto redireciona para login', () => {
    expect(
      guard.decide({ pathname: '/api/upload/photo', token: null }),
    ).toEqual({
      redirect: `/login?callbackUrl=${encodeURIComponent('/api/upload/photo')}`,
    });
  });

  it('token sem módulos em upload de foto redireciona para login', () => {
    expect(
      guard.decide({ pathname: '/api/upload/photo', token: semModulos }),
    ).toEqual({ redirect: '/login?error=SemPermissao' });
  });

  it('usuário só com ordens não faz upload de foto de produção', () => {
    const ordensOnly = {
      sub: 'user-ordens',
      isSystemOwner: false,
      modulosEfetivos: { interno_ordens: 'editar' as const },
    };
    expect(
      guard.decide({ pathname: '/api/upload/photo', token: ordensOnly }),
    ).toEqual({ redirect: '/?erro=sem-permissao' });
  });

  const planejamentoOrdens = {
    sub: 'user-planejamento',
    isSystemOwner: false,
    modulosEfetivos: { interno_ordens: 'ler' as const },
  };

  it('interno_ordens:ler + GET /api/ordens-producao permite', () => {
    expect(
      guard.decide({
        pathname: '/api/ordens-producao',
        token: planejamentoOrdens,
        method: 'GET',
      }),
    ).toBe('allow');
  });

  it('interno_ordens:ler + POST /api/ordens-producao redireciona sem-permissao', () => {
    expect(
      guard.decide({
        pathname: '/api/ordens-producao',
        token: planejamentoOrdens,
        method: 'POST',
      }),
    ).toEqual({ redirect: '/?erro=sem-permissao' });
  });

  it('interno_config:editar + GET /api/config/whatsapp exige administrar', () => {
    const configEditar = {
      sub: 'user-config',
      isSystemOwner: false,
      modulosEfetivos: { interno_config: 'editar' as const },
    };
    expect(
      guard.decide({
        pathname: '/api/config/whatsapp',
        token: configEditar,
        method: 'GET',
      }),
    ).toEqual({ redirect: '/?erro=sem-permissao' });
  });

  it('tablet fermentação GET /api/painel/fermentacao permite (ler)', () => {
    expect(
      guard.decide({
        pathname: '/api/painel/fermentacao',
        token: tabletFermentacao,
        method: 'GET',
      }),
    ).toBe('allow');
  });

  it('tablet fermentação não limpa fotos (cleanup é config)', () => {
    expect(
      guard.decide({
        pathname: '/api/photo/cleanup',
        token: tabletFermentacao,
        method: 'POST',
      }),
    ).toEqual({ redirect: '/?erro=sem-permissao' });
  });

  it('interno_config:administrar + POST /api/photo/cleanup permite', () => {
    const configAdmin = {
      sub: 'user-config-admin',
      isSystemOwner: false,
      modulosEfetivos: { interno_config: 'administrar' as const },
    };
    expect(
      guard.decide({
        pathname: '/api/photo/cleanup',
        token: configAdmin,
        method: 'POST',
      }),
    ).toBe('allow');
  });

  it('tablet fermentação não chama options/generic', () => {
    expect(
      guard.decide({
        pathname: '/api/options/generic',
        token: tabletFermentacao,
        method: 'GET',
      }),
    ).toEqual({ redirect: '/?erro=sem-permissao' });
  });

  it('interno_etiquetas:ler + GET /api/options/generic permite', () => {
    const etiquetas = {
      sub: 'user-etiquetas',
      isSystemOwner: false,
      modulosEfetivos: { interno_etiquetas: 'ler' as const },
    };
    expect(
      guard.decide({
        pathname: '/api/options/generic',
        token: etiquetas,
        method: 'GET',
      }),
    ).toBe('allow');
  });

  it('Operações (ordens:editar, config:editar) lê /api/produtos/.../assadeiras', () => {
    const operacoes = {
      sub: 'user-operacoes',
      isSystemOwner: false,
      modulosEfetivos: {
        interno_ordens: 'editar' as const,
        interno_config: 'editar' as const,
        interno_embalagem: 'editar' as const,
      },
    };
    expect(
      guard.decide({
        pathname: '/api/produtos/Bolinho/assadeiras',
        token: operacoes,
        method: 'GET',
      }),
    ).toBe('allow');
  });

  it('interno_config:editar sem ordens ainda lê /api/produtos', () => {
    const configEditar = {
      sub: 'user-config',
      isSystemOwner: false,
      modulosEfetivos: { interno_config: 'editar' as const },
    };
    expect(
      guard.decide({
        pathname: '/api/produtos/Bolinho',
        token: configEditar,
        method: 'GET',
      }),
    ).toBe('allow');
  });

  it('tablet fermentação não lê /api/produtos', () => {
    expect(
      guard.decide({
        pathname: '/api/produtos/Bolinho/assadeiras',
        token: tabletFermentacao,
        method: 'GET',
      }),
    ).toEqual({ redirect: '/?erro=sem-permissao' });
  });
});
