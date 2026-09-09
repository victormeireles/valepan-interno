import { createHash, randomInt } from 'node:crypto';

/**
 * Gera e faz hash de códigos OTP de 6 dígitos (e-mail).
 */
export class LoginEmailOtpHasher {
  createCode(): string {
    return randomInt(100000, 1000000).toString();
  }

  hash(code: string): string {
    return createHash('sha256').update(code, 'utf8').digest('hex');
  }

  matches(code: string, hash: string): boolean {
    return this.hash(code) === hash;
  }
}
