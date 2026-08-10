import { createHash, randomBytes } from 'node:crypto';

/**
 * Hash e geração de exchange tokens para login por QR.
 */
export class LoginQrTokenHasher {
  createToken(): string {
    return randomBytes(32).toString('base64url');
  }

  hash(token: string): string {
    return createHash('sha256').update(token, 'utf8').digest('hex');
  }

  matches(token: string, hash: string): boolean {
    return this.hash(token) === hash;
  }
}
