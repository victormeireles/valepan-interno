'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { TurnoOpcao } from '@/app/actions/pessoas-vinculo-actions';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ListRow } from '@/components/ui/ListRow';
import { Toast } from '@/components/ui/Toast';
import { Toolbar } from '@/components/ui/Toolbar';
import type { ColaboradorListaItem } from '@/domain/pessoas/colaborador-lista-filtro';
import type { QuadroPessoa, QuadroSetor, QuadroTurno } from '@/domain/pessoas/quadro-agrupamento';
import { QuadroTotais, type QuadroTotaisModo } from '@/domain/pessoas/quadro-totais';
import { TurnoRemocao } from '@/domain/pessoas/turno-remocao';
import { MenuPessoa } from './MenuPessoa';
import { QuadroContagem } from './QuadroContagem';
import { PainelAcao } from './PainelAcao';
import { PessoasAcaoPainel, type AcaoPessoa } from './PessoasAcaoPainel';
import { QuadroSetorCartao } from './QuadroSetorCartao';
import { QuadroSetorOrdemPainel } from './QuadroSetorOrdemPainel';
import { QuadroSetorPainel } from './QuadroSetorPainel';
import { QuadroTurnoPainel, type EdicaoTurno } from './QuadroTurnoPainel';

type Props = { setores: QuadroSetor[]; turnos: TurnoOpcao[]; podeEditar: boolean };

export function QuadroLista({ setores, turnos, podeEditar }: Props) {
  const router = useRouter();
  const [turnoCodigo, setTurnoCodigo] = useState<string | null>(null);
  const [acao, setAcao] = useState<AcaoPessoa>(null);
  const [pessoa, setPessoa] = useState<ColaboradorListaItem | null>(null);
  const [edicao, setEdicao] = useState<EdicaoTurno | null>(null);
  const [novoSetor, setNovoSetor] = useState(false);
  const [reordenar, setReordenar] = useState(false);
  const [modoTotais, setModoTotais] = useState<QuadroTotaisModo>('total');
  const [aviso, setAviso] = useState<{ texto: string; ok: boolean } | null>(null);
  const codigos = turnos.map((turno) => turno.codigo);
  const selecionado = useMemo(() => localizarTurno(setores, turnoCodigo), [setores, turnoCodigo]);
  const totais = useMemo(() => new QuadroTotais().geral(setores, modoTotais), [setores, modoTotais]);

  function abrir(proxima: AcaoPessoa, alvo: QuadroPessoa, turnoNome: string) {
    setPessoa(paraColaborador(alvo, turnoNome));
    setAcao(proxima);
  }

  function concluir(texto: string, ok: boolean) {
    setAviso({ texto, ok });
    if (ok) router.refresh();
  }

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-7xl flex-col gap-4">
      <Toolbar
        title="Quadro"
        sticky={false}
        flush
        resumo="Aprovadas, contratados, a entrar e vagas livres"
        actions={
          podeEditar ? (
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
              <Button type="button" variant="secondary" size="lg" icon="swap_vert" fullWidth className="sm:w-auto" onClick={() => setReordenar(true)}>
                Reordenar
              </Button>
              <Button type="button" variant="primary" size="lg" icon="add" fullWidth className="sm:w-auto" onClick={() => setNovoSetor(true)}>
                Novo setor
              </Button>
            </div>
          ) : null
        }
      />
      <QuadroContagem numeros={totais} densidade="geral" modo={modoTotais} onModo={setModoTotais} />
      {setores.map((setor) => (
        <QuadroSetorCartao
          key={setor.setorCodigo || setor.setorNome}
          setor={setor}
          podeEditar={podeEditar}
          onNovoTurno={() => setEdicao({ tipo: 'novo', setorNome: setor.setorNome, setorCodigo: setor.setorCodigo, codigos })}
          onEditarTurno={(item) => setEdicao(edicaoDoTurno(setor, item, codigos))}
          onAbrirTurno={setTurnoCodigo}
        />
      ))}
      <PainelAcao
        aberto={selecionado !== null}
        titulo={selecionado ? `${selecionado.setorNome} · ${selecionado.turno.turnoNome}` : ''}
        onFechar={() => {
          if (acao) return;
          setTurnoCodigo(null);
        }}
      >
        {selecionado ? (
          <TurnoDetalhe turno={selecionado.turno} lider={selecionado.lider} podeDefinirLider={podeEditar} onAcao={abrir} />
        ) : null}
      </PainelAcao>
      <QuadroSetorPainel aberto={novoSetor} onFechar={() => setNovoSetor(false)} onConcluir={concluir} />
      <QuadroSetorOrdemPainel
        aberto={reordenar}
        setores={setores}
        onFechar={() => setReordenar(false)}
        onConcluir={concluir}
      />
      <QuadroTurnoPainel edicao={edicao} onFechar={() => setEdicao(null)} onConcluir={concluir} />
      <PessoasAcaoPainel
        acao={acao}
        pessoa={pessoa}
        turnos={turnos}
        onFechar={() => setAcao(null)}
        onConcluir={concluir}
      />
      {aviso ? (
        <div className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 right-4 z-[60] sm:left-auto sm:right-4 sm:max-w-sm">
          <Toast tone={aviso.ok ? 'success' : 'error'} onClose={() => setAviso(null)}>{aviso.texto}</Toast>
        </div>
      ) : null}
    </div>
  );
}

