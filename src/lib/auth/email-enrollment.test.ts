import { describe, expect, it } from 'vitest';
import {
  emailEnrollmentReturnPath,
  needsEmailEnrollment,
} from './email-enrollment';

describe('needsEmailEnrollment', () => {
  it.each([null, undefined, '', '   '])('exige cadastro para %j', (email) => {
    expect(needsEmailEnrollment(email)).toBe(true);
  });

  it('nao exige quem ja tem e-mail', () => {
    expect(needsEmailEnrollment('ana@valepan.com')).toBe(false);
  });
});

describe('emailEnrollmentReturnPath', () => {
  it.each([
    'https://evil.com',
    '//evil.com',
    '/\\evil.com',
    '/%5cevil.com',
    '/%2fevil.com',
    '/login',
    '/api/auth/signout',
    '/completar-email',
    '/x/../login',
    '/%6cogin',
    '/%',
  ])('rejeita destino %s', (path) => {
    expect(emailEnrollmentReturnPath(path)).toBe('/');
  });

  it('preserva pagina e filtros internos', () => {
    expect(emailEnrollmentReturnPath('/ordens-producao?pagina=2')).toBe(
      '/ordens-producao?pagina=2',
    );
  });
});
