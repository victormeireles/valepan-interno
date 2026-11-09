'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { salvarMaquina } from '@/app/actions/manutencao-maquina-actions';
import type { MaquinaItem } from '@/app/actions/manutencao-maquina-actions';
import { Button } from '@/components/ui/Button';
import type { SetorLinha } from '@/domain/manutencao/setor-operacional';
import { MaquinaFormulario, type MaquinaFormularioValor } from './MaquinaFormulario';

const FORMULARIO_VAZIO: MaquinaFormularioValor = {
  codigo: '',
  nome: '',
  setorId: '',
  observacao: '',
  ativo: true,
};

const CARTAO = 'overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm';

type MaquinasPainelProps = {
  maquinas: MaquinaItem[];
  setores: SetorLinha[];
  podeGravar: boolean;
};

type Aviso = { texto: string; ok: boolean };

export function MaquinasPainel({ maquinas, setores, podeGravar }: MaquinasPainelProps) {
  const router = useRouter();
  const [valor, setValor] = useState(FORMULARIO_VAZIO);
  const [versaoFormulario, setVersaoFormulario] = useState(0);
  const [aviso, setAviso] = useState<Aviso | null>(null);

  function editar(maquina: MaquinaItem) {
    setValor(valorDaMaquina(maquina));
    setVersaoFormulario((atual) => atual + 1);
    setAviso(null);
  }

  async function gravar(entrada: MaquinaFormularioValor) {
    const resultado = await salvarMaquina(entrada);
    setAviso({ texto: resultado.mensagem, ok: resultado.ok });
    if (!resultado.ok) return;
    setValor(FORMULARIO_VAZIO);
    setVersaoFormulario((atual) => atual + 1);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold tracking-tight text-stone-900">Máquinas</h1>
      <MaquinaFormulario
        key={versaoFormulario}
        setores={setores}
        valor={valor}
        podeGravar={podeGravar}
        onSubmit={gravar}
      />
      {aviso ? <AvisoSalvar aviso={aviso} /> : null}
      <ul className={CARTAO}>
        {maquinas.map((maquina) => (
          <LinhaMaquina key={maquina.id} maquina={maquina} onEditar={editar} />
        ))}
      </ul>
    </div>
  );
}

function valorDaMaquina(maquina: MaquinaItem): MaquinaFormularioValor {
  return {
    id: maquina.id,
    codigo: maquina.codigo,
    nome: maquina.nome,
    setorId: maquina.setorId,
    observacao: maquina.observacao,
    ativo: maquina.ativo,
  };
}

function AvisoSalvar({ aviso }: { aviso: Aviso }) {
  const cor = aviso.ok ? 'text-emerald-800' : 'text-red-700';
  return (
    <p className={`text-sm ${cor}`} role={aviso.ok ? 'status' : 'alert'}>
      {aviso.texto}
    </p>
  );
}

function LinhaMaquina({
  maquina,
  onEditar,
}: {
  maquina: MaquinaItem;
  onEditar: (maquina: MaquinaItem) => void;
}) {
  return (
    <li className="flex min-h-11 flex-col gap-2 border-b border-stone-100 px-4 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-stone-900">
          <span className="font-mono tabular-nums">{maquina.codigo}</span>
          {' · '}
          {maquina.nome}
        </p>
        <p className="truncate text-sm text-stone-600">
          {maquina.setorNome}
          {maquina.ativo ? null : (
            <span className="ml-2 font-medium text-amber-800">Inativa</span>
          )}
        </p>
      </div>
      <Button type="button" variant="secondary" size="lg" onClick={() => onEditar(maquina)}>
        Editar
      </Button>
    </li>
  );
}
