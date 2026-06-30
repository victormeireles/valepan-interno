import { insumoEstoqueRepository, InsumoEstoqueRepository } from '@/data/insumos/InsumoEstoqueRepository';
import type { InsumoMovimentoOrigem } from '@/domain/types/insumo-estoque';

type RegistrarEntradaInput = {
  insumoId: string;
  empresaId: string;
  quantidadeEntrada: number;
  custoUnitario: number;
  origem: 'entrada_nf' | 'resolucao_pendencia';
  omieNIdReceb: number;
  omieNIdItem: number;
  omieWebhookEventoId?: string;
  pendenciaId?: string;
  numeroNf?: string | null;
};

type AjustarSaldoInput = {
  insumoId: string;
  novoSaldo: number;
  observacao: string;
};

type AplicarDeltaInput = {
  insumoId: string;
  delta: number;
  origem: InsumoMovimentoOrigem;
  fermentacaoLoteId?: string | null;
  observacao?: string | null;
};

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message: string }).message === 'string' &&
    ((error as { message: string }).message.includes('duplicate key') ||
      (error as { code?: string }).code === '23505')
  );
}

export class InsumoEstoqueService {
  constructor(
    private readonly repository: InsumoEstoqueRepository = insumoEstoqueRepository,
  ) {}

  async registrarEntrada(input: RegistrarEntradaInput): Promise<void> {
    if (input.origem === 'entrada_nf') {
      const jaExiste = await this.repository.movimentoEntradaJaExiste(
        input.empresaId,
        input.omieNIdReceb,
        input.omieNIdItem,
      );
      if (jaExiste) {
        return;
      }
    }

    const saldoAtual = await this.repository.findSaldo(input.insumoId);
    const quantidadeAtual = Number(saldoAtual?.quantidade ?? 0);
    const novoSaldo = quantidadeAtual + input.quantidadeEntrada;

    await this.repository.upsertSaldo(input.insumoId, novoSaldo);

    try {
      await this.repository.insertMovimento({
        insumoId: input.insumoId,
        empresaId: input.empresaId,
        deltaQuantidade: input.quantidadeEntrada,
        saldoResultante: novoSaldo,
        custoUnitario: input.custoUnitario,
        origem: input.origem,
        omieNIdReceb: input.omieNIdReceb,
        omieNIdItem: input.omieNIdItem,
        omieWebhookEventoId: input.omieWebhookEventoId,
        pendenciaId: input.pendenciaId,
        numeroNf: input.numeroNf ?? null,
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        return;
      }
      throw error;
    }

    await this.repository.updateInsumoCustoUnitario(input.insumoId, input.custoUnitario);
  }

  async ajustarSaldo(input: AjustarSaldoInput): Promise<void> {
    const saldoAtual = await this.repository.findSaldo(input.insumoId);
    const quantidadeAtual = Number(saldoAtual?.quantidade ?? 0);
    const delta = input.novoSaldo - quantidadeAtual;

    if (delta === 0) {
      return;
    }

    const custoAtual = await this.repository.findInsumoCustoUnitario(input.insumoId);

    await this.repository.upsertSaldo(input.insumoId, input.novoSaldo);
    await this.repository.insertMovimento({
      insumoId: input.insumoId,
      deltaQuantidade: delta,
      saldoResultante: input.novoSaldo,
      custoUnitario: custoAtual,
      origem: 'ajuste_manual',
      observacao: input.observacao,
    });
  }

  async aplicarDelta(input: AplicarDeltaInput): Promise<void> {
    if (input.delta === 0) return;

    const saldoAtual = await this.repository.findSaldo(input.insumoId);
    const quantidadeAtual = Number(saldoAtual?.quantidade ?? 0);
    const novoSaldo = quantidadeAtual + input.delta;
    const custoAtual = await this.repository.findInsumoCustoUnitario(input.insumoId);

    await this.repository.upsertSaldo(input.insumoId, novoSaldo);
    await this.repository.insertMovimento({
      insumoId: input.insumoId,
      deltaQuantidade: input.delta,
      saldoResultante: novoSaldo,
      custoUnitario: custoAtual,
      origem: input.origem,
      fermentacaoLoteId: input.fermentacaoLoteId ?? null,
      observacao: input.observacao ?? null,
    });
  }
}

export const insumoEstoqueService = new InsumoEstoqueService();
