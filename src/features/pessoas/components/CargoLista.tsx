import { Button } from '@/components/ui/Button';
import { CargoFaixaRotulo, type CargoCadastro } from '@/domain/pessoas/cargo-faixa';

const rotulo = new CargoFaixaRotulo();

export function CargoLista({
  cargos,
  onEditar,
  onAtivo,
  onApagar,
}: {
  cargos: CargoCadastro[];
  onEditar: (cargo: CargoCadastro) => void;
  onAtivo: (cargo: CargoCadastro) => void;
  onApagar: (cargo: CargoCadastro) => void;
}) {
  if (cargos.length === 0) return <p className="text-sm text-stone-600">Nenhum cargo cadastrado.</p>;
  return (
    <ul className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
      {cargos.map((cargo) => (
        <li key={cargo.id} className="flex flex-col gap-3 border-b border-stone-100 px-4 py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between">
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-2 text-sm font-medium text-stone-900">
              {cargo.nome}
              {cargo.ativo ? null : <span className="rounded-md bg-stone-100 px-1.5 py-0.5 text-xs font-medium text-stone-600">Inativo</span>}
            </span>
            <span className="block font-mono text-sm tabular-nums text-stone-700">{rotulo.exibir(cargo.deCentavos, cargo.ateCentavos)}</span>
          </span>
          <span className="flex shrink-0 flex-wrap gap-2">
            <Button type="button" variant="secondary" size="lg" onClick={() => onEditar(cargo)}>Editar</Button>
            <Button type="button" variant="secondary" size="lg" onClick={() => onAtivo(cargo)}>{cargo.ativo ? 'Desativar' : 'Reativar'}</Button>
            <Button type="button" variant="secondary" size="lg" onClick={() => onApagar(cargo)}>Apagar</Button>
          </span>
        </li>
      ))}
    </ul>
  );
}
