import { describe, expect, it } from 'vitest';
import {
  requerConfirmacao,
  resolveEtapaContinuidade,
} from './etapa-continuidade-policy';

const UNIDADE = 'LT';

describe('resolveEtapaContinuidade', () => {
  it('600/700: usual Salvar, confirmar ao finalizar, texto contém 100', () => {
    const result = resolveEtapaContinuidade({
      totalProjetado: 600,
      metaReferencia: 700,
      unidade: UNIDADE,
    });

    expect(result.usualContinuaProduzindo).toBe(true);
    expect(result.requerConfirmacaoAoFinalizar).toBe(true);
    expect(result.requerConfirmacaoAoContinuar).toBe(false);
    expect(result.textoConfirmacaoFinalizar).toContain('100');
    expect(requerConfirmacao(false, result)).toBe(true);
    expect(requerConfirmacao(true, result)).toBe(false);
  });

  it('700/700: usual finalizar, sem confirmar finalizar, confirmar continuar', () => {
    const result = resolveEtapaContinuidade({
      totalProjetado: 700,
      metaReferencia: 700,
      unidade: UNIDADE,
    });

    expect(result.usualContinuaProduzindo).toBe(false);
    expect(result.requerConfirmacaoAoFinalizar).toBe(false);
    expect(result.requerConfirmacaoAoContinuar).toBe(true);
    expect(result.textoConfirmacaoContinuar).toBe(
      'Sim, confirmo que ainda vou produzir mais',
    );
    expect(requerConfirmacao(false, result)).toBe(false);
    expect(requerConfirmacao(true, result)).toBe(true);
  });

  it('720/700: usual finalizar, sem confirmar finalizar', () => {
    const result = resolveEtapaContinuidade({
      totalProjetado: 720,
      metaReferencia: 700,
      unidade: UNIDADE,
    });

    expect(result.usualContinuaProduzindo).toBe(false);
    expect(result.requerConfirmacaoAoFinalizar).toBe(false);
    expect(result.requerConfirmacaoAoContinuar).toBe(true);
    expect(requerConfirmacao(false, result)).toBe(false);
  });

  it('680/700: igual ao caso 600 com delta 20', () => {
    const result = resolveEtapaContinuidade({
      totalProjetado: 680,
      metaReferencia: 700,
      unidade: UNIDADE,
    });

    expect(result.usualContinuaProduzindo).toBe(true);
    expect(result.requerConfirmacaoAoFinalizar).toBe(true);
    expect(result.requerConfirmacaoAoContinuar).toBe(false);
    expect(result.textoConfirmacaoFinalizar).toContain('20');
    expect(requerConfirmacao(false, result)).toBe(true);
    expect(requerConfirmacao(true, result)).toBe(false);
  });
});
