import {
  insumoConsumoRepository,
  type InsumoConsumoRepository,
} from '@/data/insumos/InsumoConsumoRepository';
import {
  insumoDistribuidorRepository,
  type InsumoDistribuidorRepository,
} from '@/data/insumos/InsumoDistribuidorRepository';
import {
  insumoEstoqueRepository,
  type InsumoEstoqueRepository,
} from '@/data/insumos/InsumoEstoqueRepository';
import {
  insumoRegraCompraRepository,
  type InsumoRegraCompraComInsumo,
  type InsumoRegraCompraRepository,
} from '@/data/insumos/InsumoRegraCompraRepository';
import {
  insumoCompraSugestaoCalculator,
  type InsumoCompraSugestaoCalculator,
} from '@/domain/insumos/insumo-compra-sugestao-calculator';
import { insumoCompraDiaOperacional } from '@/domain/insumos/insumo-compra-dia-operacional';
import type { InsumoCompraSugestaoStatus } from '@/domain/insumos/insumo-compra-sugestao-types';
import {
  insumoConsumoCoberturaCalculator,
  type InsumoConsumoCoberturaCalculator,
} from '@/domain/insumos/insumo-consumo-cobertura-calculator';
import type { InsumoConsumoSemanalItem } from '@/domain/insumos/insumo-consumo-semanal-aggregator';
import {
  insumoConsumoSemanalPeriodoBuilder,
  type InsumoConsumoSemanalPeriodoBuilder,
} from '@/domain/insumos/insumo-consumo-semanal-periodo';
import {
  insumoControleEstoqueFilter,
  type InsumoControleEstoqueFilter,
} from '@/domain/insumos/insumo-controle-estoque-filter';
import type { InsumoDistribuidorRow } from '@/domain/types/insumo-compra-db';
import type { InsumoConversaoVisual } from '@/domain/types/insumo-estoque';

export type InsumoCompraSugestaoLinha = {
  insumoId: string;
  nome: string;
  unidade: string;
  conversao: InsumoConversaoVisual | null;
  estoque: number;
  consumoDiario: number;
  coberturaAtualDias: number | null;
  leadTimeDias: number;
  quantidadeSugerida: number | null;
  status: InsumoCompraSugestaoStatus;
  motivo: string;
  distribuidorPreferencial: string | null;
  distribuidoresAlternativos: string[];
};

export type InsumoCompraSugestaoPageData = {
  dataReferencia: string;
  resumo: {
    urgentes: number;
    pedirHoje: number;
    foraJanela: number;
    adiarMin: number;
  };
  itens: InsumoCompraSugestaoLinha[];
  gruposPorFornecedor: Array<{
    fornecedor: string;
    itens: InsumoCompraSugestaoLinha[];
  }>;
};

type ServiceDependencies = {
  consumoRepository: Pick<InsumoConsumoRepository, 'listConsumoSemanal'>;
  regraRepository: Pick<InsumoRegraCompraRepository, 'listAllWithInsumo'>;
  estoqueRepository: Pick<InsumoEstoqueRepository, 'listQuantidadesByInsumoIds'>;
  distribuidorRepository: Pick<InsumoDistribuidorRepository, 'listByInsumoIds'>;
  periodoBuilder: Pick<InsumoConsumoSemanalPeriodoBuilder, 'buildDefault'>;
  coberturaCalculator: Pick<InsumoConsumoCoberturaCalculator, 'calculate'>;
  sugestaoCalculator: Pick<InsumoCompraSugestaoCalculator, 'calculate'>;
  controleEstoqueFilter: Pick<InsumoControleEstoqueFilter, 'filterPorNomeControlavel'>;
};

type InsumoFonte = {
  insumoId: string;
  nome: string;
  unidade: string;
  conversao: InsumoConversaoVisual | null;
  consumo: InsumoConsumoSemanalItem | null;
  regra: InsumoRegraCompraComInsumo | null;
};

const STATUS_PRIORITY: Record<InsumoCompraSugestaoStatus, number> = {
  urgente: 0,
  pedir_fora_janela: 1,
  pedir_hoje: 2,
  adiar_lote_minimo: 3,
  sem_consumo: 4,
  ok: 5,
  sem_regra: 6,
};

