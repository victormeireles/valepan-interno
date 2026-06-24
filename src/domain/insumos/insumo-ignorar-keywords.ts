export type InsumoIgnorarCategoria =
  | 'servico'
  | 'limpeza'
  | 'epi'
  | 'escritorio'
  | 'manutencao';

export type InsumoIgnorarRegra = {
  keyword: string;
  categoria: InsumoIgnorarCategoria;
  confianca: number;
  motivo: string;
};

/** Itens fora do escopo de matérias-primas de fabricação — sugerir ignorar. */
export const INSUMO_IGNORAR_REGRAS: InsumoIgnorarRegra[] = [
  // Serviços e despesas
  { keyword: 'SERVICO', categoria: 'servico', confianca: 90, motivo: 'Serviço — fora do estoque de matérias-primas' },
  { keyword: 'FRETE', categoria: 'servico', confianca: 92, motivo: 'Frete — não é matéria-prima' },
  { keyword: 'MANUTEN', categoria: 'manutencao', confianca: 88, motivo: 'Manutenção — não é matéria-prima' },
  { keyword: 'LOCACAO', categoria: 'servico', confianca: 90, motivo: 'Locação — não é matéria-prima' },
  { keyword: 'MAO DE OBRA', categoria: 'servico', confianca: 92, motivo: 'Mão de obra — não é matéria-prima' },
  { keyword: 'HONORARIO', categoria: 'servico', confianca: 90, motivo: 'Honorário — não é matéria-prima' },
  { keyword: 'TAXA', categoria: 'servico', confianca: 85, motivo: 'Taxa/despesa — não é matéria-prima' },

  // Limpeza e higiene
  { keyword: 'DETERGENTE', categoria: 'limpeza', confianca: 94, motivo: 'Produto de limpeza — não entra na fabricação' },
  { keyword: 'DESINFETANTE', categoria: 'limpeza', confianca: 94, motivo: 'Produto de limpeza — não entra na fabricação' },
  { keyword: 'SANITIZANTE', categoria: 'limpeza', confianca: 94, motivo: 'Produto de limpeza — não entra na fabricação' },
  { keyword: 'LIMPEZA', categoria: 'limpeza', confianca: 90, motivo: 'Material de limpeza — não entra na fabricação' },
  { keyword: 'MULTIUSO', categoria: 'limpeza', confianca: 88, motivo: 'Produto de limpeza — não entra na fabricação' },
  { keyword: 'SABAO', categoria: 'limpeza', confianca: 90, motivo: 'Produto de limpeza — não entra na fabricação' },
  { keyword: 'AGUA SANITARIA', categoria: 'limpeza', confianca: 94, motivo: 'Produto de limpeza — não entra na fabricação' },
  { keyword: 'ALCOOL GEL', categoria: 'limpeza', confianca: 92, motivo: 'Higiene/limpeza — não entra na fabricação' },
  { keyword: 'PAPEL HIGIENICO', categoria: 'limpeza', confianca: 93, motivo: 'Material de higiene — não entra na fabricação' },
  { keyword: 'PAPEL TOALHA', categoria: 'limpeza', confianca: 93, motivo: 'Material de higiene — não entra na fabricação' },
  { keyword: 'SACO LIXO', categoria: 'limpeza', confianca: 90, motivo: 'Material de limpeza — não entra na fabricação' },
  { keyword: 'ESPONJA', categoria: 'limpeza', confianca: 85, motivo: 'Material de limpeza — não entra na fabricação' },
  { keyword: 'VASSOURA', categoria: 'limpeza', confianca: 92, motivo: 'Material de limpeza — não entra na fabricação' },
  { keyword: 'RODO', categoria: 'limpeza', confianca: 88, motivo: 'Material de limpeza — não entra na fabricação' },

  // EPI e segurança
  { keyword: ' EPI', categoria: 'epi', confianca: 95, motivo: 'EPI — não é matéria-prima de fabricação' },
  { keyword: 'LUVA NITRIL', categoria: 'epi', confianca: 93, motivo: 'EPI — não é matéria-prima de fabricação' },
  { keyword: 'LUVA LATEX', categoria: 'epi', confianca: 93, motivo: 'EPI — não é matéria-prima de fabricação' },
  { keyword: 'LUVA VAQUETA', categoria: 'epi', confianca: 93, motivo: 'EPI — não é matéria-prima de fabricação' },
  { keyword: 'LUVA DESCARTAVEL', categoria: 'epi', confianca: 90, motivo: 'EPI — não é matéria-prima de fabricação' },
  { keyword: 'MASCARA', categoria: 'epi', confianca: 88, motivo: 'EPI — não é matéria-prima de fabricação' },
  { keyword: 'RESPIRADOR', categoria: 'epi', confianca: 92, motivo: 'EPI — não é matéria-prima de fabricação' },
  { keyword: 'OCULOS', categoria: 'epi', confianca: 85, motivo: 'EPI — não é matéria-prima de fabricação' },
  { keyword: 'PROTETOR AURICULAR', categoria: 'epi', confianca: 93, motivo: 'EPI — não é matéria-prima de fabricação' },
  { keyword: 'PROTETOR FACIAL', categoria: 'epi', confianca: 92, motivo: 'EPI — não é matéria-prima de fabricação' },
  { keyword: 'CAPACETE', categoria: 'epi', confianca: 92, motivo: 'EPI — não é matéria-prima de fabricação' },
  { keyword: 'BOTINA', categoria: 'epi', confianca: 88, motivo: 'EPI/vestuário — não é matéria-prima de fabricação' },
  { keyword: 'BOTA SEGURANCA', categoria: 'epi', confianca: 92, motivo: 'EPI — não é matéria-prima de fabricação' },
  { keyword: 'UNIFORME', categoria: 'epi', confianca: 90, motivo: 'Vestuário — não é matéria-prima de fabricação' },
  { keyword: 'AVENTAL DESCARTAVEL', categoria: 'epi', confianca: 88, motivo: 'EPI — não é matéria-prima de fabricação' },

  // Material de escritório
  { keyword: 'PAPEL A4', categoria: 'escritorio', confianca: 94, motivo: 'Material de escritório — não entra na fabricação' },
  { keyword: 'PAPEL SULFITE', categoria: 'escritorio', confianca: 94, motivo: 'Material de escritório — não entra na fabricação' },
  { keyword: 'RESMA', categoria: 'escritorio', confianca: 85, motivo: 'Material de escritório — não entra na fabricação' },
  { keyword: 'CANETA', categoria: 'escritorio', confianca: 93, motivo: 'Material de escritório — não entra na fabricação' },
  { keyword: 'LAPIS', categoria: 'escritorio', confianca: 90, motivo: 'Material de escritório — não entra na fabricação' },
  { keyword: 'GRAMPEADOR', categoria: 'escritorio', confianca: 92, motivo: 'Material de escritório — não entra na fabricação' },
  { keyword: 'GRAMPO', categoria: 'escritorio', confianca: 85, motivo: 'Material de escritório — não entra na fabricação' },
  { keyword: 'CLIPES', categoria: 'escritorio', confianca: 90, motivo: 'Material de escritório — não entra na fabricação' },
  { keyword: 'TONER', categoria: 'escritorio', confianca: 94, motivo: 'Material de escritório — não entra na fabricação' },
  { keyword: 'CARTUCHO', categoria: 'escritorio', confianca: 88, motivo: 'Material de escritório — não entra na fabricação' },
  { keyword: 'ESCRITORIO', categoria: 'escritorio', confianca: 90, motivo: 'Material de escritório — não entra na fabricação' },
  { keyword: 'ENVELOPE', categoria: 'escritorio', confianca: 85, motivo: 'Material de escritório — não entra na fabricação' },
  { keyword: 'PASTA ARQUIVO', categoria: 'escritorio', confianca: 90, motivo: 'Material de escritório — não entra na fabricação' },
  { keyword: 'CADERNO', categoria: 'escritorio', confianca: 88, motivo: 'Material de escritório — não entra na fabricação' },

  // Fornecedores típicos de não matéria-prima (razão social / fantasia)
  { keyword: 'HIG E LIMP', categoria: 'limpeza', confianca: 96, motivo: 'Fornecedor de higiene e limpeza — não é matéria-prima' },
  { keyword: 'HIGIENE', categoria: 'limpeza', confianca: 90, motivo: 'Fornecedor/produto de higiene — não entra na fabricação' },
  { keyword: 'CLEAN', categoria: 'limpeza', confianca: 88, motivo: 'Fornecedor/produto de limpeza — não entra na fabricação' },
  { keyword: 'PAPELARIA', categoria: 'escritorio', confianca: 94, motivo: 'Papelaria — não entra na fabricação' },
  { keyword: 'SEGURANCA TRABALHO', categoria: 'epi', confianca: 92, motivo: 'Fornecedor de EPI/segurança — não é matéria-prima' },
  { keyword: 'EPI ', categoria: 'epi', confianca: 90, motivo: 'Fornecedor de EPI — não é matéria-prima' },
];

