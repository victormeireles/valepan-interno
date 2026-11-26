import { createHmac } from 'crypto';
import { describe, expect, it } from 'vitest';
import { SugestaoIdentificacaoToken } from './sugestao-identificacao-token';

describe('SugestaoIdentificacaoToken', () => {
  const agora = 1_700_000_000_000;
  const token = new SugestaoIdentificacaoToken('segredo', () => agora);

  it('devolve o id enquanto não vence', () => {
    const assinado = token.assinar('colab-1');
    expect(new SugestaoIdentificacaoToken('segredo', () => agora + 60_000).conferir(assinado))
      .toEqual({ colaboradorId: 'colab-1' });
  });

  it('recusa vencido, adulterado, outro segredo e outro propósito', () => {
    const assinado = token.assinar('colab-1');
    expect(new SugestaoIdentificacaoToken('segredo', () => agora + 10 * 60 * 1000).conferir(assinado)).toBeNull();
    expect(token.conferir(`${assinado}x`)).toBeNull();
    expect(new SugestaoIdentificacaoToken('outro', () => agora).conferir(assinado)).toBeNull();
    const payload = Buffer.from(JSON.stringify({
      colaboradorId: 'colab-1', exp: agora + 1000, purpose: 'outro',
    })).toString('base64url');
    const assinatura = createHmac('sha256', 'segredo').update(payload).digest('base64url');
    expect(token.conferir(`${payload}.${assinatura}`)).toBeNull();
  });
});
