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
import { CadastroPainel } from './CadastroPainel';
import { ColunaRotulo } from './ColunaRotulo';
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
  const [situacao, setSituacao] = useState(filtrosIniciais.situacao ?? '');
  const [lider, setLider] = useState('');
  const [acao, setAcao] = useState<AcaoPessoa>(null);
  const [pessoa, setPessoa] = useState<ColaboradorListaItem | null>(null);
  const [cadastro, setCadastro] = useState<ColaboradorListaItem | null>(null);
  const [editandoCadastro, setEditandoCadastro] = useState(false);
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
    setPessoa(alvo);
    setAcao(proxima);
  }

  function abrirCadastro(alvo: ColaboradorListaItem, editando: boolean) {
    setAcao(null);
    setEditandoCadastro(editando);
    setCadastro(alvo);
  }

  return (
    <div className="mx-auto w-full max-w-7xl">
      <Toolbar
        title="Colaboradores"
        sticky={false}
        resumo={`${filtrados.length.toLocaleString('pt-BR')} de ${itens.length.toLocaleString('pt-BR')}`}
        actions={<Button size="lg" icon="person_add" onClick={() => abrir('admitir', null)}>Admitir</Button>}
      />
      <div className="grid grid-cols-1 gap-3 px-4 pt-4 sm:grid-cols-2 sm:px-6 xl:grid-cols-5">
        <Input label="Busca" aria-label="Buscar colaborador" placeholder="Nome ou código" icon="search" value={termo} onChange={(event) => setTermo(event.target.value)} />
        <Select label="Setor" value={setor} onChange={(event) => setSetor(event.target.value)} options={[{ value: '', label: 'Todos' }, ...setores.map((nome) => ({ value: nome, label: nome }))]} />
        <Select label="Turno" value={turno} onChange={(event) => setTurno(event.target.value)} options={[{ value: '', label: 'Todos' }, ...turnosNomes.map((nome) => ({ value: nome, label: nome }))]} />
        <Select label="Situação" value={situacao} onChange={(event) => setSituacao(event.target.value)} options={[{ value: '', label: 'Todas' }, { value: 'ativo', label: 'Ativos' }, { value: 'admissao_prevista', label: 'Admissão prevista' }, { value: 'desligado', label: 'Desligados' }]} />
        <Select label="Líder" value={lider} onChange={(event) => setLider(event.target.value)} options={[{ value: '', label: 'Todos' }, { value: 'sim', label: 'Líderes' }, { value: 'nao', label: 'Não líderes' }]} />
      </div>
      <div className="mt-4 px-4 sm:px-6">
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
                ]}
                menu={<MenuPessoa item={item} onAcao={(proxima) => abrir(proxima, item)} onCadastro={(alvo) => abrirCadastro(alvo, true)} />}
              />
            ))}
          </Card>
        )}
      </div>
      {aviso ? (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm">
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
