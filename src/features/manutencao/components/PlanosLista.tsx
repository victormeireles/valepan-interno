'use client';

import type { PlanoItem } from '@/app/actions/manutencao-plano-consulta';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { PlanoListaApresentacao } from './plano-lista-apresentacao';

const CARTAO = 'overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm';
const apresentacao = new PlanoListaApresentacao();

type PlanosListaProps = {
  planos: PlanoItem[];
  termo: string;
  totalGeral: number;
  podeEditar: boolean;
  podeExcluir: boolean;
  onTermo: (termo: string) => void;
  onCriar: () => void;
  onEditar: (plano: PlanoItem) => void;
  onRemover: (plano: PlanoItem) => void;
};

export function PlanosLista({
  planos,
  termo,
  totalGeral,
  podeEditar,
  podeExcluir,
  onTermo,
  onCriar,
  onEditar,
  onRemover,
}: PlanosListaProps) {
  const buscaAtiva = termo.trim().length > 0;
  const temAcoes = podeEditar || podeExcluir;

  return (
    <div className="space-y-3">
      <Input
        label="Buscar"
        aria-label="Buscar planos"
        placeholder="Máquina, descrição, frequência ou data"
        icon="search"
        value={termo}
        autoComplete="off"
        onChange={(evento) => onTermo(evento.target.value)}
      />
      {planos.length === 0 ? (
        <ListaVazia
          buscaAtiva={buscaAtiva}
          totalGeral={totalGeral}
          podeEditar={podeEditar}
          onCriar={onCriar}
        />
      ) : (
        <div className={CARTAO}>
          <CabecalhoLista temAcoes={temAcoes} />
          <ul>
            {planos.map((plano, indice) => (
              <LinhaPlano
                key={plano.id}
                plano={plano}
                par={indice % 2 === 1}
                podeEditar={podeEditar}
                podeExcluir={podeExcluir}
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
  podeEditar,
  onCriar,
}: {
  buscaAtiva: boolean;
  totalGeral: number;
  podeEditar: boolean;
  onCriar: () => void;
}) {
  if (buscaAtiva) {
    return (
      <div className={CARTAO}>
        <EmptyState
          icon="search_off"
          title="Nenhum plano encontrado"
          description="Tente outra máquina, descrição, frequência ou data."
        />
      </div>
    );
  }

  return (
    <div className={CARTAO}>
      <EmptyState
        icon="event_repeat"
        title={totalGeral === 0 ? 'Nenhum plano cadastrado' : 'Nenhum plano'}
        description="Cadastre planos preventivos para as máquinas."
        action={
          podeEditar ? (
            <Button type="button" size="lg" icon="add" onClick={onCriar}>
              Novo plano
            </Button>
          ) : undefined
        }
      />
    </div>
  );
}

function CabecalhoLista({ temAcoes }: { temAcoes: boolean }) {
  const grade = gradeDaLista(temAcoes);
  return (
    <div
      className={`hidden border-b border-stone-200 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-stone-500 md:grid md:items-center md:gap-3 ${grade}`}
    >
      <span className="whitespace-nowrap">Máquina</span>
      <span className="whitespace-nowrap">Frequência</span>
      <span className="whitespace-nowrap text-right">Próxima</span>
      <span className="whitespace-nowrap">Status</span>
      {temAcoes ? <span className="sr-only">Ações</span> : null}
    </div>
  );
}

function LinhaPlano({
  plano,
  par,
  podeEditar,
  podeExcluir,
  onEditar,
  onRemover,
}: {
  plano: PlanoItem;
  par: boolean;
  podeEditar: boolean;
  podeExcluir: boolean;
  onEditar: (plano: PlanoItem) => void;
  onRemover: (plano: PlanoItem) => void;
}) {
  const fundo = par ? 'bg-stone-50/60' : 'bg-white';
  const temAcoes = podeEditar || podeExcluir;
  const grade = gradeDaLista(temAcoes);
  const rotulo = `${plano.maquinaCodigo} ${plano.maquinaNome}`.trim() || 'plano';

  return (
    <li
      className={`grid grid-cols-1 gap-2 border-b border-stone-100 px-4 py-3 last:border-b-0 md:items-center md:gap-3 md:py-2 ${grade} ${fundo} transition-colors duration-150 hover:bg-amber-50/60`}
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-stone-900">
          <IdentidadeMaquina codigo={plano.maquinaCodigo} nome={plano.maquinaNome} />
        </p>
        {plano.descricao ? (
          <p className="truncate text-sm text-stone-500">{plano.descricao}</p>
        ) : null}
      </div>
      <p className="text-sm text-stone-700">
        <RotuloMovel>Frequência</RotuloMovel>
        {apresentacao.frequencia(plano)}
      </p>
      <p className="text-sm md:text-right">
        <RotuloMovel>Próxima</RotuloMovel>
        <span className="font-mono tabular-nums text-stone-900">
          {apresentacao.data(plano.proximaEm)}
        </span>
      </p>
      <div>
        {plano.temOrdemAberta ? (
          <Badge tone="accent">Aberta ou recebida</Badge>
        ) : (
          <span className="text-sm text-stone-500">—</span>
        )}
      </div>
      {temAcoes ? (
        <div className="flex flex-wrap gap-2 md:justify-end">
          {podeEditar ? (
            <Button
              type="button"
              variant="secondary"
              size="lg"
              icon="edit"
              aria-label={`Editar ${rotulo}`}
              onClick={() => onEditar(plano)}
            >
              Editar
            </Button>
          ) : null}
          {podeExcluir ? (
            <Button
              type="button"
              variant="danger"
              size="lg"
              icon="delete"
              aria-label={`Remover ${rotulo}`}
              onClick={() => onRemover(plano)}
            >
              Remover
            </Button>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

function IdentidadeMaquina({ codigo, nome }: { codigo: string; nome: string }) {
  const codigoLimpo = codigo.trim();
  const nomeLimpo = nome.trim();
  if (!codigoLimpo && !nomeLimpo) return 'Máquina';
  return (
    <>
      {codigoLimpo ? <span className="font-mono tabular-nums">{codigoLimpo}</span> : null}
      {codigoLimpo && nomeLimpo ? ' · ' : null}
      {nomeLimpo}
    </>
  );
}

function RotuloMovel({ children }: { children: string }) {
  return (
    <span className="mr-2 text-[10px] font-semibold uppercase tracking-wide text-stone-500 md:hidden">
      {children}
    </span>
  );
}

function gradeDaLista(temAcoes: boolean): string {
  if (temAcoes) {
    return 'md:grid-cols-[minmax(0,1.5fr)_minmax(8rem,1fr)_6.5rem_minmax(7rem,auto)_auto]';
  }
  return 'md:grid-cols-[minmax(0,1.5fr)_minmax(8rem,1fr)_6.5rem_minmax(7rem,auto)]';
}
