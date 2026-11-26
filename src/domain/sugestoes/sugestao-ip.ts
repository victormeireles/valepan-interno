import { createHash } from 'crypto';

export class SugestaoIpOrigem {
  extrair(headers: Headers): string | null {
    const bruto = headers.get('x-forwarded-for');
    if (!bruto) return null;
    const primeiro = bruto.split(',')[0]?.trim() ?? '';
    return primeiro || null;
  }
}

export class SugestaoIpHash {
  calcular(secret: string, ip: string | null): string {
    const origem = ip && ip.trim() ? ip.trim() : 'desconhecido';
    return createHash('sha256').update(`${secret}\n${origem}`).digest('hex');
  }
}
