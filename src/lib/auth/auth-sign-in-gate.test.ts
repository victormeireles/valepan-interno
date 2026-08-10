import { describe, expect, it } from 'vitest';
import { AuthSignInGate } from './auth-sign-in-gate';

describe('AuthSignInGate', () => {
  const gate = new AuthSignInGate();

  it('nega quando usuário não existe', () => {
    expect(gate.decide(null)).toBe('/login?error=UserNotFound');
  });

  it('nega quando usuário está inativo', () => {
    expect(
      gate.decide({
        id: 'u1',
        email: 'x@valepan.com',
        nome: 'X',
        ativo: false,
      }),
    ).toBe('/login?error=UserInactive');
  });

  it('permite usuário ativo mesmo sem módulos', () => {
    expect(
      gate.decide({
        id: 'u1',
        email: 'x@valepan.com',
        nome: 'X',
        ativo: true,
      }),
    ).toBe(true);
  });
});