function edicaoDoTurno(setor: QuadroSetor, item: QuadroTurno, codigos: string[]): EdicaoTurno {
  const remocao = new TurnoRemocao();
  return {
    tipo: 'editar',
    setorNome: setor.setorNome,
    setorCodigo: setor.setorCodigo,
    turno: item,
    codigos,
    vinculados: remocao.ocupadas(item.contratados, item.reservas),
    apoioNomes: remocao.nomesApoio(setor.apoio, item.turnoCodigo),
  };
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
    ultimoExame: null,
  };
}

function rotuloPapel(papel: QuadroPessoa['papel']): string {
  if (papel === 'reserva') return 'A entrar';
  if (papel === 'apoio') return 'Apoio';
  return 'Ocupação';
}

function TurnoDetalhe({
  turno,
  lider,
  podeDefinirLider,
  onAcao,
}: {
  turno: QuadroTurno;
  lider: string | null;
  podeDefinirLider: boolean;
  onAcao: (acao: AcaoPessoa, pessoa: QuadroPessoa, turnoNome: string) => void;
}) {
  const pessoas = [...turno.pessoas, ...turno.apoio];
  const numeros = new QuadroTotais().doTurno(turno, 'total');
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-stone-700">{lider ? `Líder do setor: ${lider}` : 'Sem líder cadastrado'}</p>
      <p className="font-mono text-sm tabular-nums text-stone-600">
        {numeros.livres.toLocaleString('pt-BR')} {numeros.livres === 1 ? 'vaga livre' : 'vagas livres'}
        {' · '}
        {numeros.contratados.toLocaleString('pt-BR')} {numeros.contratados === 1 ? 'contratado' : 'contratados'}
      </p>
      {pessoas.length === 0 ? (
        <p className="text-sm text-stone-600">Nenhuma pessoa neste turno.</p>
      ) : (
        <ul className="-mx-1 flex flex-col">
          {pessoas.map((pessoa, index) => (
            <li key={pessoa.codigo} className="min-w-0">
              <ListRow
                even={index % 2 === 1}
                title={pessoa.nome}
                subtitle={`${pessoa.codigo} · ${rotuloPapel(pessoa.papel)}`}
                columns={
                  pessoa.lider
                    ? [{ value: <Badge tone="accent">Líder</Badge>, width: '4.5rem', align: 'left', tabular: false }]
                    : []
                }
                menu={
                  <MenuPessoa
                    item={paraColaborador(pessoa, turno.turnoNome)}
                    definirLider={podeDefinirLider}
                    onAcao={(proxima) => onAcao(proxima, pessoa, turno.turnoNome)}
                  />
                }
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