const DEFAULT_DEPENDENCIES: ServiceDependencies = {
  consumoRepository: insumoConsumoRepository,
  regraRepository: insumoRegraCompraRepository,
  estoqueRepository: insumoEstoqueRepository,
  distribuidorRepository: insumoDistribuidorRepository,
  periodoBuilder: insumoConsumoSemanalPeriodoBuilder,
  coberturaCalculator: insumoConsumoCoberturaCalculator,
  sugestaoCalculator: insumoCompraSugestaoCalculator,
  controleEstoqueFilter: insumoControleEstoqueFilter,
};

export class InsumoCompraDataReferenciaResolver {
  resolve(dataReferencia?: string): { isoDate: string; anchor: Date; dayOfWeek: number } {
    const isoDate = this.isValidIsoDate(dataReferencia)
      ? dataReferencia
      : this.toSaoPauloIsoDate(new Date());
    const anchor = new Date(`${isoDate}T12:00:00-03:00`);

    return { isoDate, anchor, dayOfWeek: anchor.getUTCDay() };
  }

  private isValidIsoDate(value?: string): value is string {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }

  private toSaoPauloIsoDate(date: Date): string {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
    const valueByType = new Map(parts.map((part) => [part.type, part.value]));
    return `${valueByType.get('year')}-${valueByType.get('month')}-${valueByType.get('day')}`;
  }
}

export class InsumoCompraSugestaoService {
  private readonly dependencies: ServiceDependencies;

  constructor(
    dependencies: Partial<ServiceDependencies> = {},
    private readonly dataReferenciaResolver = new InsumoCompraDataReferenciaResolver(),
  ) {
    this.dependencies = { ...DEFAULT_DEPENDENCIES, ...dependencies };
  }

  async buildPageData(dataReferencia?: string): Promise<InsumoCompraSugestaoPageData> {
    const referencia = this.dataReferenciaResolver.resolve(dataReferencia);
    const periodo = this.dependencies.periodoBuilder.buildDefault(referencia.anchor, 'semanal');
    const [consumosBrutos, regrasBrutas] = await Promise.all([
      this.dependencies.consumoRepository.listConsumoSemanal(periodo),
      this.dependencies.regraRepository.listAllWithInsumo(),
    ]);
    const fontes = this.createFontes(consumosBrutos, regrasBrutas);
    const insumoIds = fontes.map((fonte) => fonte.insumoId);
    const [estoques, distribuidores] = await Promise.all([
      this.dependencies.estoqueRepository.listQuantidadesByInsumoIds(insumoIds),
      this.dependencies.distribuidorRepository.listByInsumoIds(insumoIds),
    ]);
    const distribuidoresByInsumo = this.groupDistribuidores(distribuidores);
    const itens = fontes
      .map((fonte) =>
        this.createLinha(
          fonte,
          estoques.get(fonte.insumoId) ?? 0,
          distribuidoresByInsumo.get(fonte.insumoId) ?? [],
          periodo.colunas.map((coluna) => coluna.inicio),
          referencia.dayOfWeek,
          referencia.isoDate,
        ),
      )
      .sort((left, right) => this.compareLinhas(left, right));

    return {
      dataReferencia: referencia.isoDate,
      resumo: this.createResumo(itens),
      itens,
      gruposPorFornecedor: this.createGruposPorFornecedor(itens),
    };
  }

  private createFontes(
    consumosBrutos: InsumoConsumoSemanalItem[],
    regrasBrutas: InsumoRegraCompraComInsumo[],
  ): InsumoFonte[] {
    const consumos = this.dependencies.controleEstoqueFilter.filterPorNomeControlavel(consumosBrutos);
    const regras = this.dependencies.controleEstoqueFilter.filterPorNomeControlavel(
      regrasBrutas.filter((regra) => regra.ativo),
    );
    const fontesById = new Map<string, InsumoFonte>();

    for (const consumo of consumos) {
      fontesById.set(consumo.insumoId, {
        insumoId: consumo.insumoId,
        nome: consumo.nome,
        unidade: consumo.unidadeResumida,
        conversao: consumo.conversao,
        consumo,
        regra: null,
      });
    }
    for (const regra of regras) {
      const fonte = fontesById.get(regra.insumo_id);
      fontesById.set(regra.insumo_id, {
        insumoId: regra.insumo_id,
        nome: fonte?.nome || regra.nome,
        unidade: fonte?.unidade || regra.unidade,
        conversao: fonte?.conversao ?? regra.conversao,
        consumo: fonte?.consumo ?? null,
        regra,
      });
    }

    return [...fontesById.values()];
  }

