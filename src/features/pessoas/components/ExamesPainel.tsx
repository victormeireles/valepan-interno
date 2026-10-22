'use client';

import { useEffect, useState } from 'react';
import {
  listarExamesColaborador,
  registrarExameColaborador,
  removerExameColaborador,
  type ExameRegistro,
} from '@/app/actions/pessoas-exames-actions';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ExamePrazo } from '@/domain/pessoas/exame-prazo';
import type { ColaboradorListaItem } from '@/domain/pessoas/colaborador-lista-filtro';
import { getTodayISOInBrazilTimezone } from '@/lib/utils/date-utils';
import { ExamePrazoMarca } from './ExamePrazoMarca';
import { PainelAcao } from './PainelAcao';

type Props = {
  pessoa: ColaboradorListaItem | null;
  onFechar: () => void;
  onConcluir: (mensagem: string, ok: boolean) => void;
};

export function ExamesPainel({ pessoa, onFechar, onConcluir }: Props) {
  const [exames, setExames] = useState<ExameRegistro[]>([]);
  const [data, setData] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(Boolean(pessoa));
  const [pendente, setPendente] = useState(false);
  const [removendo, setRemovendo] = useState<string | null>(null);
  const hoje = getTodayISOInBrazilTimezone();
  const prazo = new ExamePrazo();
  const ultimo = exames.reduce<string | null>((maior, exame) => (!maior || exame.data > maior ? exame.data : maior), null);
  const situacao = prazo.calcular(ultimo, hoje);

  useEffect(() => {
    if (!pessoa) return;
    let vivo = true;
    setCarregando(true);
    listarExamesColaborador(pessoa.codigo)
      .then((lista) => {
        if (vivo) setExames(lista);
      })
      .catch((falha: unknown) => {
        if (vivo) setErro(falha instanceof Error ? falha.message : 'Não foi possível carregar os exames.');
      })
      .finally(() => {
        if (vivo) setCarregando(false);
      });
    return () => {
      vivo = false;
    };
  }, [pessoa]);

  async function registrar(form: FormData) {
    if (!pessoa) return;
    setPendente(true);
    const resultado = await registrarExameColaborador(pessoa.codigo, String(form.get('data') ?? ''));
    setPendente(false);
    onConcluir(resultado.mensagem, resultado.ok);
    if (!resultado.ok) return;
    setData('');
    await recarregar(pessoa.codigo);
  }

  async function remover(id: string) {
    if (!pessoa) return;
    setRemovendo(id);
    const resultado = await removerExameColaborador(id);
    setRemovendo(null);
    onConcluir(resultado.mensagem, resultado.ok);
    if (resultado.ok) await recarregar(pessoa.codigo);
  }

  async function recarregar(codigo: string) {
    try {
      setExames(await listarExamesColaborador(codigo));
      setErro(null);
    } catch (falha: unknown) {
      setErro(falha instanceof Error ? falha.message : 'Não foi possível carregar os exames.');
    }
  }

  return (
    <PainelAcao aberto={pessoa !== null} titulo={pessoa ? `Exames de ${pessoa.nome}` : 'Exames'} onFechar={onFechar}>
      {carregando ? <p className="mb-5 text-sm text-stone-500">Carregando exames…</p> : null}
      {!carregando && !erro ? (
        <div className="mb-5 flex flex-col gap-2 rounded-xl border border-stone-200 bg-stone-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Próximo exame</p>
          <ExamePrazoMarca situacao={situacao} />
          <p className="text-sm text-stone-600">{prazo.legenda(situacao)}</p>
          <p className="text-sm text-stone-700">Último exame: {situacao.ultimo ? prazo.exibir(situacao.ultimo) : 'Nenhum'}</p>
        </div>
      ) : null}
      <form className="flex flex-col gap-3" action={registrar}>
        <Input name="data" label="Data do exame realizado" type="date" required max={hoje} value={data} onChange={(event) => setData(event.target.value)} />
        <p className="text-sm text-stone-600">O próximo exame vence um ano depois do último realizado.</p>
        <Button type="submit" size="lg" fullWidth disabled={pendente || !data}>
          {pendente ? 'Registrando…' : 'Registrar exame'}
        </Button>
      </form>
      <div className="mt-6">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-500">Realizados</h3>
        {erro ? <p className="mt-2 text-sm text-red-700">{erro}</p> : null}
        {!carregando && !erro && exames.length === 0 ? <p className="mt-2 text-sm text-stone-500">Nenhum exame registrado.</p> : null}
        <ul className="mt-2 flex flex-col divide-y divide-stone-100">
          {exames.map((exame) => (
            <li key={exame.id} className="flex min-h-11 items-center justify-between gap-3 py-1">
              <span className="min-w-0 truncate text-sm text-stone-900">{prazo.exibir(exame.data)}</span>
              <Button type="button" size="lg" variant="ghost" disabled={removendo === exame.id} onClick={() => remover(exame.id)}>
                {removendo === exame.id ? 'Removendo…' : 'Remover'}
              </Button>
            </li>
          ))}
        </ul>
      </div>
    </PainelAcao>
  );
}
