'use client';

import type { MaquinaItem } from '@/app/actions/manutencao-maquina-actions';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';

const CARTAO = 'overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm';

type MaquinasListaProps = {
  maquinas: MaquinaItem[];
  termo: string;
  totalGeral: number;
  podeGravar: boolean;
  onTermo: (termo: string) => void;
  onCriar: () => void;
  onEditar: (maquina: MaquinaItem) => void;
  onRemover: (maquina: MaquinaItem) => void;
};

export function MaquinasLista({
  maquinas,
  termo,
  totalGeral,
  podeGravar,
  onTermo,
  onCriar,
  onEditar,
  onRemover,
}: MaquinasListaProps) {
  const buscaAtiva = termo.trim().length > 0;

  return (
    <div className="space-y-3">
      <Input
        label="Buscar"
        aria-label="Buscar máquinas"
        placeholder="Código, nome, setor ou observação"
        icon="search"
        value={termo}
        autoComplete="off"
        onChange={(evento) => onTermo(evento.target.value)}
      />
      {maquinas.length === 0 ? (
        <ListaVazia
          buscaAtiva={buscaAtiva}
          totalGeral={totalGeral}
          podeGravar={podeGravar}
          onCriar={onCriar}
        />
      ) : (
        <div className={CARTAO}>
          <CabecalhoLista podeGravar={podeGravar} />
          <ul>
            {maquinas.map((maquina, indice) => (
              <LinhaMaquina
                key={maquina.id}
                maquina={maquina}
                par={indice % 2 === 1}
                podeGravar={podeGravar}
                onEditar={onEditar}
                onRemover={onRemover}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ListaVazia({
  buscaAtiva,
  totalGeral,
  podeGravar,
  onCriar,
}: {
  buscaAtiva: boolean;
  totalGeral: number;
  podeGravar: boolean;
  onCriar: () => void;
}) {
  if (buscaAtiva) {
    return (
      <div className={CARTAO}>
        <EmptyState
          icon="search_off"
          title="Nenhuma máquina encontrada"
          description="Tente outro código, nome, setor ou observação."
        />
      </div>
    );
  }

  return (
    <div className={CARTAO}>
      <EmptyState
        icon="precision_manufacturing"
        title={totalGeral === 0 ? 'Nenhuma máquina cadastrada' : 'Nenhuma máquina'}
        description="Cadastre máquinas para organizar ordens e planos."
        action={
          podeGravar ? (
            <Button type="button" size="lg" icon="add" onClick={onCriar}>
              Nova máquina
            </Button>
          ) : undefined
        }
      />
    </div>
  );
}

function CabecalhoLista({ podeGravar }: { podeGravar: boolean }) {
  const grade = gradeDaLista(podeGravar);
  return (
    <div
      className={`hidden border-b border-stone-200 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-stone-500 md:grid md:items-center md:gap-3 ${grade}`}
    >
      <span className="whitespace-nowrap">Código</span>
      <span className="whitespace-nowrap">Nome</span>
      <span className="whitespace-nowrap">Setor</span>
      <span className="whitespace-nowrap">Status</span>
      {podeGravar ? <span className="sr-only">Ações</span> : null}
    </div>
  );
}

function LinhaMaquina({
  maquina,
  par,
  podeGravar,
  onEditar,
  onRemover,
}: {
  maquina: MaquinaItem;
  par: boolean;
  podeGravar: boolean;
  onEditar: (maquina: MaquinaItem) => void;
  onRemover: (maquina: MaquinaItem) => void;
}) {
  const fundo = par ? 'bg-stone-50/60' : 'bg-white';
  const grade = gradeDaLista(podeGravar);

  return (
    <li
      className={`grid grid-cols-1 gap-2 border-b border-stone-100 px-4 py-3 last:border-b-0 md:items-center md:gap-3 md:py-2 ${grade} ${fundo} transition-colors duration-150 hover:bg-amber-50/60`}
    >
      <p className="min-w-0 truncate font-mono text-sm tabular-nums text-stone-900">{maquina.codigo}</p>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-stone-900">{maquina.nome}</p>
        {maquina.observacao ? (
          <p className="truncate text-sm text-stone-500">{maquina.observacao}</p>
        ) : null}
      </div>
      <p className="text-sm text-stone-700">
        <RotuloMovel>Setor</RotuloMovel>
        {maquina.setorNome}
      </p>
      <p className="text-sm">
        <RotuloMovel>Status</RotuloMovel>
        {maquina.ativo ? (
          <span className="font-medium text-emerald-800">Ativa</span>
        ) : (
          <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-800">
            Inativa
          </span>
        )}
      </p>
      {podeGravar ? (
        <div className="flex flex-wrap gap-2 md:justify-end">
          <Button
            type="button"
            variant="secondary"
            size="lg"
            icon="edit"
            aria-label={`Editar ${maquina.codigo}`}
            onClick={() => onEditar(maquina)}
          >
            Editar
          </Button>
          <Button
            type="button"
            variant="danger"
            size="lg"
            icon="delete"
            aria-label={`Remover ${maquina.codigo}`}
            onClick={() => onRemover(maquina)}
          >
            Remover
          </Button>
        </div>
      ) : null}
    </li>
  );
}

function RotuloMovel({ children }: { children: string }) {
  return (
    <span className="mr-2 text-[10px] font-semibold uppercase tracking-wide text-stone-500 md:hidden">
      {children}
    </span>
  );
}

function gradeDaLista(podeGravar: boolean): string {
  if (podeGravar) {
    return 'md:grid-cols-[6.5rem_minmax(0,1.6fr)_minmax(8rem,1fr)_5.5rem_auto]';
  }
  return 'md:grid-cols-[6.5rem_minmax(0,1.6fr)_minmax(8rem,1fr)_5.5rem]';
}
