import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EstoqueMovimentoRecord } from '@/domain/types/estoque-db';

const mockFindMovimentoById = vi.fn();
const mockDeleteMovimento = vi.fn();
const mockObterTipoEstoqueCliente = vi.fn();
const mockAplicarDelta = vi.fn();

vi.mock('@/data/estoque/EstoqueRepository', () => ({
  estoqueRepository: {
    findMovimentoById: (...args: unknown[]) => mockFindMovimentoById(...args),
    deleteMovimento: (...args: unknown[]) => mockDeleteMovimento(...args),
  },
}));

vi.mock('@/lib/services/estoque-service', () => ({
  estoqueService: {
    obterTipoEstoqueCliente: (...args: unknown[]) => mockObterTipoEstoqueCliente(...args),
    aplicarDelta: (...args: unknown[]) => mockAplicarDelta(...args),
  },
}));

vi.mock('@/lib/services/estoque-resolver-service', () => ({
  estoqueResolverService: {},
}));

function buildSaidaMovimento(overrides?: Partial<EstoqueMovimentoRecord>): EstoqueMovimentoRecord {
  return {
    id: 'mov-1',
    createdAt: '2026-07-20T12:00:00.000Z',
    tipoEstoqueId: 'tipo-1',
    tipoEstoqueNome: 'Cliente Sem Mapa',
    produtoId: 'produto-1',
    produtoNome: 'Pão Brioche',
    delta: { caixas: -5, pacotes: 0, unidades: 0, kg: 0 },
    saldo: { caixas: 10, pacotes: 0, unidades: 0, kg: 0 },
    origem: 'saida',
    clienteDestino: 'Cliente Sem Mapa',
    ...overrides,
  };
}

describe('SaidaMovimentoService.estornarSaida', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDeleteMovimento.mockResolvedValue(undefined);
    mockAplicarDelta.mockResolvedValue({ movimentoId: 'estorno-1' });
  });

  it('devolve a quantidade ao estoque original quando o cliente não tem tipo de estoque mapeado', async () => {
    const movimento = buildSaidaMovimento();
    mockFindMovimentoById.mockResolvedValue(movimento);
    mockObterTipoEstoqueCliente.mockResolvedValue(null);

    const { saidaMovimentoService } = await import('./saida-movimento-service');

    const result = await saidaMovimentoService.estornarSaida('mov-1');

    expect(result?.id).toBe('mov-1');
    expect(mockAplicarDelta).toHaveBeenCalledWith({
      cliente: 'Cliente Sem Mapa',
      produto: 'Pão Brioche',
      delta: { caixas: 5, pacotes: 0, unidades: 0, kg: 0 },
      allowNegative: true,
      origem: 'saida',
      clienteDestino: 'Cliente Sem Mapa',
    });
    expect(mockDeleteMovimento).toHaveBeenCalledWith('mov-1');
  });

  it('prefere o estoque gravado no movimento original ao mapeamento atual do cliente', async () => {
    const movimento = buildSaidaMovimento({ tipoEstoqueNome: 'Estoque Original' });
    mockFindMovimentoById.mockResolvedValue(movimento);
    mockObterTipoEstoqueCliente.mockResolvedValue('Estoque Atual');

    const { saidaMovimentoService } = await import('./saida-movimento-service');

    await saidaMovimentoService.estornarSaida('mov-1');

    expect(mockAplicarDelta).toHaveBeenCalledWith(
      expect.objectContaining({
        cliente: 'Estoque Original',
      }),
    );
  });
});
