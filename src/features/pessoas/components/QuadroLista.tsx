'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { ListRow } from '@/components/ui/ListRow';
import { Toast } from '@/components/ui/Toast';
import { Toolbar } from '@/components/ui/Toolbar';
import type { TurnoOpcao } from '@/app/actions/pessoas-vinculo-actions';
import type { ColaboradorListaItem } from '@/domain/pessoas/colaborador-lista-filtro';
import { HorarioSemana } from '@/domain/pessoas/horario-semana';
import type { QuadroPessoa, QuadroSetor, QuadroTurno } from '@/domain/pessoas/quadro-agrupamento';
import { MenuPessoa } from './MenuPessoa';
import { PainelAcao } from './PainelAcao';
import { PessoasAcaoPainel, type AcaoPessoa } from './PessoasAcaoPainel';
import { QuadroTurnoPainel, type EdicaoTurno } from './QuadroTurnoPainel';

type Props = { setores: QuadroSetor[]; turnos: TurnoOpcao[]; podeEditar: boolean };

export function QuadroLista({ setores, turnos, podeEditar }: Props) {
  const router = useRouter();
  const [turnoCodigo, setTurnoCodigo] = useState<string | null>(null);
  const [acao, setAcao] = useState<AcaoPessoa>(null);
  const [pessoa, setPessoa] = useState<ColaboradorListaItem | null>(null);
  const [edicao, setEdicao] = useState<EdicaoTurno | null>(null);
  const [aviso, setAviso] = useState<{ texto: string; ok: boolean } | null>(null);
  const codigos = turnos.map((turno) => turno.codigo);
  const selecionado = useMemo(() => localizarTurno(setores, turnoCodigo), [setores, turnoCodigo]);

  function abrir(proxima: AcaoPessoa, alvo: QuadroPessoa, turnoNome: string) {
    setPessoa(paraColaborador(alvo, turnoNome));
    setAcao(proxima);
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-6">
      <Toolbar title="Quadro" resumo="Aprovadas, contratados, reservas e vagas livres" />
      {setores.map((setor) => (
        <section key={setor.setorNome} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
          <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-stone-900">{setor.setorNome}</h2>
              <p className="text-sm text-stone-600">{setor.liderNome ? `Líder: ${setor.liderNome}` : 'Sem líder cadastrado'}</p>
            </div>
            {podeEditar ? (
              <Button type="button" variant="secondary" size="lg" icon="add" onClick={() => setEdicao({ tipo: 'novo', setorNome: setor.setorNome, setorCodigo: setor.setorCodigo, codigos })}>
                Novo turno
              </Button>
            ) : null}
          </header>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {setor.turnos.map((item) => (
              <article key={item.turnoCodigo} className="rounded-xl border border-stone-200 transition hover:border-amber-300 hover:bg-amber-50">
                <div className="flex items-start justify-between gap-2 p-3 pb-0">
                  <button type="button" className="min-h-11 flex-1 text-left" onClick={() => setTurnoCodigo(item.turnoCodigo)}>
                    <span className="block text-sm font-medium text-stone-900">{item.turnoNome}</span>
                    {item.liderNome ? <span className="mt-1 block text-xs font-medium text-amber-800">Líder: {item.liderNome}</span> : null}
                    {new HorarioSemana().resumir(item.horario).map((linha) => (
                      <span key={linha} className="mt-0.5 block font-mono text-xs tabular-nums text-stone-600">{linha}</span>
                    ))}
                  </button>
                  {podeEditar ? (
                    <IconButton icon="schedule" label={`Alterar horário de ${item.turnoNome}`} size="lg" onClick={() => setEdicao({ tipo: 'editar', setorNome: setor.setorNome, setorCodigo: setor.setorCodigo, turno: item, codigos, vinculados: item.contratados + item.reservas + setor.apoio.filter((pessoa) => pessoa.turnoCodigo === item.turnoCodigo).length })} />
                  ) : null}
                </div>
                <button type="button" className="w-full p-3 text-left" onClick={() => setTurnoCodigo(item.turnoCodigo)}>
                  <Barra turno={item} />
                  <span className="mt-2 grid grid-cols-4 gap-2 text-center">
                    <Metrica rotulo="Aprovadas" valor={item.aprovado} />
                    <Metrica rotulo="Contratados" valor={item.contratados} />
                    <Metrica rotulo="Reservas" valor={item.reservas} />
                    <Metrica rotulo="Livres" valor={item.livres} />
                  </span>
                </button>
              </article>
            ))}
          </div>
          {setor.apoio.length > 0 ? (
            <p className="mt-3 text-sm text-stone-600">Apoio: {setor.apoio.map((pessoaApoio) => pessoaApoio.nome).join(', ')}</p>
          ) : null}
        </section>
      ))}
      <PainelAcao
        aberto={selecionado !== null}
        titulo={selecionado ? `${selecionado.setorNome} · ${selecionado.turno.turnoNome}` : ''}
        onFechar={() => {
          if (acao) return;
          setTurnoCodigo(null);
        }}
      >
        {selecionado ? <TurnoDetalhe turno={selecionado.turno} lider={selecionado.lider} onAcao={abrir} /> : null}
      </PainelAcao>
      <QuadroTurnoPainel
        edicao={edicao}
        onFechar={() => setEdicao(null)}
        onConcluir={(texto, ok) => {
          setAviso({ texto, ok });
          if (ok) router.refresh();
        }}
      />
      <PessoasAcaoPainel
        acao={acao}
        pessoa={pessoa}
        turnos={turnos}
        onFechar={() => setAcao(null)}
        onConcluir={(texto, ok) => {
          setAviso({ texto, ok });
          if (ok) router.refresh();
        }}
      />
      {aviso ? (
        <div className="fixed bottom-4 right-4 z-[60] max-w-sm">
          <Toast tone={aviso.ok ? 'success' : 'error'} onClose={() => setAviso(null)}>{aviso.texto}</Toast>
        </div>
      ) : null}
    </div>
  );
}

