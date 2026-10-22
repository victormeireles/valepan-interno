'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { FaltaCampos } from '@/domain/pessoas/falta-campos';
import type { ClassificacaoFalta } from '@/domain/pessoas/falta-lancamento';
import { BuscaPessoa } from './BuscaPessoa';
import FaltaAnexoCampo from './FaltaAnexoCampo';
import { FaltaDataCampo } from './FaltaDataCampo';
import { MEDIDAS } from './falta-opcoes';

type Pessoa = { codigo: string; nome: string };

type Entrada = {
  datas: string[];
  classificacao: string;
  justificativa: string;
  medida: string;
  arquivo: File | null;
};

type Props = {
  pessoas: Pessoa[];
  pessoaId: string;
  pendente: boolean;
  onPessoa: (id: string) => void;
  onEnviar: (entrada: Entrada) => void | Promise<void>;
};

const CLASSIFICACOES = [
  { value: 'pendente', label: 'Pendente' },
  { value: 'justificada', label: 'Justificada' },
  { value: 'injustificada', label: 'Injustificada' },
];

const campos = new FaltaCampos();

export function FaltaLancamentoForm({ pessoas, pessoaId, pendente, onPessoa, onEnviar }: Props) {
  const [datas, setDatas] = useState<string[]>([]);
  const [classificacao, setClassificacao] = useState<ClassificacaoFalta>('pendente');
  const [arquivo, setArquivo] = useState<File | null>(null);

  async function enviar(form: FormData) {
    if (datas.length === 0) return;
    await onEnviar({
      datas,
      classificacao,
      justificativa: String(form.get('justificativa') ?? ''),
      medida: String(form.get('medida') ?? ''),
      arquivo,
    });
    setArquivo(null);
    setClassificacao('pendente');
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
      <Select
        name="classificacao"
        label="Classificação"
        options={CLASSIFICACOES}
        value={classificacao}
        onChange={(event) => setClassificacao(event.target.value as ClassificacaoFalta)}
      />
      {campos.mostraJustificativa(classificacao) ? <Input name="justificativa" label="Justificativa" /> : null}
      {campos.mostraMedida(classificacao) ? <Select name="medida" label="Medida" options={MEDIDAS} /> : null}
      <FaltaAnexoCampo temAnexo={false} arquivoLocal={arquivo} onArquivo={setArquivo} />
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
