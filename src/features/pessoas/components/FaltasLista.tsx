'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { lancarFalta, type FaltaListaItem } from '@/app/actions/pessoas-faltas-actions';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { ListColumnHeader } from '@/components/ui/ListColumnHeader';
import { ListRow } from '@/components/ui/ListRow';
import { Select } from '@/components/ui/Select';
import { Toast } from '@/components/ui/Toast';
import { Toolbar } from '@/components/ui/Toolbar';
import { Card } from '@/components/ui/Card';
import { FaltaAgrupamento, type FaltaPessoaLinha } from '@/domain/pessoas/falta-agrupamento';
import { FaltaResumoCalculo } from '@/domain/pessoas/falta-resumo';
import { FaltasClassificacaoFiltro } from './FaltasClassificacaoFiltro';
import { FaltasPessoaModal } from './FaltasPessoaModal';
import { FaltasResumoCards } from './FaltasResumoCards';
import { BuscaPessoa } from './BuscaPessoa';
import { ColunaRotulo } from './ColunaRotulo';
import { PainelAcao } from './PainelAcao';

type Pessoa = { codigo: string; nome: string };

type Props = {
  itens: FaltaListaItem[];
  anterior: FaltaListaItem[];
  pessoas: Pessoa[];
  inicio: string;
  fim: string;
};

