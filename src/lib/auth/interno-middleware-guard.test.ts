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

  it('token sem módulos no hub redireciona para /sem-acesso', () => {
    expect(guard.decide({ pathname: '/', token: semModulos })).toEqual({
      redirect: '/sem-acesso',
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

  it('token sem módulos em upload de foto redireciona para sem-acesso', () => {
    expect(
      guard.decide({ pathname: '/api/upload/photo', token: semModulos }),
    ).toEqual({ redirect: '/sem-acesso' });
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
});
