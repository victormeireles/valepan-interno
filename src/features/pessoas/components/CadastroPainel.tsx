'use client';

import { useEffect, useState } from 'react';
import { atualizarCadastroColaborador, obterCadastroColaborador } from '@/app/actions/pessoas-cadastro-actions';
import { Button } from '@/components/ui/Button';
import type { ColaboradorCadastro } from '@/domain/pessoas/colaborador-cadastro';
import type { ColaboradorListaItem } from '@/domain/pessoas/colaborador-lista-filtro';
import { CadastroFormulario } from './CadastroFormulario';
import { CadastroLeitura } from './CadastroLeitura';
import { PainelAcao } from './PainelAcao';

type Props = {
  pessoa: ColaboradorListaItem | null;
  editandoInicial: boolean;
  onFechar: () => void;
  onConcluir: (mensagem: string, ok: boolean) => void;
};

export function CadastroPainel({ pessoa, editandoInicial, onFechar, onConcluir }: Props) {
  const [editando, setEditando] = useState(editandoInicial);
  const [cadastro, setCadastro] = useState<ColaboradorCadastro | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, setPendente] = useState(false);

  useEffect(() => {
    setEditando(editandoInicial);
    setCadastro(null);
    setErro(null);
    if (!pessoa) return;
    let vivo = true;
    obterCadastroColaborador(pessoa.codigo)
      .then((resultado) => {
        if (vivo) setCadastro(resultado);
      })
      .catch((falha: unknown) => {
        if (vivo) setErro(falha instanceof Error ? falha.message : 'Não foi possível carregar o cadastro.');
      });
    return () => {
      vivo = false;
    };
  }, [pessoa, editandoInicial]);

  async function salvar(form: FormData) {
    if (!pessoa) return;
    setPendente(true);
    const campos = Object.fromEntries([...form.entries()].map(([chave, valor]) => [chave, String(valor)]));
    const resultado = await atualizarCadastroColaborador(pessoa.codigo, campos);
    setPendente(false);
    onConcluir(resultado.mensagem, resultado.ok);
    if (resultado.ok) onFechar();
  }

  return (
    <PainelAcao aberto={pessoa !== null} titulo={pessoa?.nome ?? 'Cadastro'} onFechar={onFechar} largo>
      {erro ? <p className="text-sm text-red-700">{erro}</p> : null}
      {!cadastro && !erro ? <p className="text-sm text-stone-500">Carregando cadastro…</p> : null}
      {cadastro && !editando ? (
        <div className="flex flex-col gap-5">
          <CadastroLeitura cadastro={cadastro} />
          <Button type="button" size="lg" icon="edit" onClick={() => setEditando(true)}>Editar</Button>
        </div>
      ) : null}
      {cadastro && editando ? (
        <form className="flex flex-col gap-5" action={salvar}>
          <CadastroFormulario cadastro={cadastro} />
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="submit" size="lg" disabled={pendente}>{pendente ? 'Salvando…' : 'Salvar'}</Button>
            <Button type="button" size="lg" variant="secondary" onClick={() => setEditando(false)}>Cancelar</Button>
          </div>
        </form>
      ) : null}
    </PainelAcao>
  );
}
