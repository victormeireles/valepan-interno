'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { ListColumnHeader } from '@/components/ui/ListColumnHeader';
import { ListRow } from '@/components/ui/ListRow';
import { Select } from '@/components/ui/Select';
import { Toast } from '@/components/ui/Toast';
import { Toolbar } from '@/components/ui/Toolbar';
import type { TurnoOpcao } from '@/app/actions/pessoas-vinculo-actions';
import {
  ColaboradorListaFiltro,
  type ColaboradorListaItem,
} from '@/domain/pessoas/colaborador-lista-filtro';
import { ExamePrazo } from '@/domain/pessoas/exame-prazo';
import { getTodayISOInBrazilTimezone } from '@/lib/utils/date-utils';
import { CadastroPainel } from './CadastroPainel';
import { ColunaRotulo } from './ColunaRotulo';
import { ExamePrazoMarca } from './ExamePrazoMarca';
import { ExamesPainel } from './ExamesPainel';
import { MenuPessoa } from './MenuPessoa';
import { PessoasAcaoPainel, type AcaoPessoa } from './PessoasAcaoPainel';

const SITUACAO: Record<ColaboradorListaItem['situacao'], { rotulo: string; tom: BadgeTone }> = {
  ativo: { rotulo: 'Ativo', tom: 'success' },
  admissao_prevista: { rotulo: 'Admissão prevista', tom: 'warning' },
  desligado: { rotulo: 'Desligado', tom: 'neutral' },
};

const filtro = new ColaboradorListaFiltro();

type Props = {
  itens: ColaboradorListaItem[];
  turnos: TurnoOpcao[];
  filtrosIniciais: { situacao?: string; aviso?: string };
};

