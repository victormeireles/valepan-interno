import type { InsumoCatalogoItem } from '@/domain/insumos/insumo-vinculo-sugestao';

type IaGrupoInput = {
  omieIdProduto: number;
  descricaoOmie: string;
  unidadeNf: string | null;
  omieCodigoProduto: string | null;
  fornecedorRazaoSocial?: string | null;
  fornecedorNome?: string | null;
  naturezaOperacao?: string | null;
  cfopEntrada?: string | null;
  ncmProduto?: string | null;
};

export type IaSugestaoItem = {
  omieIdProduto: number;
  acao: 'vincular' | 'ignorar' | 'revisar';
  insumoId: string | null;
  fatorConversao: number | null;
  confianca: number;
  motivo: string;
};

type OpenAiConfig = {
  apiKey: string;
  model: string;
  debug: boolean;
};

function readOpenAiConfig(): OpenAiConfig | null {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  return {
    apiKey,
    model: process.env.OPENAI_PEDIDO_IA_MODEL?.trim() || 'gpt-4o-mini',
    debug: process.env.OPENAI_PEDIDO_IA_DEBUG === 'true',
  };
}

function buildPrompt(
  grupos: IaGrupoInput[],
  catalogo: InsumoCatalogoItem[],
  exemplos: Array<{ descricaoOmie: string; insumoNome: string; fatorConversao: number }>,
): string {
  const catalogoJson = catalogo.map((item) => ({
    id: item.id,
    nome: item.nome,
    unidade: item.unidadeCodigo,
  }));

  const exemplosJson = exemplos.map((item) => ({
    descricao_omie: item.descricaoOmie,
    insumo: item.insumoNome,
    fator: item.fatorConversao,
  }));

  const produtosJson = grupos.map((grupo) => ({
    omie_id_produto: grupo.omieIdProduto,
    descricao: grupo.descricaoOmie,
    unidade_nf: grupo.unidadeNf,
    codigo: grupo.omieCodigoProduto,
    fornecedor_razao_social: grupo.fornecedorRazaoSocial,
    fornecedor_nome: grupo.fornecedorNome,
    natureza_operacao: grupo.naturezaOperacao,
    cfop_entrada: grupo.cfopEntrada,
    ncm: grupo.ncmProduto,
  }));

  return [
    'Você ajuda a vincular produtos de nota fiscal do ERP Omie a insumos de uma fábrica de pães/hambúrgueres.',
    'ESCOPO: controlar APENAS matérias-primas usadas na FABRICAÇÃO (farinha, fermento, água, sal, açúcar, óleo, margarina, melhorador, ovos, sementes, etc.).',
    'Responda APENAS JSON válido no formato:',
    '{"sugestoes":[{"omieIdProduto":123,"acao":"vincular|ignorar|revisar","insumoId":"uuid|null","fatorConversao":number|null,"confianca":0-100,"motivo":"texto curto"}]}',
    'Regras de acao:',
    '- vincular: somente se for claramente matéria-prima de produção E existir match no catálogo',
    '- ignorar (confianca >= 85): limpeza/higiene, EPI, material de escritório, uniforme, ferramentas, peças de manutenção, embalagens de uso interno não produtivo, serviços, frete, locação, mão de obra, taxas',
    '- ignorar exemplos: detergente, desinfetante, luva, máscara, papel A4, caneta, toner, uniforme, vassoura, papel higiênico',
    '- revisar: dúvida real ou item que não se encaixa claramente em matéria-prima nem em ignorar',
    '- fatorConversao: qtd_nf * fator = qtd no insumo; SC/sacola 25KG com insumo em KG → fator 25; UN→UN = 1',
    '- Nunca invente insumoId fora do catálogo',
    '- Use fornecedor_razao_social e fornecedor_nome: ex. "CLEAN MIX"/"HIG E LIMP" → ignorar (limpeza)',
    '- Use cfop_entrada e ncm como pistas adicionais, mas não ignore só por CFOP',
    '- Na dúvida entre vincular e ignorar para item não alimentício de produção, prefira ignorar',
    '',
    `Catálogo de insumos (somente estes podem receber vincular): ${JSON.stringify(catalogoJson)}`,
    `Exemplos de vínculos já feitos: ${JSON.stringify(exemplosJson)}`,
    `Produtos Omie para analisar: ${JSON.stringify(produtosJson)}`,
  ].join('\n');
}

function parseIaResponse(raw: string, validInsumoIds: Set<string>): IaSugestaoItem[] {
  const parsed = JSON.parse(raw) as { sugestoes?: IaSugestaoItem[] };
  if (!Array.isArray(parsed.sugestoes)) return [];

  return parsed.sugestoes
    .filter((item) => Number.isFinite(item.omieIdProduto))
    .map((item) => {
      const confianca = Math.max(0, Math.min(100, Number(item.confianca) || 0));
      const insumoId =
        item.insumoId && validInsumoIds.has(item.insumoId) ? item.insumoId : null;

      let acao = item.acao;
      if (acao === 'vincular' && !insumoId) acao = 'revisar';
      if (confianca < 80 && acao === 'vincular') acao = 'revisar';
      if (confianca < 80 && acao === 'ignorar') acao = 'revisar';

      return {
        omieIdProduto: item.omieIdProduto,
        acao,
        insumoId,
        fatorConversao:
          item.fatorConversao != null && Number(item.fatorConversao) > 0
            ? Number(item.fatorConversao)
            : null,
        confianca,
        motivo: item.motivo?.trim() || 'Sugestão da IA',
      };
    });
}

export class InsumoVinculoIaClient {
  isConfigured(): boolean {
    return Boolean(readOpenAiConfig());
  }

  async sugerirLote(input: {
    grupos: IaGrupoInput[];
    catalogo: InsumoCatalogoItem[];
    exemplos: Array<{ descricaoOmie: string; insumoNome: string; fatorConversao: number }>;
  }): Promise<IaSugestaoItem[]> {
    const config = readOpenAiConfig();
    if (!config) {
      throw new Error('OPENAI_API_KEY não configurada');
    }

    if (input.grupos.length === 0) return [];

    const prompt = buildPrompt(input.grupos, input.catalogo, input.exemplos);
    if (config.debug) {
      console.info('[insumo-vinculo-ia] prompt:', prompt);
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'Você classifica itens de NF para estoque de matérias-primas de panificação industrial. Vincule só ingredientes de produção; sugira ignorar limpeza, EPI, escritório, manutenção e despesas.',
          },
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`OpenAI erro ${response.status}: ${body.slice(0, 200)}`);
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('Resposta vazia da OpenAI');
    }

    if (config.debug) {
      console.info('[insumo-vinculo-ia] response:', content);
    }

    const validIds = new Set(input.catalogo.map((item) => item.id));
    return parseIaResponse(content, validIds);
  }
}

export const insumoVinculoIaClient = new InsumoVinculoIaClient();
