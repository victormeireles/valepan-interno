import type { InsumoCatalogoItem } from '@/domain/insumos/insumo-vinculo-sugestao';

type IaGrupoInput = {
  omieIdProduto: number;
  descricaoOmie: string;
  unidadeNf: string | null;
  omieCodigoProduto: string | null;
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
  }));

  return [
    'Você ajuda a vincular produtos de nota fiscal do ERP Omie a insumos de uma fábrica de pães.',
    'Responda APENAS JSON válido no formato:',
    '{"sugestoes":[{"omieIdProduto":123,"acao":"vincular|ignorar|revisar","insumoId":"uuid|null","fatorConversao":number|null,"confianca":0-100,"motivo":"texto curto"}]}',
    'Regras:',
    '- acao=vincular: escolha insumoId do catálogo e fatorConversao (qtd_nf * fator = qtd no insumo)',
    '- SC/sacola 25KG com insumo em KG → fator 25; UN→UN = 1',
    '- acao=ignorar: serviços, frete, manutenção, locação — não são insumos',
    '- acao=revisar: dúvida real; confianca < 80',
    '- Nunca invente insumoId fora do catálogo',
    '',
    `Catálogo de insumos: ${JSON.stringify(catalogoJson)}`,
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
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'Você é especialista em classificar itens de NF de insumos para panificação industrial no Brasil.',
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