export function FaltasLista({ itens, anterior, pessoas, inicio, fim }: Props) {
  const router = useRouter();
  const [classificacao, setClassificacao] = useState('injustificada');
  const [termo, setTermo] = useState('');
  const [aberto, setAberto] = useState(false);
  const [pessoaCodigo, setPessoaCodigo] = useState<string | null>(null);
  const [pessoaId, setPessoaId] = useState('');
  const [aviso, setAviso] = useState<{ texto: string; ok: boolean } | null>(null);
  const [limite, setLimite] = useState(40);
  const [pendente, setPendente] = useState(false);
  const atuais = useMemo(() => porClassificacao(itens, classificacao), [itens, classificacao]);
  const anteriores = useMemo(() => porClassificacao(anterior, classificacao), [anterior, classificacao]);
  const filtrados = useMemo(() => porNome(atuais, termo), [atuais, termo]);
  const pessoasLista = useMemo(() => new FaltaAgrupamento().porPessoa(filtrados), [filtrados]);
  const resumo = useMemo(() => new FaltaResumoCalculo().comparar(atuais, anteriores), [atuais, anteriores]);
  const abertas = filtrados.filter((item) => item.codigo === pessoaCodigo && !item.cancelada);
  const pessoaAberta = pessoasLista.find((pessoa) => pessoa.codigo === pessoaCodigo);

  async function lancar(form: FormData) {
    setPendente(true);
    const resultado = await lancarFalta({
      codigo: pessoaId,
      data: String(form.get('data') ?? ''),
      classificacao: String(form.get('classificacao') ?? 'pendente'),
      justificativa: String(form.get('justificativa') ?? ''),
    });
    setPendente(false);
    setAviso({ texto: resultado.mensagem, ok: resultado.ok });
    if (resultado.ok) {
      setAberto(false);
      router.refresh();
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col">
      <Toolbar
        title="Faltas"
        resumo={legenda(classificacao)
          ? `${resumo.faltas.toLocaleString('pt-BR')} ${legenda(classificacao)} no período`
          : `${resumo.faltas.toLocaleString('pt-BR')} no período`}
        actions={<Button size="lg" icon="event_busy" onClick={() => setAberto(true)}>Lançar falta</Button>}
      />
      <div className="grid grid-cols-1 items-end gap-3 px-4 pt-4 sm:px-6 lg:grid-cols-[minmax(0,11rem)_minmax(0,11rem)_minmax(0,1fr)_auto]">
        <Input key={inicio} label="De" type="date" defaultValue={inicio} onChange={(event) => aplicarPeriodo(router, event.target.value, fim)} />
        <Input key={fim} label="Até" type="date" defaultValue={fim} onChange={(event) => aplicarPeriodo(router, inicio, event.target.value)} />
        <Input label="Busca" aria-label="Buscar falta" placeholder="Nome" icon="search" value={termo} onChange={(event) => setTermo(event.target.value)} />
        <FaltasClassificacaoFiltro value={classificacao} onChange={(valor) => { setClassificacao(valor); setLimite(40); }} />
      </div>
      <FaltasResumoCards resumo={resumo} />
      <div className="mt-4 px-4 sm:px-6">
      {pessoasLista.length === 0 ? (
        <EmptyState icon="event_busy" title="Nenhuma falta no filtro." />
      ) : (
        <Card padding="none">
          <div className="hidden md:block">
            <ListColumnHeader leading="Colaborador" columns={[{ label: 'Faltas', width: '5rem', align: 'right' }, { label: 'Situação', width: '9rem', align: 'left' }, { label: 'Setor', width: '9rem', align: 'left' }, { label: 'Turno', width: '8rem', align: 'left' }]} />
          </div>
          {pessoasLista.slice(0, limite).map((pessoa, index) => (
            <ListRow
              key={pessoa.codigo}
              even={index % 2 === 1}
              title={pessoa.nome}
              subtitle={pessoa.codigo}
              onClick={() => setPessoaCodigo(pessoa.codigo)}
              columns={[
                { value: <ColunaRotulo label="Faltas">{pessoa.faltas.toLocaleString('pt-BR')}</ColunaRotulo>, width: '5rem', align: 'right', tabular: true },
                { value: <ColunaRotulo label="Situação"><Badge tone={tomSituacao(pessoa)}>{rotuloSituacao(pessoa)}</Badge></ColunaRotulo>, width: '9rem', align: 'left', tabular: false },
                { value: <ColunaRotulo label="Setor">{pessoa.setorNome ?? '—'}</ColunaRotulo>, width: '9rem', align: 'left', tabular: false },
                { value: <ColunaRotulo label="Turno">{pessoa.turnoNome ?? '—'}</ColunaRotulo>, width: '8rem', align: 'left', tabular: false },
              ]}
              menu={<Button size="lg" variant="secondary" onClick={() => setPessoaCodigo(pessoa.codigo)}>Ver faltas</Button>}
            />
          ))}
        </Card>
      )}
      {pessoasLista.length > limite ? <Button variant="secondary" size="lg" onClick={() => setLimite((atual) => atual + 40)}>Mostrar mais</Button> : null}
      </div>
      <PainelAcao aberto={aberto} titulo="Lançar falta" onFechar={() => setAberto(false)}>
        <form className="flex flex-col gap-3" action={lancar}>
          <BuscaPessoa label="Colaborador" opcoes={pessoas.map((pessoa) => ({ id: pessoa.codigo, nome: pessoa.nome, detalhe: pessoa.codigo }))} value={pessoaId} onChange={setPessoaId} />
          <Input name="data" label="Data" type="date" required />
          <Select name="classificacao" label="Classificação" options={CLASSIFICACOES} />
          <Input name="justificativa" label="Justificativa" />
          <Button type="submit" size="lg" disabled={pendente || !pessoaId}>{pendente ? 'Registrando…' : 'Lançar'}</Button>
        </form>
      </PainelAcao>
      {pessoaCodigo && pessoaAberta ? (
        <FaltasPessoaModal
          nome={pessoaAberta.nome}
          codigo={pessoaAberta.codigo}
          faltas={abertas}
          onFechar={() => setPessoaCodigo(null)}
          onAviso={(texto, ok) => setAviso({ texto, ok })}
          onMudou={() => router.refresh()}
        />
      ) : null}
      {aviso ? <div className="fixed bottom-4 right-4 z-50 max-w-sm"><Toast tone={aviso.ok ? 'success' : 'error'} onClose={() => setAviso(null)}>{aviso.texto}</Toast></div> : null}
    </div>
  );
}

const CLASSIFICACOES = [
  { value: 'pendente', label: 'Pendente' },
  { value: 'justificada', label: 'Justificada' },
  { value: 'injustificada', label: 'Injustificada' },
];

function porClassificacao(itens: FaltaListaItem[], classificacao: string): FaltaListaItem[] {
  if (!classificacao) return itens;
  return itens.filter((item) => item.classificacao === classificacao);
}

function porNome(itens: FaltaListaItem[], termo: string): FaltaListaItem[] {
  const busca = termo.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
  if (!busca) return itens;
  return itens.filter((item) => item.nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').includes(busca));
}

function legenda(classificacao: string): string {
  if (classificacao === 'injustificada') return 'injustificadas';
  if (classificacao === 'justificada') return 'justificadas';
  return '';
}

const SITUACAO: Record<FaltaPessoaLinha['situacao'], { rotulo: string; tom: BadgeTone }> = {
  ativo: { rotulo: 'Ativo', tom: 'success' },
  admissao_prevista: { rotulo: 'Admissão prevista', tom: 'warning' },
  desligado: { rotulo: 'Desligado', tom: 'neutral' },
};

function rotuloSituacao(pessoa: FaltaPessoaLinha): string {
  if (pessoa.avisoAtivo && pessoa.situacao === 'ativo') return 'Em aviso';
  return SITUACAO[pessoa.situacao].rotulo;
}

function tomSituacao(pessoa: FaltaPessoaLinha): BadgeTone {
  if (pessoa.avisoAtivo && pessoa.situacao === 'ativo') return 'warning';
  return SITUACAO[pessoa.situacao].tom;
}

function aplicarPeriodo(router: { push: (href: string) => void }, inicio: string, fim: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(inicio) || !/^\d{4}-\d{2}-\d{2}$/.test(fim) || inicio > fim) return;
  router.push(`/pessoas/faltas?inicio=${inicio}&fim=${fim}`);
}
