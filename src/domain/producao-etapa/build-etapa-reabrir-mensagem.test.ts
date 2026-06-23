import { describe, expect, it } from 'vitest';
import { buildEtapaReabrirMensagem } from './build-etapa-reabrir-mensagem';

describe('buildEtapaReabrirMensagem', () => {
  it('descreve produção finalizada e necessidade de refinalizar', () => {
    const mensagem = buildEtapaReabrirMensagem({
      etapaNome: 'embalagem',
      produzidoLabel: '343',
      unidade: 'cx',
    });

    expect(mensagem).toContain('343');
    expect(mensagem).toContain('CX');
    expect(mensagem).toMatch(/finalizar novamente/i);
  });
});
