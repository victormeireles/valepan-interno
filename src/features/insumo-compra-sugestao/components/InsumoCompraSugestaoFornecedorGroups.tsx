import { Card } from '@/components/ui/Card';
import type {
  InsumoCompraSugestaoLinha,
  InsumoCompraSugestaoPageData,
} from '@/lib/services/insumo-compra-sugestao-service';
import InsumoCompraSugestaoMobileList from './InsumoCompraSugestaoMobileList';
import InsumoCompraSugestaoTable from './InsumoCompraSugestaoTable';

type Props = {
  grupos: InsumoCompraSugestaoPageData['gruposPorFornecedor'];
  onCadastrarRegra: (item: InsumoCompraSugestaoLinha) => void;
  onAjustarEstoque: (item: InsumoCompraSugestaoLinha) => void;
  onRegistrarPedido: (item: InsumoCompraSugestaoLinha) => void;
  onPipelineClick: (item: InsumoCompraSugestaoLinha) => void;
};

export default function InsumoCompraSugestaoFornecedorGroups({
  grupos,
  onCadastrarRegra,
  onAjustarEstoque,
  onRegistrarPedido,
  onPipelineClick,
}: Props) {
  return (
    <div className="space-y-4">
      {grupos.map((grupo) => (
        <Card key={grupo.fornecedor} padding="none" className="overflow-hidden">
          <header className="flex min-h-14 items-center justify-between gap-3 border-b border-stone-200 bg-stone-50 px-4 py-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className="material-icons text-xl text-amber-700" aria-hidden="true">
                local_shipping
              </span>
              <h2 className="truncate font-semibold text-stone-900">{grupo.fornecedor}</h2>
            </div>
            <span className="whitespace-nowrap font-mono text-xs tabular-nums text-stone-500">
              {grupo.itens.length} {grupo.itens.length === 1 ? 'item' : 'itens'}
            </span>
          </header>
          <InsumoCompraSugestaoTable
            items={grupo.itens}
            embedded
            onCadastrarRegra={onCadastrarRegra}
            onAjustarEstoque={onAjustarEstoque}
            onRegistrarPedido={onRegistrarPedido}
            onPipelineClick={onPipelineClick}
          />
          <InsumoCompraSugestaoMobileList
            items={grupo.itens}
            embedded
            onCadastrarRegra={onCadastrarRegra}
            onAjustarEstoque={onAjustarEstoque}
            onRegistrarPedido={onRegistrarPedido}
            onPipelineClick={onPipelineClick}
          />
        </Card>
      ))}
    </div>
  );
}
