'use client';

import { useEffect, useRef, useState } from 'react';
import { atualizarSetor } from '@/app/actions/pessoas-setor-actions';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import type { SetorEdicaoItem, SetorTipo } from '@/domain/pessoas/setor-edicao';

type Props = {
  setor: SetorEdicaoItem;
  onVoltar: () => void;
  onSalvo: (setor: SetorEdicaoItem) => void;
  onConcluir: (mensagem: string, ok: boolean) => void;
};

export function QuadroSetorEdicaoFormulario({ setor, onVoltar, onSalvo, onConcluir }: Props) {
  const [nome, setNome] = useState(setor.nome);
  const [tipo, setTipo] = useState<SetorTipo>(setor.tipo);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, setPendente] = useState(false);
  const vigente = useRef(true);
  const alterado = nome.trim() !== setor.nome || tipo !== setor.tipo;

  useEffect(() => {
    vigente.current = true;
    return () => {
      vigente.current = false;
    };
  }, []);

  async function salvar() {
    setPendente(true);
    setErro(null);
    const resultado = await atualizarSetor({ codigo: setor.codigo, nome, tipo });
    if (!vigente.current) {
      if (resultado.ok) onConcluir(resultado.mensagem, true);
      return;
    }
    setPendente(false);
    if (!resultado.ok) {
      setErro(resultado.mensagem);
      return;
    }
    onSalvo({ codigo: setor.codigo, nome: nome.trim(), tipo });
  }

  return (
    <Campos
      nome={nome}
      tipo={tipo}
      codigo={setor.codigo}
      erro={erro}
      pendente={pendente}
      podeSalvar={Boolean(nome.trim()) && alterado}
      onNome={setNome}
      onTipo={setTipo}
      onVoltar={onVoltar}
      onSalvar={() => void salvar()}
    />
  );
}

function Campos({
  nome,
  tipo,
  codigo,
  erro,
  pendente,
  podeSalvar,
  onNome,
  onTipo,
  onVoltar,
  onSalvar,
}: {
  nome: string;
  tipo: SetorTipo;
  codigo: string;
  erro: string | null;
  pendente: boolean;
  podeSalvar: boolean;
  onNome: (nome: string) => void;
  onTipo: (tipo: SetorTipo) => void;
  onVoltar: () => void;
  onSalvar: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Input
        label="Nome"
        value={nome}
        required
        autoFocus
        autoComplete="off"
        disabled={pendente}
        hint={`Código ${codigo} permanece. Turnos e pessoas continuam neste setor.`}
        onChange={(event) => onNome(event.target.value)}
      />
      <Select
        label="Tipo"
        value={tipo}
        required
        disabled={pendente}
        hint={dicaTipo(tipo)}
        onChange={(event) => onTipo(event.target.value as SetorTipo)}
        options={[
          { value: 'operacional', label: 'Operacional' },
          { value: 'apoio', label: 'Apoio' },
        ]}
      />
      {erro ? <p role="alert" className="text-sm text-rose-700">{erro}</p> : null}
      <Acoes pendente={pendente} podeSalvar={podeSalvar} onVoltar={onVoltar} onSalvar={onSalvar} />
    </div>
  );
}

function Acoes({
  pendente,
  podeSalvar,
  onVoltar,
  onSalvar,
}: {
  pendente: boolean;
  podeSalvar: boolean;
  onVoltar: () => void;
  onSalvar: () => void;
}) {
  return (
    <div className="flex flex-col gap-2 border-t border-stone-100 pt-4 sm:flex-row sm:justify-end">
      <Button type="button" variant="ghost" size="lg" icon="arrow_back" fullWidth className="sm:w-auto" disabled={pendente} onClick={onVoltar}>
        Voltar
      </Button>
      <Button type="button" variant="primary" size="lg" fullWidth className="sm:w-auto" disabled={pendente || !podeSalvar} onClick={onSalvar}>
        {pendente ? 'Salvando…' : 'Salvar'}
      </Button>
    </div>
  );
}

function dicaTipo(tipo: SetorTipo): string {
  if (tipo === 'apoio') return 'Não entra na escolha de máquinas da manutenção.';
  return 'Entra na escolha de máquinas da manutenção.';
}
