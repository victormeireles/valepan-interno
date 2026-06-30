import type { InsumoPendenciaComEmpresa } from '@/domain/types/insumo-estoque-db';
import {
  detectIgnorarKeyword,
  insumoFuzzyMatcher,
} from '@/domain/insumos/insumo-fuzzy-matcher';
import type {
  InsumoCatalogoItem,
  InsumoVinculoSugestaoDetalhe,
  InsumoVinculoSugestaoGrupo,
  InsumoVinculoSugestaoResultado,
  InsumoVinculoSugestaoResumo,
} from '@/domain/insumos/insumo-vinculo-sugestao';
import { insumoMapeamentoRepository } from '@/data/insumos/InsumoMapeamentoRepository';
import { insumoPendenciaRepository } from '@/data/insumos/InsumoPendenciaRepository';
import { getInsumos } from '@/app/actions/insumos-actions';
import { insumoVinculoIaClient } from '@/lib/services/insumo-vinculo-ia-client';

const FUZZY_AUTO_THRESHOLD = 0.82;
const IA_BATCH_SIZE = 15;

type GrupoPendencia = {
  empresaId: string;
  empresaNome: string;
  omieIdProduto: number;
  descricaoOmie: string;
  omieCodigoProduto: string | null;
  unidadeNf: string | null;
  fornecedorRazaoSocial: string | null;
  fornecedorNome: string | null;
  naturezaOperacao: string | null;
  cfopEntrada: string | null;
  ncmProduto: string | null;
  pendenciaIds: string[];
};

function contextoClassificacaoGrupo(grupo: GrupoPendencia) {
  return {
    descricao: grupo.descricaoOmie,
    fornecedorRazaoSocial: grupo.fornecedorRazaoSocial,
    fornecedorNome: grupo.fornecedorNome,
    naturezaOperacao: grupo.naturezaOperacao,
    cfopEntrada: grupo.cfopEntrada,
  };
}

function groupPendencias(items: InsumoPendenciaComEmpresa[]): GrupoPendencia[] {
  const map = new Map<string, GrupoPendencia>();

  for (const item of items) {
    const key = `${item.empresa_id}:${item.omie_id_produto}`;
    const existing = map.get(key);
    if (existing) {
      existing.pendenciaIds.push(item.id);
      continue;
    }

    map.set(key, {
      empresaId: item.empresa_id,
      empresaNome: item.empresaNome,
      omieIdProduto: item.omie_id_produto,
      descricaoOmie: item.descricao_produto?.trim() || 'Sem descrição',
      omieCodigoProduto: item.omie_codigo_produto,
      unidadeNf: item.unidade_nf,
      fornecedorRazaoSocial: item.fornecedor_razao_social,
      fornecedorNome: item.fornecedor_nome,
      naturezaOperacao: item.natureza_operacao,
      cfopEntrada: item.cfop_entrada,
      ncmProduto: item.ncm_produto,
      pendenciaIds: [item.id],
    });
  }

  return [...map.values()];
}

function buildResumo(grupos: InsumoVinculoSugestaoGrupo[]): InsumoVinculoSugestaoResumo {
  return grupos.reduce(
    (acc, grupo) => {
      if (grupo.sugestao.acao === 'vincular') acc.vincular += 1;
      else if (grupo.sugestao.acao === 'ignorar') acc.ignorar += 1;
      else if (grupo.sugestao.fonte === 'nenhuma') acc.semSugestao += 1;
      else acc.revisar += 1;
      return acc;
    },
    { vincular: 0, ignorar: 0, revisar: 0, semSugestao: 0 },
  );
}

function toGrupo(
  grupo: GrupoPendencia,
  sugestao: InsumoVinculoSugestaoDetalhe,
): InsumoVinculoSugestaoGrupo {
  return {
    chave: { empresaId: grupo.empresaId, omieIdProduto: grupo.omieIdProduto },
    empresaNome: grupo.empresaNome,
    descricaoOmie: grupo.descricaoOmie,
    omieCodigoProduto: grupo.omieCodigoProduto,
    unidadeNf: grupo.unidadeNf,
    fornecedorRazaoSocial: grupo.fornecedorRazaoSocial,
    fornecedorNome: grupo.fornecedorNome,
    cfopEntrada: grupo.cfopEntrada,
    pendenciaIds: grupo.pendenciaIds,
    pendenciaCount: grupo.pendenciaIds.length,
    sugestao,
  };
}

async function loadCatalogo(): Promise<InsumoCatalogoItem[]> {
  const insumos = await getInsumos(false);
  return insumos.map((insumo) => ({
    id: insumo.id,
    nome: insumo.nome,
    unidadeCodigo: insumo.unidades?.codigo ?? '',
    unidadeNome: insumo.unidades?.nome_resumido ?? insumo.unidades?.nome ?? '',
    custoUnitario: insumo.custo_unitario,
  }));
}

