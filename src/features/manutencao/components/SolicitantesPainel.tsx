'use client';

import { useState } from 'react';
import { salvarSetoresDoSolicitante } from '@/app/actions/manutencao-solicitante-actions';
import { Button } from '@/components/ui/Button';
import { SetorOperacional, type SetorLinha } from '@/domain/manutencao/setor-operacional';

type SolicitanteLista = {
  id: string;
  nome: string;
  setorIds: string[];
};

type SolicitantesPainelProps = {
  usuarios: SolicitanteLista[];
  setores: SetorLinha[];
};

const CARTAO = 'rounded-xl border border-stone-200 bg-white shadow-sm';

export function SolicitantesPainel({ usuarios, setores }: SolicitantesPainelProps) {
  const operacionais = new SetorOperacional().filtrar(setores);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold tracking-tight text-stone-900">Solicitantes</h1>
      {usuarios.length === 0 ? (
        <p className={`${CARTAO} p-6 text-sm text-stone-600`}>
          Ninguém com o módulo de solicitação.
        </p>
      ) : (
        usuarios.map((usuario) => (
          <SolicitanteBloco key={usuario.id} usuario={usuario} setores={operacionais} />
        ))
      )}
    </div>
  );
}

function SolicitanteBloco({
  usuario,
  setores,
}: {
  usuario: SolicitanteLista;
  setores: SetorLinha[];
}) {
  const [marcados, setMarcados] = useState(() => new Set(usuario.setorIds));
  const [aviso, setAviso] = useState<AvisoSolicitante | null>(null);
  const [salvando, setSalvando] = useState(false);

  function alternar(setorId: string, marcado: boolean) {
    setMarcados((atual) => {
      const proximo = new Set(atual);
      if (marcado) proximo.add(setorId);
      else proximo.delete(setorId);
      return proximo;
    });
  }

  async function salvar() {
    setSalvando(true);
    try {
      const ids = setores.filter((setor) => marcados.has(setor.id)).map((setor) => setor.id);
      const resultado = await salvarSetoresDoSolicitante(usuario.id, ids);
      setAviso({ texto: resultado.mensagem, ok: resultado.ok });
    } catch {
      setAviso({ texto: 'Não foi possível salvar.', ok: false });
    } finally {
      setSalvando(false);
    }
  }

  return (
    <section className={`${CARTAO} space-y-3 p-4`}>
      <h2 className="text-base font-semibold text-stone-900">{usuario.nome}</h2>
      <div className="grid gap-1 sm:grid-cols-2">
        {setores.map((setor) => (
          <CheckboxSetor
            key={setor.id}
            nome={setor.nome}
            marcado={marcados.has(setor.id)}
            onAlternar={(marcado) => alternar(setor.id, marcado)}
          />
        ))}
      </div>
      <Button type="button" size="lg" disabled={salvando} onClick={salvar}>
        Salvar
      </Button>
      {aviso ? <AvisoSalvar aviso={aviso} /> : null}
    </section>
  );
}

type AvisoSolicitante = { texto: string; ok: boolean };

function AvisoSalvar({ aviso }: { aviso: AvisoSolicitante }) {
  const cor = aviso.ok ? 'text-stone-700' : 'text-red-700';
  return (
    <p className={`text-sm ${cor}`} role={aviso.ok ? 'status' : 'alert'}>
      {aviso.texto}
    </p>
  );
}

function CheckboxSetor({
  nome,
  marcado,
  onAlternar,
}: {
  nome: string;
  marcado: boolean;
  onAlternar: (marcado: boolean) => void;
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-stone-700">
      <input
        type="checkbox"
        className="h-5 w-5 accent-amber-600"
        checked={marcado}
        onChange={(evento) => onAlternar(evento.target.checked)}
      />
      {nome}
    </label>
  );
}
