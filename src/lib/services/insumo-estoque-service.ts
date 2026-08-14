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
  fornoLoteId?: string | null;
  embalagemLoteId?: string | null;
  observacao?: string | null;
  /** Data histórica do movimento (ex.: produzido_em do lote no backfill). */
  createdAt?: string | null;
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

    const custoAtual =
      (await this.repository.findInsumoCustoUnitario(input.insumoId)) ?? 0;

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
    const custoAtual =
      (await this.repository.findInsumoCustoUnitario(input.insumoId)) ?? 0;

    await this.repository.upsertSaldo(input.insumoId, novoSaldo);
    await this.repository.insertMovimento({
      insumoId: input.insumoId,
      deltaQuantidade: input.delta,
      saldoResultante: novoSaldo,
      custoUnitario: custoAtual,
      origem: input.origem,
      fermentacaoLoteId: input.fermentacaoLoteId ?? null,
      fornoLoteId: input.fornoLoteId ?? null,
      embalagemLoteId: input.embalagemLoteId ?? null,
      observacao: input.observacao ?? null,
      createdAt: input.createdAt ?? null,
    });
  }

  /**
   * Aplica vários deltas com poucas queries: 1 leitura de saldos/custos,
   * 1 upsert de saldo por insumo afetado, inserts de movimentos em chunks.
   */
  async aplicarDeltasEmLote(inputs: AplicarDeltaInput[]): Promise<number> {
    const pendentes = inputs.filter((input) => input.delta !== 0);
    if (pendentes.length === 0) return 0;

    const insumoIds = [...new Set(pendentes.map((input) => input.insumoId))];
    const [saldos, custos] = await Promise.all([
      this.repository.listQuantidadesByInsumoIds(insumoIds),
      this.repository.findCustosByInsumoIds(insumoIds),
    ]);

    const saldoCorrente = new Map(saldos);
    for (const insumoId of insumoIds) {
      if (!saldoCorrente.has(insumoId)) saldoCorrente.set(insumoId, 0);
    }

    const movimentos = pendentes.map((input) => {
      const atual = saldoCorrente.get(input.insumoId) ?? 0;
      const novo = atual + input.delta;
      saldoCorrente.set(input.insumoId, novo);
      return {
        insumoId: input.insumoId,
        deltaQuantidade: input.delta,
        saldoResultante: novo,
        custoUnitario: custos.get(input.insumoId) ?? 0,
        origem: input.origem,
        fermentacaoLoteId: input.fermentacaoLoteId ?? null,
        fornoLoteId: input.fornoLoteId ?? null,
        embalagemLoteId: input.embalagemLoteId ?? null,
        observacao: input.observacao ?? null,
        createdAt: input.createdAt ?? null,
      };
    });

    for (const insumoId of insumoIds) {
      await this.repository.upsertSaldo(insumoId, saldoCorrente.get(insumoId) ?? 0);
    }

    const CHUNK = 200;
    for (let offset = 0; offset < movimentos.length; offset += CHUNK) {
      await this.repository.insertMovimentos(movimentos.slice(offset, offset + CHUNK));
    }

    return movimentos.length;
  }
}

export const insumoEstoqueService = new InsumoEstoqueService();
