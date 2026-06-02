import { describe, expect, it } from 'vitest';
import { ltFromFermentacaoLog, sumQuantidadeFermentacaoConcluida } from './fermentacao-progresso';
import type { ProductionStepLog } from '@/domain/types/producao-etapas';

describe('ltFromFermentacaoLog', () => {
  it('usa assadeiras_lt digitado, não qtd_saida em unidades', () => {
    expect(
      ltFromFermentacaoLog(400, { numero_carrinho: '1', assadeiras_lt: 20 }, 20),
    ).toBe(20);
  });

  it('deriva LT de qtd_saida só quando assadeiras_lt ausente', () => {
    expect(ltFromFermentacaoLog(400, { numero_carrinho: '1' }, 20)).toBe(20);
  });

  it('não confunde unidades com latas quando UA efetiva está errada (1)', () => {
    expect(
      ltFromFermentacaoLog(200, { numero_carrinho: '1', assadeiras_lt: 20 }, 1),
    ).toBe(20);
  });
});

describe('sumQuantidadeFermentacaoConcluida', () => {
  it('soma assadeiras_lt mesmo sem unidades por assadeira no produto', () => {
    const logs: ProductionStepLog[] = [
      {
        id: 'a',
        etapa: 'fermentacao',
        fim: '2026-01-01T00:00:00Z',
        qtd_saida: 200,
        dados_qualidade: { assadeiras_lt: 20, numero_carrinho: '3' },
      } as ProductionStepLog,
    ];
    expect(sumQuantidadeFermentacaoConcluida(logs, null)).toBe(20);
  });
});
