'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { ListColumnHeader } from '@/components/ui/ListColumnHeader';
import { ListRow } from '@/components/ui/ListRow';
import { Select } from '@/components/ui/Select';
import { Toast } from '@/components/ui/Toast';
import { Toolbar } from '@/components/ui/Toolbar';
import type { CargoOpcao } from '@/domain/pessoas/cargo-opcao';
import type { TurnoOpcao } from '@/app/actions/pessoas-vinculo-actions';
import {
  ColaboradorListaFiltro,
  type ColaboradorListaItem,
  type VencimentoLista,
} from '@/domain/pessoas/colaborador-lista-filtro';
import { ExamePrazo } from '@/domain/pessoas/exame-prazo';
import { LiderDoSetor } from '@/domain/pessoas/lider-do-setor';
import { ProximoVencimentoExperiencia } from '@/domain/pessoas/proximo-vencimento-experiencia';
import type { Regime } from '@/domain/pessoas/regime-cadastro';
import { SituacaoColaboradorRotulo } from '@/domain/pessoas/situacao-colaborador';
import { SeloFerias } from './SeloFerias';
import { formatISODateBr, getTodayISOInBrazilTimezone } from '@/lib/utils/date-utils';
import { BaixarColaboradoresExcel } from './BaixarColaboradoresExcel';
import { CadastroPainel } from './CadastroPainel';
import { ColunaRotulo } from './ColunaRotulo';
import { ExamesPainel } from './ExamesPainel';
import { MenuPessoa } from './MenuPessoa';
import { RemuneracaoPainel } from './RemuneracaoPainel';
import { PessoasAcaoPainel, type AcaoPessoa } from './PessoasAcaoPainel';
import { PrazoColaborador } from './PrazoColaborador';

const filtro = new ColaboradorListaFiltro();
const situacaoRotulo = new SituacaoColaboradorRotulo();
const experiencia = new ProximoVencimentoExperiencia();
const exames = new ExamePrazo();
const lideresDoSetor = new LiderDoSetor();

type Props = {
  itens: ColaboradorListaItem[];
  turnos: TurnoOpcao[];
  cargos: CargoOpcao[];
  filtrosIniciais: { situacao?: string; aviso?: string };
  podeAdministrar: boolean;
};