export default function PessoasLista({ itens, turnos, filtrosIniciais }: Props) {
  const router = useRouter();
  const [termo, setTermo] = useState('');
  const [setor, setSetor] = useState('');
  const [turno, setTurno] = useState('');
  const [situacao, setSituacao] = useState(filtrosIniciais.situacao ?? 'ativo');
  const [lider, setLider] = useState('');
  const [acao, setAcao] = useState<AcaoPessoa>(null);
  const [pessoa, setPessoa] = useState<ColaboradorListaItem | null>(null);
  const [cadastro, setCadastro] = useState<ColaboradorListaItem | null>(null);
  const [exame, setExame] = useState<ColaboradorListaItem | null>(null);
  const [editandoCadastro, setEditandoCadastro] = useState(false);
  const hoje = getTodayISOInBrazilTimezone();
  const prazo = new ExamePrazo();
  const [aviso, setAviso] = useState<{ texto: string; ok: boolean } | null>(null);
  const filtrados = useMemo(
    () =>
      filtro.aplicar(itens, {
        termo,
        setor,
        turno,
        situacao,
        lider,
        aviso: filtrosIniciais.aviso === '1',
      }),
    [itens, termo, setor, turno, situacao, lider, filtrosIniciais.aviso],
  );
  const setores = unicos(itens.map((item) => item.setorNome));
  const turnosNomes = unicos(itens.map((item) => item.turnoNome));

  function abrir(proxima: AcaoPessoa, alvo: ColaboradorListaItem | null) {
    setCadastro(null);
    setExame(null);
    setPessoa(alvo);
    setAcao(proxima);
  }

  function abrirCadastro(alvo: ColaboradorListaItem, editando: boolean) {
    setAcao(null);
    setExame(null);
    setEditandoCadastro(editando);
    setCadastro(alvo);
  }

  function abrirExames(alvo: ColaboradorListaItem) {
    setAcao(null);
    setCadastro(null);
    setExame(alvo);
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-7xl overflow-x-hidden">
      <Toolbar
        title="Colaboradores"
        sticky={false}
        flush
        resumo={`${filtrados.length.toLocaleString('pt-BR')} de ${itens.length.toLocaleString('pt-BR')}`}
        actions={
          <Button size="lg" icon="person_add" fullWidth className="sm:w-auto" onClick={() => abrir('admitir', null)}>
            Admitir
          </Button>
        }
      />
      <div className="grid grid-cols-1 gap-3 pt-4 sm:grid-cols-2 xl:grid-cols-5">
        <Input label="Busca" aria-label="Buscar colaborador" placeholder="Nome ou código" icon="search" value={termo} onChange={(event) => setTermo(event.target.value)} />
        <Select label="Setor" value={setor} onChange={(event) => setSetor(event.target.value)} options={[{ value: '', label: 'Todos' }, ...setores.map((nome) => ({ value: nome, label: nome }))]} />
        <Select label="Turno" value={turno} onChange={(event) => setTurno(event.target.value)} options={[{ value: '', label: 'Todos' }, ...turnosNomes.map((nome) => ({ value: nome, label: nome }))]} />
        <Select label="Situação" value={situacao} onChange={(event) => setSituacao(event.target.value)} options={[{ value: '', label: 'Todas' }, { value: 'ativo', label: 'Ativos' }, { value: 'admissao_prevista', label: 'Admissão prevista' }, { value: 'desligado', label: 'Desligados' }]} />
        <Select label="Líder" value={lider} onChange={(event) => setLider(event.target.value)} options={[{ value: '', label: 'Todos' }, { value: 'sim', label: 'Líderes' }, { value: 'nao', label: 'Não líderes' }]} />
      </div>
      <div className="mt-4 min-w-0">
        {filtrados.length === 0 ? (
          <EmptyState icon="search_off" title="Nenhum colaborador encontrado." />
        ) : (
          <Card padding="none">
            <div className="hidden md:block">
              <ListColumnHeader
                leading="Nome"
                columns={[
                  { label: 'Situação', width: '9rem', align: 'left' },
                  { label: 'Setor', width: '10rem', align: 'left' },
                  { label: 'Turno', width: '8rem', align: 'left' },
                  { label: 'Líder', width: '6rem', align: 'left' },
                  { label: 'Próximo exame', width: '10.5rem', align: 'left' },
                ]}
                menuWidth="2.75rem"
              />
            </div>
            {filtrados.map((item, index) => (
              <ListRow
                key={item.codigo}
                even={index % 2 === 1}
                title={item.nome}
                subtitle={item.codigo}
                onClick={() => abrirCadastro(item, false)}
                columns={[
                  { value: <ColunaRotulo label="Situação"><Badge tone={item.avisoAtivo ? 'warning' : SITUACAO[item.situacao].tom}>{item.avisoAtivo ? 'Em aviso' : SITUACAO[item.situacao].rotulo}</Badge></ColunaRotulo>, width: '9rem', align: 'left', tabular: false },
                  { value: <ColunaRotulo label="Setor">{item.setorNome ?? '—'}</ColunaRotulo>, width: '10rem', align: 'left', tabular: false },
                  { value: <ColunaRotulo label="Turno">{item.turnoNome ?? '—'}</ColunaRotulo>, width: '8rem', align: 'left', tabular: false },
                  { value: <ColunaRotulo label="Líder">{item.liderSetor ? <Badge tone="accent">Líder</Badge> : '—'}</ColunaRotulo>, width: '6rem', align: 'left', tabular: false },
                  { value: <ColunaRotulo label="Próximo exame"><button type="button" className="inline-flex min-h-11 max-w-full cursor-pointer items-center border-none bg-transparent p-0 text-left" aria-label={`Exames de ${item.nome}`} onClick={(event) => { event.stopPropagation(); abrirExames(item); }}><ExamePrazoMarca situacao={prazo.calcular(item.ultimoExame, hoje)} silenciar={item.situacao === 'desligado'} /></button></ColunaRotulo>, width: '10.5rem', align: 'left', tabular: false },
                ]}
                menu={<MenuPessoa item={item} onAcao={(proxima) => abrir(proxima, item)} onCadastro={(alvo) => abrirCadastro(alvo, true)} onExames={abrirExames} />}
              />
            ))}
          </Card>
        )}
      </div>
      {aviso ? (
        <div className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 right-4 z-[60] sm:left-auto sm:right-4 sm:max-w-sm">
          <Toast tone={aviso.ok ? 'success' : 'error'} onClose={() => setAviso(null)}>{aviso.texto}</Toast>
        </div>
      ) : null}
      <CadastroPainel
        pessoa={cadastro}
        editandoInicial={editandoCadastro}
        onFechar={() => setCadastro(null)}
        onConcluir={(texto, ok) => {
          setAviso({ texto, ok });
          if (ok) router.refresh();
        }}
      />
      <ExamesPainel
        key={exame?.codigo ?? 'fechado'}
        pessoa={exame}
        onFechar={() => setExame(null)}
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
    </div>
  );
}

function unicos(valores: (string | null)[]): string[] {
  return [...new Set(valores.filter((valor): valor is string => Boolean(valor)))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}
