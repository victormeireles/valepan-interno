import { describe, expect, it } from 'vitest';
import { LoginErrorMessageResolver } from './login-error-message-resolver';

describe('LoginErrorMessageResolver', () => {
  const resolver = new LoginErrorMessageResolver();

  it('explica SemPermissao em vez de misturar com código inválido', () => {
    expect(resolver.resolve('SemPermissao')).toMatch(/Sem permissão/);
  });

  it('trata CredentialsSignin como código inválido', () => {
    expect(resolver.resolve('CredentialsSignin')).toMatch(/Código incorreto/);
  });

  it('retorna null para código desconhecido', () => {
    expect(resolver.resolve('SomethingElse')).toBeNull();
  });
});