export default function PessoasLista({ itens, turnos, cargos, filtrosIniciais, podeAdministrar }: Props) {
  const router = useRouter();
  const [termo, setTermo] = useState('');
  const [setor, setSetor] = useState('');
  const [situacao, setSituacao] = useState(filtrosIniciais.situacao ?? 'ativo');
  const [regime, setRegime] = useState<'' | Regime>('');
  const [vencimento, setVencimento] = useState<VencimentoLista>('');
  const [acao, setAcao] = useState<AcaoPessoa>(null);
  const [pessoa, setPessoa] = useState<ColaboradorListaItem | null>(null);
  const [cadastro, setCadastro] = useState<ColaboradorListaItem | null>(null);
  const [exame, setExame] = useState<ColaboradorListaItem | null>(null);
  const [remuneracao, setRemuneracao] = useState<ColaboradorListaItem | null>(null);
  const [editandoCadastro, setEditandoCadastro] = useState(false);
  const hoje = getTodayISOInBrazilTimezone();
  const [aviso, setAviso] = useState<{ texto: string; ok: boolean } | null>(null);
  const { filtrados, experiencia: totalExperiencia, exames: totalExames } = useMemo(() => listaFiltrada(itens, {
    termo,
    setor,
    situacao,
    regime,
    aviso: filtrosIniciais.aviso === '1',
    hoje,
    vencimento,
  }), [itens, termo, setor, situacao, regime, filtrosIniciais.aviso, hoje, vencimento]);
  const setores = unicos(itens.map((item) => item.setorNome));
  const lideres = useMemo(() => lideresDoSetor.porSetor(itens), [itens]);

  function abrir(proxima: AcaoPessoa, alvo: ColaboradorListaItem | null) {
    setCadastro(null);
    setExame(null);
    setRemuneracao(null);
    setPessoa(alvo);
    setAcao(proxima);
  }

  function abrirCadastro(alvo: ColaboradorListaItem, editando: boolean) {
    setAcao(null);
    setExame(null);
    setRemuneracao(null);
    setEditandoCadastro(editando);
    setCadastro(alvo);
  }

  function abrirExames(alvo: ColaboradorListaItem) {
    setAcao(null);
    setCadastro(null);
    setRemuneracao(null);
    setExame(alvo);
  }

  function abrirRemuneracao(alvo: ColaboradorListaItem) {
    setAcao(null);
    setCadastro(null);
    setExame(null);
    setRemuneracao(alvo);
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-7xl overflow-x-hidden">
      <Toolbar
        title="Colaboradores"
        sticky={false}
        flush
        resumo={`${filtrados.length.toLocaleString('pt-BR')} de ${itens.length.toLocaleString('pt-BR')}`}
        actions={
          <>
            <BaixarColaboradoresExcel onErro={(texto) => setAviso({ texto, ok: false })} />
            <Button size="lg" icon="person_add" fullWidth className="sm:w-auto" onClick={() => abrir('admitir', null)}>
              Admitir
            </Button>
          </>
        }
      />
      <div className="grid grid-cols-1 items-end gap-3 pt-4 sm:grid-cols-2 xl:grid-cols-[minmax(14rem,1.4fr)_repeat(4,minmax(0,1fr))]">
        <div className="sm:col-span-2 xl:col-span-1">
          <Input label="Busca" aria-label="Buscar colaborador" placeholder="Nome, código, CNPJ ou indicação" icon="search" value={termo} onChange={(event) => setTermo(event.target.value)} />
        </div>
        <Select label="Setor" value={setor} onChange={(event) => setSetor(event.target.value)} options={[{ value: '', label: 'Todos' }, ...setores.map((nome) => ({ value: nome, label: nome }))]} />
        <Select label="Situação" value={situacao} onChange={(event) => setSituacao(event.target.value)} options={[{ value: '', label: 'Todas' }, { value: 'ativo', label: 'Ativos' }, { value: 'afastado', label: 'Fora do posto' }, { value: 'admissao_prevista', label: 'Admissão prevista' }, { value: 'desligado', label: 'Desligados' }]} />
        <Select label="Regime" value={regime} onChange={(event) => setRegime(event.target.value as '' | Regime)} options={[{ value: '', label: 'Todos' }, { value: 'clt', label: 'CLT' }, { value: 'pj', label: 'PJ' }]} />
        <Select
          label="Vencimentos"
          value={vencimento}
          onChange={(event) => setVencimento(event.target.value as VencimentoLista)}
          options={[
            { value: '', label: 'Todos' },
            { value: 'experiencia', label: `Experiência · 7 dias · ${totalExperiencia.toLocaleString('pt-BR')}` },
            { value: 'exame', label: `Exames · ${ColaboradorListaFiltro.EXAME_A_VENCER_DIAS} dias · ${totalExames.toLocaleString('pt-BR')}` },
          ]}
        />
      </div>
      <div className="mt-4 min-w-0">
        {filtrados.length === 0 ? (
          <EmptyState icon="search_off" title={tituloVazio(vencimento)} />
        ) : (
          <Card padding="none">
            <div className="hidden md:block">
              <ListColumnHeader
                leading="Nome"
                columns={[
                  { label: 'Situação', width: '8rem', align: 'left' },
                  { label: 'Admissão', width: '6.75rem', align: 'left' },
                  { label: 'Prazo', width: '11.5rem', align: 'left' },
                  { label: 'Setor', width: '12rem', align: 'left' },
                  { label: 'Líder', width: '9.5rem', align: 'left' },
                ]}
                menuWidth="2.75rem"
              />
            </div>
            {filtrados.map((item, index) => (
              <ListRow
                key={item.codigo}
                even={index % 2 === 1}
                title={<TituloPessoa item={item} />}
                subtitle={item.codigo}
                onClick={() => abrirCadastro(item, false)}
                columns={[
                  { value: <ColunaRotulo label="Situação"><BadgeSituacao item={item} /></ColunaRotulo>, width: '8rem', align: 'left', tabular: false },
                  { value: <ColunaRotulo label="Admissão"><DataAdmissao iso={item.dataAdmissao} /></ColunaRotulo>, width: '6.75rem', align: 'left' },
                  { value: <ColunaRotulo label="Prazo"><PrazoColaborador item={item} hoje={hoje} onAbrirExames={abrirExames} /></ColunaRotulo>, width: '11.5rem', align: 'left', tabular: false },
                  { value: <ColunaRotulo label="Setor"><SetorTurno item={item} /></ColunaRotulo>, width: '12rem', align: 'left', tabular: false },
                  { value: <ColunaRotulo label="Líder"><CelulaLider item={item} lideres={lideres} /></ColunaRotulo>, width: '9.5rem', align: 'left', tabular: false },
                ]}
                menu={
                  <MenuPessoa
                    item={item}
                    onAcao={(proxima) => abrir(proxima, item)}
                    onCadastro={(alvo) => abrirCadastro(alvo, true)}
                    onRemuneracao={podeAdministrar ? abrirRemuneracao : undefined}
                    onExames={item.regime === 'clt' ? abrirExames : undefined}
                  />
                }
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
        cargos={cargos}
        onFechar={() => setCadastro(null)}
        onConcluir={(texto, ok) => {
          setAviso({ texto, ok });
          if (ok) router.refresh();
        }}
      />
      <RemuneracaoPainel
        pessoa={remuneracao}
        onFechar={() => setRemuneracao(null)}
        onConcluir={(texto, ok) => setAviso({ texto, ok })}
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
        cargos={cargos}
        onFechar={() => setAcao(null)}
        onConcluir={(texto, ok) => {
          setAviso({ texto, ok });
          if (ok) router.refresh();
        }}
      />
    </div>
  );
}

function TituloPessoa({ item }: { item: ColaboradorListaItem }) {
  if (item.regime !== 'pj') return <span title={item.nome}>{item.nome}</span>;
  return (
    <span className="inline-flex max-w-full items-center gap-2" title={item.nome}>
      <span className="truncate">{item.nome}</span>
      <Badge tone="outline">PJ</Badge>
    </span>
  );
}

function CelulaLider({ item, lideres }: { item: ColaboradorListaItem; lideres: Map<string, string> }) {
  if (item.liderSetor) return <Badge tone="accent">Líder</Badge>;
  const nome = item.setorNome ? lideres.get(item.setorNome) : undefined;
  if (!nome) return <span>—</span>;
  return <span className="block truncate font-normal text-stone-600" title={nome}>{nome}</span>;
}

function SetorTurno({ item }: { item: ColaboradorListaItem }) {
  const texto = [item.setorNome, item.turnoNome].filter(Boolean).join(' · ');
  if (!texto) return <span>—</span>;
  return <span title={texto}>{texto}</span>;
}

function BadgeSituacao({ item }: { item: ColaboradorListaItem }) {
  const marca = situacaoRotulo.exibir(item.situacao, item.avisoAtivo, item.afastamento);
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <Badge tone={marca.tom}>{marca.texto}</Badge>
      <SeloFerias periodo={item.ferias} />
    </span>
  );
}

function DataAdmissao({ iso }: { iso: string | null }) {
  if (!iso) return <span>—</span>;
  return <span className="font-mono tabular-nums">{formatISODateBr(iso)}</span>;
}

function compararPrazo(a: ColaboradorListaItem, b: ColaboradorListaItem, hoje: string, tipo: VencimentoLista): number {
  const da = dataPrazo(a, hoje, tipo);
  const db = dataPrazo(b, hoje, tipo);
  return da.localeCompare(db) || a.nome.localeCompare(b.nome, 'pt-BR');
}

function dataPrazo(item: ColaboradorListaItem, hoje: string, tipo: VencimentoLista): string {
  if (tipo === 'experiencia') return experiencia.proximo(item.dataAdmissao, hoje)?.iso ?? '';
  return exames.calcular(item.ultimoExame, hoje).proximo ?? '';
}

function tituloVazio(tipo: VencimentoLista): string {
  if (tipo === 'experiencia') return 'Nenhuma experiência a vencer.';
  if (tipo === 'exame') return 'Nenhum exame a vencer.';
  return 'Nenhum colaborador encontrado.';
}

function listaFiltrada(
  itens: ColaboradorListaItem[],
  criterio: {
    termo: string;
    setor: string;
    situacao: string;
    regime: '' | Regime;
    aviso: boolean;
    hoje: string;
    vencimento: VencimentoLista;
  },
) {
  const base = {
    termo: criterio.termo,
    setor: criterio.setor,
    situacao: criterio.situacao,
    regime: criterio.regime,
    aviso: criterio.aviso,
    hoje: criterio.hoje,
  };
  const lista = filtro.aplicar(itens, { ...base, vencimento: criterio.vencimento });
  const ordenados = criterio.vencimento ? [...lista].sort((a, b) => compararPrazo(a, b, criterio.hoje, criterio.vencimento)) : lista;
  return {
    filtrados: ordenados,
    experiencia: filtro.aplicar(itens, { ...base, vencimento: 'experiencia' }).length,
    exames: filtro.aplicar(itens, { ...base, vencimento: 'exame' }).length,
  };
}

function unicos(valores: (string | null)[]): string[] {
  return [...new Set(valores.filter((valor): valor is string => Boolean(valor)))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
}
