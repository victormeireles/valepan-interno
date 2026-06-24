'use client';

import type { InsumoPendenciaProdutoGrupo } from '@/domain/insumos/insumo-pendencia-grupo';
import { Button } from '@/components/ui/Button';
import OrdemProducaoRowCheckbox from '@/components/OrdensProducao/OrdemProducaoRowCheckbox';
import { configMobileRowClass } from '@/components/Config/config-table-styles';
import InsumoPendenciaMobileDetalhes from '@/features/insumo-estoque/components/InsumoPendenciaMobileDetalhes';
import {
  formatCurrency,
  formatInsumoQuantidade,
} from '@/features/insumo-estoque/utils/formatters';

type Props = {
  grupos: InsumoPendenciaProdutoGrupo[];
  selectedKeys: Set<string>;
  onToggleSelect: (chave: string) => void;
  onVincular: (grupo: InsumoPendenciaProdutoGrupo) => void;
  onIgnorar: (grupo: InsumoPendenciaProdutoGrupo) => void;
};

export default function InsumoPendenciaMobileList({
  grupos,
  selectedKeys,
  onToggleSelect,
  onVincular,
  onIgnorar,
}: Props) {
  if (grupos.length === 0) return null;

  return (
    <div className="divide-y divide-stone-100 md:hidden">
      {grupos.map((grupo, index) => {
        const selected = selectedKeys.has(grupo.chave);
        return (
          <div
            key={grupo.chave}
            className={`${configMobileRowClass(index)} flex-col items-stretch ${
              selected ? 'bg-amber-50/60' : ''
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="flex min-h-11 min-w-11 items-center justify-center">
                <OrdemProducaoRowCheckbox
                  checked={selected}
                  onChange={() => onToggleSelect(grupo.chave)}
                  ariaLabel={`Selecionar ${grupo.descricaoProduto || grupo.omieIdProduto}`}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-mono text-xs text-stone-500">
                  {grupo.omieCodigoProduto || grupo.omieIdProduto}
                </p>
                <p className="mt-0.5 text-sm font-semibold text-stone-900">
                  {grupo.descricaoProduto || '—'}
                </p>
                <div className="mt-2 flex flex-wrap gap-3 font-mono text-sm tabular-nums text-stone-800">
                  <span>
                    {formatInsumoQuantidade(grupo.quantidadeNfTotal, grupo.unidadeNf ?? undefined)}
                  </span>
                  <span className="text-stone-500">
                    {grupo.nfsDistintas} NF{grupo.nfsDistintas === 1 ? '' : 's'}
                  </span>
                  <span>{formatCurrency(grupo.valorTotal)}</span>
                </div>
              </div>
            </div>

            <InsumoPendenciaMobileDetalhes grupo={grupo} />

            <div className="mt-3 flex gap-2 pl-14">
              <Button size="sm" className="flex-1" onClick={() => onVincular(grupo)}>
                Vincular
              </Button>
              <Button size="sm" variant="ghost" className="flex-1" onClick={() => onIgnorar(grupo)}>
                Ignorar
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