function localizarTurno(setores: QuadroSetor[], codigo: string | null) {
  if (!codigo) return null;
  for (const setor of setores) {
    const turno = setor.turnos.find((item) => item.turnoCodigo === codigo);
    if (turno) return { setorNome: setor.setorNome, lider: setor.liderNome, turno };
  }
  return null;
}

function paraColaborador(alvo: QuadroPessoa, turnoNome: string): ColaboradorListaItem {
  return {
    codigo: alvo.codigo,
    nome: alvo.nome,
    situacao: alvo.papel === 'reserva' ? 'admissao_prevista' : 'ativo',
    setorNome: alvo.setorNome,
    turnoNome,
    turnoCodigo: alvo.turnoCodigo,
    liderSetor: alvo.lider,
    avisoAtivo: false,
  };
}

function Barra({ turno }: { turno: QuadroTurno }) {
  const total = Math.max(turno.aprovado, 1);
  return (
    <span className="mt-3 flex h-2 overflow-hidden rounded-full bg-stone-100" aria-hidden>
      <span className="bg-amber-600" style={{ width: `${(turno.contratados / total) * 100}%` }} />
      <span className="bg-amber-300" style={{ width: `${(turno.reservas / total) * 100}%` }} />
    </span>
  );
}

function rotuloPapel(papel: QuadroPessoa['papel']): string {
  if (papel === 'reserva') return 'Reserva';
  if (papel === 'apoio') return 'Apoio';
  return 'Ocupação';
}

function Metrica({ rotulo, valor }: { rotulo: string; valor: number }) {
  return (
    <span className="flex flex-col">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">{rotulo}</span>
      <span className="font-mono text-lg tabular-nums text-stone-900">{valor.toLocaleString('pt-BR')}</span>
    </span>
  );
}

function TurnoDetalhe({
  turno,
  lider,
  onAcao,
}: {
  turno: QuadroTurno;
  lider: string | null;
  onAcao: (acao: AcaoPessoa, pessoa: QuadroPessoa, turnoNome: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-stone-700">{lider ? `Líder do setor: ${lider}` : 'Sem líder cadastrado'}</p>
      <p className="font-mono text-sm tabular-nums text-stone-600">
        {turno.livres.toLocaleString('pt-BR')} {turno.livres === 1 ? 'vaga livre' : 'vagas livres'}
      </p>
      {turno.pessoas.length === 0 ? (
        <p className="text-sm text-stone-600">Nenhuma pessoa neste turno.</p>
      ) : (
        turno.pessoas.map((pessoa, index) => (
          <ListRow
            key={pessoa.codigo}
            even={index % 2 === 1}
            title={pessoa.nome}
            subtitle={pessoa.codigo}
            columns={[
              { value: pessoa.lider ? <Badge tone="accent">Líder</Badge> : <span />, width: '4.5rem', align: 'left', tabular: false },
              { value: rotuloPapel(pessoa.papel), width: '5.5rem', align: 'left', tabular: false },
            ]}
            menu={<MenuPessoa item={paraColaborador(pessoa, turno.turnoNome)} onAcao={(proxima) => onAcao(proxima, pessoa, turno.turnoNome)} />}
          />
        ))
      )}
    </div>
  );
}
