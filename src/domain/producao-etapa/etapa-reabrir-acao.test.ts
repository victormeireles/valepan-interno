import { describe, expect, it } from 'vitest';
import {
  EtapaReabrirAcaoPolicy,
  type EtapaReabrirAcao,
} from './etapa-reabrir-acao';

describe('EtapaReabrirAcaoPolicy', () => {
  const policy = new EtapaReabrirAcaoPolicy();

  it('nao abre novo lote quando a acao for somente reabrir', () => {
    const acao: EtapaReabrirAcao = 'somente-reabrir';

    expect(policy.shouldOpenNovoLote(acao)).toBe(false);
  });

  it('abre novo lote quando a acao solicitar adicionar lote', () => {
    const acao: EtapaReabrirAcao = 'reabrir-e-adicionar-lote';

    expect(policy.shouldOpenNovoLote(acao)).toBe(true);
  });
});
