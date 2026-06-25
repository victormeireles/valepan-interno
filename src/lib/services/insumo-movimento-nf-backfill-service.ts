import {
  insumoEstoqueRepository,
  InsumoEstoqueRepository,
} from '@/data/insumos/InsumoEstoqueRepository';
import {
  omieWebhookEventoRepository,
  OmieWebhookEventoRepository,
  type EmpresaCredenciaisRow,
} from '@/data/omie/OmieWebhookEventoRepository';
import {
  omieRecebimentoClient,
  OmieRecebimentoClient,
} from '@/lib/clients/omie-recebimento-client';

export type InsumoMovimentoNfBackfillDeps = {
  estoqueRepository: InsumoEstoqueRepository;
  empresaRepository: OmieWebhookEventoRepository;
  recebimentoClient: OmieRecebimentoClient;
};

export type InsumoMovimentoNfBackfillResultado = {
  recebimentosConsultados: number;
  movimentosAtualizados: number;
  semNumero: number;
  semCredencial: number;
  erros: number;
};

type EntradaSemNumero = { id: string; empresaId: string | null; nIdReceb: number };

export class InsumoMovimentoNfBackfillService {
  constructor(private readonly deps: InsumoMovimentoNfBackfillDeps) {}

  async backfill(options: { dryRun: boolean }): Promise<InsumoMovimentoNfBackfillResultado> {
    const entradas = await this.deps.estoqueRepository.listEntradasNfSemNumero();
    const porEmpresa = this.agruparPorEmpresaERecebimento(entradas);
    const empresas = await this.carregarEmpresas();

    const resultado: InsumoMovimentoNfBackfillResultado = {
      recebimentosConsultados: 0,
      movimentosAtualizados: 0,
      semNumero: 0,
      semCredencial: 0,
      erros: 0,
    };

    for (const [empresaId, recebimentos] of porEmpresa) {
      const credenciais = empresaId ? empresas.get(empresaId) : undefined;
      if (!credenciais) {
        resultado.semCredencial += [...recebimentos.values()].reduce((s, ids) => s + ids.length, 0);
        continue;
      }

      for (const [nIdReceb, ids] of recebimentos) {
        await this.processarRecebimento(credenciais, nIdReceb, ids, options.dryRun, resultado);
      }
    }

    return resultado;
  }

  private async processarRecebimento(
    credenciais: EmpresaCredenciaisRow,
    nIdReceb: number,
    ids: string[],
    dryRun: boolean,
    resultado: InsumoMovimentoNfBackfillResultado,
  ): Promise<void> {
    resultado.recebimentosConsultados += 1;
    try {
      const recebimento = await this.deps.recebimentoClient.consultarRecebimento({
        appKey: credenciais.app_key,
        appSecret: credenciais.app_secret,
        nIdReceb,
      });
      const numeroNf = recebimento.cabec?.cNumeroNF?.trim();

      if (!numeroNf) {
        resultado.semNumero += ids.length;
        return;
      }

      if (!dryRun) {
        await this.deps.estoqueRepository.setNumeroNfPorIds(ids, numeroNf);
      }
      resultado.movimentosAtualizados += ids.length;
    } catch {
      resultado.erros += 1;
    }
  }

  private agruparPorEmpresaERecebimento(
    entradas: EntradaSemNumero[],
  ): Map<string | null, Map<number, string[]>> {
    const mapa = new Map<string | null, Map<number, string[]>>();
    for (const entrada of entradas) {
      const recebimentos = mapa.get(entrada.empresaId) ?? new Map<number, string[]>();
      const ids = recebimentos.get(entrada.nIdReceb) ?? [];
      ids.push(entrada.id);
      recebimentos.set(entrada.nIdReceb, ids);
      mapa.set(entrada.empresaId, recebimentos);
    }
    return mapa;
  }

  private async carregarEmpresas(): Promise<Map<string, EmpresaCredenciaisRow>> {
    const empresas = await this.deps.empresaRepository.listEmpresas();
    return new Map(empresas.map((empresa) => [empresa.id, empresa]));
  }
}

export const insumoMovimentoNfBackfillService = new InsumoMovimentoNfBackfillService({
  estoqueRepository: insumoEstoqueRepository,
  empresaRepository: omieWebhookEventoRepository,
  recebimentoClient: omieRecebimentoClient,
});
