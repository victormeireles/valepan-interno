import {
  insumoDistribuidorRepository,
  type InsumoDistribuidorInput,
  type InsumoDistribuidorRepository,
} from '@/data/insumos/InsumoDistribuidorRepository';
import {
  insumoRegraCompraRepository,
  type InsumoRegraCompraRepository,
} from '@/data/insumos/InsumoRegraCompraRepository';
import {
  INSUMO_COMPRA_SEED_PLANILHA,
  insumoCompraNomeNormalizer,
  type InsumoCompraSeedRegra,
} from '@/domain/insumos/insumo-compra-seed-planilha';
import type { InsumoCompraJanelaTipo } from '@/domain/insumos/insumo-compra-janela';
import {
  insumoCompraRegraValidator,
  type InsumoCompraRegraDistribuidorInput,
} from '@/domain/insumos/insumo-compra-regra-validator';
import type {
  InsumoDistribuidorRow,
  InsumoRegraCompraRow,
} from '@/domain/types/insumo-compra-db';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';

export type SalvarInsumoCompraRegraInput = {
  insumoId: string;
  leadTimeDias: number;
  janelaTipo: InsumoCompraJanelaTipo;
  diasSemana: number[] | null;
  quantidadeMinima: number | null;
  quantidadeMaxima: number | null;
  ativo: boolean;
  distribuidores: InsumoCompraRegraDistribuidorInput[];
};

export type InsumoCompraRegraConfig = {
  insumoId: string;
  nome: string;
  unidade: string;
  regra: InsumoRegraCompraRow | null;
  distribuidores: InsumoDistribuidorRow[];
};

type InsumoAtivo = { id: string; nome: string; unidade: string };

type InsumoAtivoRow = {
  id: string;
  nome: string;
  unidades: { nome_resumido: string } | { nome_resumido: string }[] | null;
};

type RegraRepository = Pick<
  InsumoRegraCompraRepository,
  'listAllWithInsumo' | 'upsert'
>;

type DistribuidorRepository = Pick<
  InsumoDistribuidorRepository,
  'listByInsumoIds' | 'replaceForInsumo'
>;

export type InsumoCompraRegraManagerDeps = {
  regraRepository: RegraRepository;
  distribuidorRepository: DistribuidorRepository;
  listarInsumosAtivos: (apenasAtivos?: boolean) => Promise<InsumoAtivo[]>;
};

