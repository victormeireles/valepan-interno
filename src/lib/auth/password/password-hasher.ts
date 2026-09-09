import { hashSync, compareSync } from 'bcryptjs';

const BCRYPT_COST = 12;

/**
 * Hash e verificação de senhas de usuário.
 */
export class PasswordHasher {
  hash(plain: string): string {
    return hashSync(plain, BCRYPT_COST);
  }

  verify(plain: string, passwordHash: string): boolean {
    return compareSync(plain, passwordHash);
  }
}