export class InsumoVinculoSugestaoService {
  async gerarSugestoes(): Promise<InsumoVinculoSugestaoResultado> {
    const [pendencias, catalogo, mapeamentos] = await Promise.all([
      insumoPendenciaRepository.listPendentes(),
      loadCatalogo(),
      insumoMapeamentoRepository.listAtivos(20),
    ]);

    const grupos = groupPendencias(pendencias);
    const catalogoById = new Map(catalogo.map((item) => [item.id, item]));
    const resultado: InsumoVinculoSugestaoGrupo[] = [];
    const pendentesIa: GrupoPendencia[] = [];

    for (const grupo of grupos) {
      const mapeamento = await insumoMapeamentoRepository.findByEmpresaProduto(
        grupo.empresaId,
        grupo.omieIdProduto,
      );

      if (mapeamento) {
        const insumo = catalogoById.get(mapeamento.insumo_id);
        resultado.push(
          toGrupo(grupo, {
            acao: 'vincular',
            insumoId: mapeamento.insumo_id,
            insumoNome: insumo?.nome ?? 'Insumo vinculado',
            fatorConversao: Number(mapeamento.fator_conversao),
            confianca: 100,
            motivo: 'Vínculo Omie já cadastrado',
            fonte: 'mapeamento_existente',
          }),
        );
        continue;
      }

      const ignorar = detectIgnorarKeyword(contextoClassificacaoGrupo(grupo));
      if (ignorar) {
        resultado.push(
          toGrupo(grupo, {
            acao: 'ignorar',
            insumoId: null,
            insumoNome: null,
            fatorConversao: null,
            confianca: ignorar.confianca,
            motivo: ignorar.motivo,
            fonte: 'keyword_ignorar',
          }),
        );
        continue;
      }

      const fuzzy = insumoFuzzyMatcher.findBestMatch(
        grupo.descricaoOmie,
        grupo.unidadeNf,
        catalogo,
      );
      if (fuzzy && fuzzy.score >= FUZZY_AUTO_THRESHOLD) {
        resultado.push(
          toGrupo(grupo, {
            acao: 'vincular',
            insumoId: fuzzy.insumoId,
            insumoNome: fuzzy.insumoNome,
            fatorConversao: fuzzy.fatorConversao,
            confianca: Math.round(fuzzy.score * 100),
            motivo: `Match por similaridade de nome (${Math.round(fuzzy.score * 100)}%)`,
            fonte: 'fuzzy',
          }),
        );
        continue;
      }

      pendentesIa.push(grupo);
    }

    if (pendentesIa.length > 0 && insumoVinculoIaClient.isConfigured()) {
      const exemplos = mapeamentos
        .filter((item) => item.descricao_omie)
        .slice(0, 10)
        .map((item) => {
          const insumo = catalogoById.get(item.insumo_id);
          return {
            descricaoOmie: item.descricao_omie ?? '',
            insumoNome: insumo?.nome ?? 'Insumo',
            fatorConversao: Number(item.fator_conversao),
          };
        });

      for (let index = 0; index < pendentesIa.length; index += IA_BATCH_SIZE) {
        const lote = pendentesIa.slice(index, index + IA_BATCH_SIZE);
        const iaSugestoes = await insumoVinculoIaClient.sugerirLote({
          grupos: lote.map((grupo) => ({
            omieIdProduto: grupo.omieIdProduto,
            descricaoOmie: grupo.descricaoOmie,
            unidadeNf: grupo.unidadeNf,
            omieCodigoProduto: grupo.omieCodigoProduto,
            fornecedorRazaoSocial: grupo.fornecedorRazaoSocial,
            fornecedorNome: grupo.fornecedorNome,
            naturezaOperacao: grupo.naturezaOperacao,
            cfopEntrada: grupo.cfopEntrada,
            ncmProduto: grupo.ncmProduto,
          })),
          catalogo,
          exemplos,
        });

        const iaByProduto = new Map(
          iaSugestoes.map((item) => [item.omieIdProduto, item]),
        );

        for (const grupo of lote) {
          const ia = iaByProduto.get(grupo.omieIdProduto);
          if (!ia) {
            resultado.push(
              toGrupo(grupo, {
                acao: 'revisar',
                insumoId: null,
                insumoNome: null,
                fatorConversao: null,
                confianca: 0,
                motivo: 'IA não retornou sugestão para este produto',
                fonte: 'nenhuma',
              }),
            );
            continue;
          }

          const insumo = ia.insumoId ? catalogoById.get(ia.insumoId) : null;
          resultado.push(
            toGrupo(grupo, {
              acao: ia.acao,
              insumoId: ia.insumoId,
              insumoNome: insumo?.nome ?? null,
              fatorConversao: ia.fatorConversao,
              confianca: ia.confianca,
              motivo: ia.motivo,
              fonte: 'ia',
            }),
          );
        }
      }
    } else {
      for (const grupo of pendentesIa) {
        const fuzzy = insumoFuzzyMatcher.findBestMatch(
          grupo.descricaoOmie,
          grupo.unidadeNf,
          catalogo,
        );

        resultado.push(
          toGrupo(grupo, {
            acao: fuzzy ? 'revisar' : 'revisar',
            insumoId: fuzzy?.insumoId ?? null,
            insumoNome: fuzzy?.insumoNome ?? null,
            fatorConversao: fuzzy?.fatorConversao ?? null,
            confianca: fuzzy ? Math.round(fuzzy.score * 100) : 0,
            motivo: insumoVinculoIaClient.isConfigured()
              ? 'Sem sugestão automática'
              : 'IA não configurada — revise manualmente',
            fonte: fuzzy ? 'fuzzy' : 'nenhuma',
          }),
        );
      }
    }

    resultado.sort((a, b) => b.sugestao.confianca - a.sugestao.confianca);

    const pendenciasAfetadas = resultado.reduce(
      (sum, grupo) => sum + grupo.pendenciaCount,
      0,
    );

    return {
      grupos: resultado,
      resumo: buildResumo(resultado),
      produtosUnicos: resultado.length,
      pendenciasAfetadas,
    };
  }
}

export const insumoVinculoSugestaoService = new InsumoVinculoSugestaoService();
