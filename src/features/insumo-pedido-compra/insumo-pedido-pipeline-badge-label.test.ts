import { describe, expect, it } from 'vitest';
import { formatPipelineBadge } from './insumo-pedido-pipeline-badge-label';

describe('formatPipelineBadge', () => {
  it('marca atrasado em danger sem data no detalhe', () => {
    const badge = formatPipelineBadge({
      atrasado: true,
      quantidadeLabel: '100 kg',
      proximaData: '2026-08-20',
    });

    expect(badge).toEqual({
      tone: 'danger',
      texto: 'Atrasado',
      detalhe: '100 kg',
      ariaSuffix: '100 kg atrasados',
    });
  });

  it('marca a chegar em accent com data dd/MM no detalhe', () => {
    const badge = formatPipelineBadge({
      atrasado: false,
      quantidadeLabel: '100 kg',
      proximaData: '2026-09-01',
    });

    expect(badge).toEqual({
      tone: 'accent',
      texto: 'A chegar',
      detalhe: '100 kg · 01/09',
      ariaSuffix: '100 kg a chegar em 01/09',
    });
  });

  it('omite data quando a chegar sem proximaData', () => {
    const badge = formatPipelineBadge({
      atrasado: false,
      quantidadeLabel: '12 kg',
      proximaData: null,
    });

    expect(badge).toEqual({
      tone: 'accent',
      texto: 'A chegar',
      detalhe: '12 kg',
      ariaSuffix: '12 kg a chegar',
    });
  });
});
