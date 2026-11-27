'use client';

import { useEffect, useState } from 'react';
import { listarSetoresEdicao } from '@/app/actions/pessoas-setor-actions';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import type { SetorEdicaoItem } from '@/domain/pessoas/setor-edicao';
import { PainelAcao } from './PainelAcao';
import { QuadroSetorEdicaoFormulario } from './QuadroSetorEdicaoFormulario';
import { QuadroSetorEdicaoLista } from './QuadroSetorEdicaoLista';

type Props = {
  aberto: boolean;
  onFechar: () => void;
  onConcluir: (mensagem: string, ok: boolean) => void;
};

export function QuadroSetorEdicaoPainel({ aberto, onFechar, onConcluir }: Props) {
  if (!aberto) return null;
  return <Conteudo onFechar={onFechar} onConcluir={onConcluir} />;
}

function Conteudo({ onFechar, onConcluir }: Omit<Props, 'aberto'>) {
  const [lista, setLista] = useState<SetorEdicaoItem[] | null>(null);
  const [erroCarga, setErroCarga] = useState<string | null>(null);
  const [tentativa, setTentativa] = useState(0);
  const [selecionado, setSelecionado] = useState<SetorEdicaoItem | null>(null);

  useEffect(() => {
    let vigente = true;
    setLista(null);
    setErroCarga(null);
    listarSetoresEdicao()
      .then((itens) => {
        if (vigente) setLista(itens);
      })
      .catch(() => {
        if (vigente) setErroCarga('Não foi possível carregar os setores.');
      });
    return () => {
      vigente = false;
    };
  }, [tentativa]);

  function aoSalvar(atualizado: SetorEdicaoItem) {
    setLista((atual) => atual?.map((item) => (item.codigo === atualizado.codigo ? atualizado : item)) ?? atual);
    setSelecionado(null);
    onConcluir('Setor atualizado.', true);
  }

  return (
    <PainelAcao aberto titulo={selecionado ? `Editar ${selecionado.nome}` : 'Editar setores'} onFechar={onFechar}>
      {selecionado ? (
        <QuadroSetorEdicaoFormulario setor={selecionado} onVoltar={() => setSelecionado(null)} onSalvo={aoSalvar} onConcluir={onConcluir} />
      ) : (
        <CorpoLista lista={lista} erroCarga={erroCarga} onEditar={setSelecionado} onTentar={() => setTentativa((valor) => valor + 1)} />
      )}
    </PainelAcao>
  );
}

function CorpoLista({
  lista,
  erroCarga,
  onEditar,
  onTentar,
}: {
  lista: SetorEdicaoItem[] | null;
  erroCarga: string | null;
  onEditar: (setor: SetorEdicaoItem) => void;
  onTentar: () => void;
}) {
  if (erroCarga) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p role="alert" className="text-sm text-rose-700">
          {erroCarga}
        </p>
        <Button type="button" variant="secondary" size="lg" icon="refresh" onClick={onTentar}>
          Tentar de novo
        </Button>
      </div>
    );
  }
  if (!lista) return <Carregando />;
  return <QuadroSetorEdicaoLista setores={lista} onEditar={onEditar} />;
}

function Carregando() {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-2">
      <span className="sr-only">Carregando setores</span>
      <Skeleton height="3.25rem" radius="0.75rem" />
      <Skeleton height="3.25rem" radius="0.75rem" />
      <Skeleton height="3.25rem" radius="0.75rem" />
    </div>
  );
}
