import { createHmac, timingSafeEqual } from 'crypto';

const PROPOSITO = 'sugestao-melhoria';
const TTL_MS = 10 * 60 * 1000;

type Payload = { colaboradorId?: string; exp?: number; purpose?: string };

export class SugestaoIdentificacaoToken {
  constructor(
    private readonly secret: string,
    private readonly agora: () => number = () => Date.now(),
  ) {}

  assinar(colaboradorId: string): string {
    const corpo = Buffer.from(JSON.stringify({
      colaboradorId,
      exp: this.agora() + TTL_MS,
      purpose: PROPOSITO,
    })).toString('base64url');
    return `${corpo}.${this.assinarCorpo(corpo)}`;
  }

  conferir(token: string): { colaboradorId: string } | null {
    const partes = token.split('.');
    if (partes.length !== 2) return null;
    const [corpo, assinatura] = partes;
    if (!this.bate(assinatura, this.assinarCorpo(corpo))) return null;
    const dados = this.ler(corpo);
    if (!dados?.colaboradorId || dados.purpose !== PROPOSITO) return null;
    if (typeof dados.exp !== 'number' || dados.exp <= this.agora()) return null;
    return { colaboradorId: dados.colaboradorId };
  }

  private assinarCorpo(corpo: string): string {
    return createHmac('sha256', this.secret).update(corpo).digest('base64url');
  }

  private bate(recebida: string, esperada: string): boolean {
    const a = Buffer.from(recebida);
    const b = Buffer.from(esperada);
    return a.length === b.length && timingSafeEqual(a, b);
  }

  private ler(corpo: string): Payload | null {
    try {
      return JSON.parse(Buffer.from(corpo, 'base64url').toString('utf8')) as Payload;
    } catch {
      return null;
    }
  }
}