class InsumoCompraInsumoAtivoLoader {
  async load(apenasAtivos = true): Promise<InsumoAtivo[]> {
    let query = supabaseClientFactory
      .createServiceRoleClient()
      .from('insumos')
      .select('id, nome, unidades(nome_resumido)')
      .order('nome');

    if (apenasAtivos) {
      query = query.eq('ativo', true);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Erro ao listar insumos: ${error.message}`);
    }
    return ((data as InsumoAtivoRow[]) ?? []).map((row) => ({
      id: row.id,
      nome: row.nome,
      unidade:
        (Array.isArray(row.unidades)
          ? row.unidades[0]?.nome_resumido
          : row.unidades?.nome_resumido) ?? '',
    }));
  }
}

export class InsumoCompraRegraManager {
  constructor(private readonly deps: InsumoCompraRegraManagerDeps) {}

  async listarRegrasParaConfig(
    options: { incluirInativos?: boolean } = {},
  ): Promise<InsumoCompraRegraConfig[]> {
    const incluirInativos = options.incluirInativos === true;
    const [insumos, regras] = await Promise.all([
      this.deps.listarInsumosAtivos(!incluirInativos),
      this.deps.regraRepository.listAllWithInsumo(),
    ]);
    return this.montarConfigs(insumos, regras);
  }

  async listarRegrasParaInsumos(
    insumos: InsumoAtivo[],
  ): Promise<InsumoCompraRegraConfig[]> {
    const regras = await this.deps.regraRepository.listAllWithInsumo();
    return this.montarConfigs(insumos, regras);
  }

  private async montarConfigs(
    insumos: InsumoAtivo[],
    regras: Awaited<ReturnType<RegraRepository['listAllWithInsumo']>>,
  ): Promise<InsumoCompraRegraConfig[]> {
    const distribuidores = await this.deps.distribuidorRepository.listByInsumoIds(
      insumos.map((insumo) => insumo.id),
    );
    const regrasPorInsumo = new Map(regras.map((regra) => [regra.insumo_id, regra]));
    const distribuidoresPorInsumo = new Map<string, InsumoDistribuidorRow[]>();

    for (const distribuidor of distribuidores) {
      const atuais = distribuidoresPorInsumo.get(distribuidor.insumo_id) ?? [];
      atuais.push(distribuidor);
      distribuidoresPorInsumo.set(distribuidor.insumo_id, atuais);
    }

    return insumos.map((insumo) => ({
      insumoId: insumo.id,
      nome: insumo.nome,
      unidade: insumo.unidade,
      regra: regrasPorInsumo.get(insumo.id) ?? null,
      distribuidores: distribuidoresPorInsumo.get(insumo.id) ?? [],
    }));
  }

  async salvarRegra(input: SalvarInsumoCompraRegraInput): Promise<InsumoRegraCompraRow> {
    this.validate(input);
    const regra = await this.deps.regraRepository.upsert(this.toRegraRow(input));
    await this.deps.distribuidorRepository.replaceForInsumo(
      input.insumoId,
      this.toDistribuidores(input.distribuidores),
    );
    return regra;
  }

  async aplicarSeedPlanilha(
    seed: InsumoCompraSeedRegra[] = INSUMO_COMPRA_SEED_PLANILHA,
  ): Promise<{ atualizados: number; naoEncontrados: string[] }> {
    const insumosAtivos = await this.deps.listarInsumosAtivos();
    const insumosPorNome = new Map(
      insumosAtivos.map((insumo) => [
        insumoCompraNomeNormalizer.normalize(insumo.nome),
        insumo,
      ]),
    );
    const naoEncontrados: string[] = [];
    let atualizados = 0;

    for (const regraSeed of seed) {
      const insumo = insumosPorNome.get(regraSeed.nomeNormalizado);
      if (!insumo) {
        naoEncontrados.push(regraSeed.nome);
        continue;
      }
      await this.salvarRegra(this.toSalvarInput(insumo.id, regraSeed));
      atualizados += 1;
    }

    return { atualizados, naoEncontrados };
  }

  private validate(input: SalvarInsumoCompraRegraInput): void {
    const result = insumoCompraRegraValidator.validate(input);
    if (!result.ok) {
      throw new Error(result.erros.join('\n'));
    }
  }

  private toRegraRow(
    input: SalvarInsumoCompraRegraInput,
  ): Omit<InsumoRegraCompraRow, 'created_at' | 'updated_at'> {
    return {
      insumo_id: input.insumoId,
      lead_time_dias: input.leadTimeDias,
      janela_tipo: input.janelaTipo,
      dias_semana: input.janelaTipo === 'qualquer' ? null : input.diasSemana,
      quantidade_minima: input.quantidadeMinima,
      quantidade_maxima: input.quantidadeMaxima,
      ativo: input.ativo,
    };
  }

  private toDistribuidores(
    distribuidores: InsumoCompraRegraDistribuidorInput[],
  ): InsumoDistribuidorInput[] {
    return distribuidores.map((distribuidor, ordem) => ({
      nome: distribuidor.nome.trim(),
      preferencial: distribuidor.preferencial,
      ordem,
    }));
  }

  private toSalvarInput(
    insumoId: string,
    seed: InsumoCompraSeedRegra,
  ): SalvarInsumoCompraRegraInput {
    return {
      insumoId,
      leadTimeDias: seed.leadTimeDias,
      janelaTipo: seed.janelaTipo,
      diasSemana: seed.diasSemana,
      quantidadeMinima: seed.quantidadeMinima,
      quantidadeMaxima: seed.quantidadeMaxima,
      ativo: true,
      distribuidores: seed.distribuidores,
    };
  }
}

const insumoAtivoLoader = new InsumoCompraInsumoAtivoLoader();

export const insumoCompraRegraManager = new InsumoCompraRegraManager({
  regraRepository: insumoRegraCompraRepository,
  distribuidorRepository: insumoDistribuidorRepository,
  listarInsumosAtivos: (apenasAtivos = true) => insumoAtivoLoader.load(apenasAtivos),
});