export type InsumoIgnorarDetectado = {
  categoria: InsumoIgnorarCategoria;
  confianca: number;
  motivo: string;
};

export function normalizeInsumoDescricao(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export type InsumoIgnorarContexto = {
  descricao: string;
  fornecedorRazaoSocial?: string | null;
  fornecedorNome?: string | null;
  naturezaOperacao?: string | null;
  cfopEntrada?: string | null;
};

export function montarTextoClassificacaoInsumo(contexto: InsumoIgnorarContexto): string {
  return [
    contexto.descricao,
    contexto.fornecedorRazaoSocial,
    contexto.fornecedorNome,
    contexto.naturezaOperacao,
    contexto.cfopEntrada ? `CFOP ${contexto.cfopEntrada}` : null,
  ]
    .filter((parte): parte is string => Boolean(parte?.trim()))
    .join(' ');
}

export function detectarItemNaoMateriaPrima(
  contexto: InsumoIgnorarContexto | string,
): InsumoIgnorarDetectado | null {
  const texto =
    typeof contexto === 'string'
      ? contexto
      : montarTextoClassificacaoInsumo(contexto);
  const normalized = normalizeInsumoDescricao(texto);
  if (!normalized) return null;

  const padded = ` ${normalized} `;
  let best: InsumoIgnorarDetectado | null = null;

  for (const regra of INSUMO_IGNORAR_REGRAS) {
    const keyword = normalizeInsumoDescricao(regra.keyword);
    const matches =
      keyword.startsWith(' ') || keyword.endsWith(' ')
        ? padded.includes(keyword)
        : normalized.includes(keyword);

    if (!matches) continue;
    if (!best || regra.confianca > best.confianca) {
      best = {
        categoria: regra.categoria,
        confianca: regra.confianca,
        motivo: regra.motivo,
      };
    }
  }

  return best;
}
