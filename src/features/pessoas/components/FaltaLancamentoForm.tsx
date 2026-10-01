'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { BuscaPessoa } from './BuscaPessoa';
import { FaltaDataCampo } from './FaltaDataCampo';

type Pessoa = { codigo: string; nome: string };

type Entrada = {
  datas: string[];
  classificacao: string;
  justificativa: string;
};

type Props = {
  pessoas: Pessoa[];
  pessoaId: string;
  pendente: boolean;
  onPessoa: (id: string) => void;
  onEnviar: (entrada: Entrada) => void;
};

const CLASSIFICACOES = [
  { value: 'pendente', label: 'Pendente' },
  { value: 'justificada', label: 'Justificada' },
  { value: 'injustificada', label: 'Injustificada' },
];

export function FaltaLancamentoForm({ pessoas, pessoaId, pendente, onPessoa, onEnviar }: Props) {
  const [datas, setDatas] = useState<string[]>([]);

  async function enviar(form: FormData) {
    if (datas.length === 0) return;
    await onEnviar({
      datas,
      classificacao: String(form.get('classificacao') ?? 'pendente'),
      justificativa: String(form.get('justificativa') ?? ''),
    });
  }

  return (
    <form className="flex flex-col gap-3" action={enviar}>
      <BuscaPessoa
        label="Colaborador"
        opcoes={pessoas.map((pessoa) => ({ id: pessoa.codigo, nome: pessoa.nome, detalhe: pessoa.codigo }))}
        value={pessoaId}
        onChange={onPessoa}
      />
      <FaltaDataCampo onDatas={setDatas} />
      <Select name="classificacao" label="Classificação" options={CLASSIFICACOES} />
      <Input name="justificativa" label="Justificativa" />
      <Button type="submit" size="lg" fullWidth disabled={pendente || !pessoaId || datas.length === 0}>
        {rotuloBotao(pendente, datas.length)}
      </Button>
    </form>
  );
}

function rotuloBotao(pendente: boolean, quantidade: number): string {
  if (pendente) return 'Registrando…';
  if (quantidade > 1) return `Lançar ${quantidade.toLocaleString('pt-BR')} faltas`;
  return 'Lançar';
}
