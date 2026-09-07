export class ProdutoFamiliaOptionsMapper {
  select(extraFields: string[]): string {
    return extraFields.includes('produto_familia_id')
      ? ', produto_familias(nome_exibicao)' : '';
  }

  metadata(item: Record<string, unknown>, extraFields: string[]): Record<string, unknown> {
    if (!extraFields.includes('produto_familia_id')) return {};
    const familia = item.produto_familias as { nome_exibicao?: string } | null;
    return { familiaNome: familia?.nome_exibicao ?? null };
  }
}
