'use client';

import type { InsumoVinculoSugestaoGrupo } from '@/domain/insumos/insumo-vinculo-sugestao';
import { Badge } from '@/components/ui/Badge';

type Props = {
  grupo: InsumoVinculoSugestaoGrupo;
  selected: boolean;
  onToggle: () => void;
};

function acaoBadge(acao: InsumoVinculoSugestaoGrupo['sugestao']['acao']) {
  if (acao === 'vincular') return { label: 'Vincular', tone: 'success' as const };
  if (acao === 'ignorar') return { label: 'Ignorar', tone: 'neutral' as const };
  return { label: 'Revisar', tone: 'warning' as const };
}

export default function InsumoVinculoIaRevisaoRow({ grupo, selected, onToggle }: Props) {
  const badge = acaoBadge(grupo.sugestao.acao);

  return (
    <tr className="transition-colors hover:bg-amber-50/40">
      <td className="px-3 py-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          aria-label={`Selecionar ${grupo.descricaoOmie}`}
          className="h-5 w-5 rounded border-stone-300 text-amber-600 focus:ring-amber-500"
        />
      </td>
      <td className="px-3 py-3 text-stone-800">
        <div className="font-mono text-xs text-stone-500">
          {grupo.omieCodigoProduto || grupo.chave.omieIdProduto}
        </div>
        <div className="mt-0.5 font-medium">{grupo.descricaoOmie}</div>
        {grupo.fornecedorNome || grupo.fornecedorRazaoSocial ? (
          <div className="mt-1 text-xs text-stone-500">
            {grupo.fornecedorNome || grupo.fornecedorRazaoSocial}
            {grupo.cfopEntrada ? ` • CFOP ${grupo.cfopEntrada}` : ''}
          </div>
        ) : null}
      </td>
      <td className="hidden px-3 py-3 font-mono text-xs uppercase text-stone-600 md:table-cell">
        {grupo.unidadeNf || '—'}
      </td>
      <td className="px-3 py-3 text-right font-mono tabular-nums text-stone-700">
        {grupo.pendenciaCount}
      </td>
      <td className="px-3 py-3 text-stone-800">
        {grupo.sugestao.insumoNome || '—'}
      </td>
      <td className="hidden px-3 py-3 text-right font-mono tabular-nums text-stone-700 sm:table-cell">
        {grupo.sugestao.fatorConversao != null
          ? grupo.sugestao.fatorConversao.toLocaleString('pt-BR')
          : '—'}
      </td>
      <td className="px-3 py-3 text-right font-mono tabular-nums text-stone-800">
        {grupo.sugestao.confianca}%
      </td>
      <td className="px-3 py-3">
        <Badge tone={badge.tone}>{badge.label}</Badge>
      </td>
    </tr>
  );
}
