import { describe, expect, it } from 'vitest';
import { AuthDevBypass } from './dev-bypass';

describe('AuthDevBypass.isEnabled', () => {
  it('fica desligado quando a variável não existe', () => {
    expect(AuthDevBypass.isEnabled({ NODE_ENV: 'development' })).toBe(false);
  });

  it('fica desligado quando a variável é false', () => {
    expect(
      AuthDevBypass.isEnabled({
        NODE_ENV: 'development',
        AUTH_DEV_BYPASS: 'false',
      }),
    ).toBe(false);
  });

  it('fica desligado em production mesmo com flag true', () => {
    expect(
      AuthDevBypass.isEnabled({
        NODE_ENV: 'production',
        AUTH_DEV_BYPASS: 'true',
      }),
    ).toBe(false);
  });

  it('fica desligado em test mesmo com flag true', () => {
    expect(
      AuthDevBypass.isEnabled({
        NODE_ENV: 'test',
        AUTH_DEV_BYPASS: 'true',
      }),
    ).toBe(false);
  });

  it('fica desligado em deploys Vercel mesmo em development', () => {
    expect(
      AuthDevBypass.isEnabled({
        NODE_ENV: 'development',
        VERCEL: '1',
        AUTH_DEV_BYPASS: 'true',
      }),
    ).toBe(false);
  });

  it('liga em development local com AUTH_DEV_BYPASS=true', () => {
    expect(
      AuthDevBypass.isEnabled({
        NODE_ENV: 'development',
        AUTH_DEV_BYPASS: 'true',
      }),
    ).toBe(true);
  });

  it.each(['1', 'yes', 'on', 'TRUE', 'Yes'])(
    'liga com AUTH_DEV_BYPASS=%s (case-insensitive)',
    (value) => {
      expect(
        AuthDevBypass.isEnabled({
          NODE_ENV: 'development',
          AUTH_DEV_BYPASS: value,
        }),
      ).toBe(true);
    },
  );
});

describe('AuthDevBypass.buildSession', () => {
  it('devolve system owner interno com e-mail local e UUID estável', () => {
    const session = AuthDevBypass.buildSession();
    expect(session.user.isSystemOwner).toBe(true);
    expect(session.user.email).toBe('dev-bypass@localhost');
    expect(session.user.id).toBe('00000000-0000-4000-8000-000000000001');
    expect(session.expires).toBe('2099-12-31T23:59:59.000Z');
  });

  it('usa AUTH_DEV_BYPASS_USER_ID quando definido', () => {
    const session = AuthDevBypass.buildSession({
      AUTH_DEV_BYPASS_USER_ID: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
    });
    expect(session.user.id).toBe('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee');
  });
});