  private createLinha(
    fonte: InsumoFonte,
    estoque: number,
    distribuidores: InsumoDistribuidorRow[],
    colunas: string[],
    dayOfWeek: number,
    dataReferencia: string,
  ): InsumoCompraSugestaoLinha {
    const coberturaConsumo = this.dependencies.coberturaCalculator.calculate({
      visualizacao: 'semanal',
      estoqueAtual: estoque,
      consumos: colunas.map((coluna) => fonte.consumo?.consumoPorSemana[coluna] ?? 0),
    });
    const consumoDiario = insumoCompraDiaOperacional.consumoDiaUtil(coberturaConsumo.media);
    const regra = fonte.regra;
    const sugestao = this.dependencies.sugestaoCalculator.calculate({
      estoque,
      consumoDiario,
      leadTimeDias: regra?.lead_time_dias ?? 0,
      quantidadeMinima: regra?.quantidade_minima ?? null,
      quantidadeMaxima: regra?.quantidade_maxima ?? null,
      janelaTipo: regra?.janela_tipo ?? 'qualquer',
      diasSemana: regra?.dias_semana ?? null,
      dayOfWeek,
      temRegraAtiva: regra !== null,
      dataReferencia,
      recebimentos: [],
    });
    const distribuidoresOrdenados = [...distribuidores].sort(
      (left, right) => left.ordem - right.ordem,
    );
    const preferencial = distribuidoresOrdenados.find((item) => item.preferencial);

    return {
      insumoId: fonte.insumoId,
      nome: fonte.nome,
      unidade: fonte.unidade,
      conversao: fonte.conversao,
      estoque,
      consumoDiario,
      coberturaAtualDias: sugestao.coberturaAtualDias,
      leadTimeDias: regra?.lead_time_dias ?? 0,
      quantidadeSugerida: sugestao.quantidadeSugerida,
      status: sugestao.status,
      motivo: sugestao.motivo,
      distribuidorPreferencial: preferencial?.nome ?? null,
      distribuidoresAlternativos: distribuidoresOrdenados
        .filter((item) => item.id !== preferencial?.id)
        .map((item) => item.nome),
    };
  }

  private compareLinhas(
    left: InsumoCompraSugestaoLinha,
    right: InsumoCompraSugestaoLinha,
  ): number {
    return (
      STATUS_PRIORITY[left.status] - STATUS_PRIORITY[right.status] ||
      left.nome.localeCompare(right.nome, 'pt-BR')
    );
  }

  private groupDistribuidores(
    distribuidores: InsumoDistribuidorRow[],
  ): Map<string, InsumoDistribuidorRow[]> {
    const groups = new Map<string, InsumoDistribuidorRow[]>();
    for (const distribuidor of distribuidores) {
      groups.set(distribuidor.insumo_id, [
        ...(groups.get(distribuidor.insumo_id) ?? []),
        distribuidor,
      ]);
    }
    return groups;
  }

  private createResumo(itens: InsumoCompraSugestaoLinha[]): InsumoCompraSugestaoPageData['resumo'] {
    return {
      urgentes: itens.filter((item) => item.status === 'urgente').length,
      pedirHoje: itens.filter((item) => item.status === 'pedir_hoje').length,
      foraJanela: itens.filter((item) => item.status === 'pedir_fora_janela').length,
      adiarMin: itens.filter((item) => item.status === 'adiar_lote_minimo').length,
    };
  }

  private createGruposPorFornecedor(
    itens: InsumoCompraSugestaoLinha[],
  ): InsumoCompraSugestaoPageData['gruposPorFornecedor'] {
    const groups = new Map<string, InsumoCompraSugestaoLinha[]>();
    for (const item of itens) {
      const fornecedor = item.distribuidorPreferencial ?? 'Sem fornecedor';
      groups.set(fornecedor, [...(groups.get(fornecedor) ?? []), item]);
    }
    return [...groups].map(([fornecedor, itensDoFornecedor]) => ({
      fornecedor,
      itens: itensDoFornecedor,
    }));
  }
}

export const insumoCompraSugestaoService = new InsumoCompraSugestaoService();
