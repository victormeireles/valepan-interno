'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { lancarFalta, type FaltaListaItem } from '@/app/actions/pessoas-faltas-actions';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { Input } from '@/components/ui/Input';
import { ListColumnHeader } from '@/components/ui/ListColumnHeader';
import { ListRow } from '@/components/ui/ListRow';
import { Toast } from '@/components/ui/Toast';
import { Toolbar } from '@/components/ui/Toolbar';
import { Card } from '@/components/ui/Card';
import { FaltaAnexoIndicacao } from '@/domain/pessoas/falta-anexo-indicacao';
import { FaltaAgrupamento, type FaltaPessoaLinha } from '@/domain/pessoas/falta-agrupamento';
import { SituacaoColaboradorRotulo } from '@/domain/pessoas/situacao-colaborador';
import { FaltaResumoCalculo } from '@/domain/pessoas/falta-resumo';
import { postFaltaAnexo } from '@/features/pessoas/falta-anexo-client';
import { compressImage } from '@/utils/imageCompression';
import { FaltaAnexoIndicador } from './FaltaAnexoIndicador';
import { FaltasClassificacaoFiltro } from './FaltasClassificacaoFiltro';
import { FaltasPessoaModal } from './FaltasPessoaModal';
import { FaltasResumoCards } from './FaltasResumoCards';
import { ColunaRotulo } from './ColunaRotulo';
import { FaltaLancamentoForm } from './FaltaLancamentoForm';
import { PainelAcao } from './PainelAcao';

const anexoIndicacao = new FaltaAnexoIndicacao();

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

  async function lancar(entrada: {
    datas: string[];
    classificacao: string;
    justificativa: string;
    medida: string;
    arquivo: File | null;
  }) {
    setPendente(true);
    const resultado = await lancarFalta({
      codigo: pessoaId,
      datas: entrada.datas,
      classificacao: entrada.classificacao,
      justificativa: entrada.justificativa,
      medida: entrada.medida,
    });
    let anexoOk = true;
    if (resultado.ok && entrada.arquivo) {
      try {
        anexoOk = await enviarAnexos(entrada.arquivo, resultado.ids);
      } catch {
        anexoOk = false;
      }
    }
    setPendente(false);
    setAviso({
      texto: anexoOk ? resultado.mensagem : `${resultado.mensagem} Falha ao enviar o anexo.`,
      ok: resultado.ok && anexoOk,
    });
    if (resultado.ok) {
      setAberto(false);
      router.refresh();
    }
  }

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-7xl flex-col overflow-x-hidden">
      <Toolbar
        title="Faltas"
        sticky={false}
        flush
        resumo={legenda(classificacao)
          ? `${resumo.faltas.toLocaleString('pt-BR')} ${legenda(classificacao)} no período`
          : `${resumo.faltas.toLocaleString('pt-BR')} no período`}
        actions={
          <Button
            size="lg"
            icon="event_busy"
            fullWidth
            className="sm:w-auto"
            onClick={() => setAberto(true)}
          >
            Lançar falta
          </Button>
        }
      />
      <div className="grid grid-cols-1 items-end gap-3 pt-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,11rem)_minmax(0,11rem)_minmax(0,1fr)_auto]">
        <Input
          key={`de-${inicio}`}
          label="De"
          type="date"
          defaultValue={inicio}
          onChange={(event) => aplicarPeriodo(router, event.target.value, fim)}
        />
        <Input
          key={`ate-${fim}`}
          label="Até"
          type="date"
          defaultValue={fim}
          onChange={(event) => aplicarPeriodo(router, inicio, event.target.value)}
        />
        <Input
          label="Busca"
          aria-label="Buscar falta"
          placeholder="Nome"
          icon="search"
          value={termo}
          onChange={(event) => setTermo(event.target.value)}
        />
        <div className="min-w-0 sm:col-span-2 lg:col-span-1">
          <FaltasClassificacaoFiltro
            value={classificacao}
            onChange={(valor) => {
              setClassificacao(valor);
              setLimite(40);
            }}
          />
        </div>
      </div>
      <FaltasResumoCards resumo={resumo} />
      <div className="mt-4 min-w-0">
        {pessoasLista.length === 0 ? (
          <EmptyState icon="event_busy" title="Nenhuma falta no filtro." />
        ) : (
          <Card padding="none">
            <div className="hidden md:block">
              <ListColumnHeader
                leading="Colaborador"
                columns={[
                  { label: 'Faltas', width: '5rem', align: 'right' },
                  { label: 'Situação', width: '9rem', align: 'left' },
                  { label: 'Setor', width: '9rem', align: 'left' },
                  { label: 'Turno', width: '8rem', align: 'left' },
                ]}
                menuWidth="2.75rem"
              />
            </div>
            {pessoasLista.slice(0, limite).map((pessoa, index) => (
              <ListRow
                key={pessoa.codigo}
                even={index % 2 === 1}
                title={
                  <>
                    {pessoa.nome}
                    {anexoIndicacao.existeParaPessoa(filtrados, pessoa.codigo) ? <FaltaAnexoIndicador /> : null}
                  </>
                }
                subtitle={pessoa.codigo}
                onClick={() => setPessoaCodigo(pessoa.codigo)}
                columns={[
                  {
                    value: <ColunaRotulo label="Faltas">{pessoa.faltas.toLocaleString('pt-BR')}</ColunaRotulo>,
                    width: '5rem',
                    align: 'right',
                    tabular: true,
                  },
                  {
                    value: (
                      <ColunaRotulo label="Situação">
                        <Badge tone={tomSituacao(pessoa)}>{rotuloSituacao(pessoa)}</Badge>
                      </ColunaRotulo>
                    ),
                    width: '9rem',
                    align: 'left',
                    tabular: false,
                  },
                  {
                    value: <ColunaRotulo label="Setor">{pessoa.setorNome ?? '—'}</ColunaRotulo>,
                    width: '9rem',
                    align: 'left',
                    tabular: false,
                  },
                  {
                    value: <ColunaRotulo label="Turno">{pessoa.turnoNome ?? '—'}</ColunaRotulo>,
                    width: '8rem',
                    align: 'left',
                    tabular: false,
                  },
                ]}
                menu={
                  <IconButton
                    icon="visibility"
                    label={`Ver faltas de ${pessoa.nome}`}
                    size="lg"
                    variant="surface"
                    onClick={() => setPessoaCodigo(pessoa.codigo)}
                  />
                }
              />
            ))}
          </Card>
        )}
        {pessoasLista.length > limite ? (
          <div className="mt-3">
            <Button variant="secondary" size="lg" fullWidth className="sm:w-auto" onClick={() => setLimite((atual) => atual + 40)}>
              Mostrar mais
            </Button>
          </div>
        ) : null}
      </div>
      <PainelAcao aberto={aberto} titulo="Lançar falta" onFechar={() => setAberto(false)}>
        <FaltaLancamentoForm
          key={aberto ? 'aberto' : 'fechado'}
          pessoas={pessoas}
          pessoaId={pessoaId}
          pendente={pendente}
          onPessoa={setPessoaId}
          onEnviar={lancar}
        />
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
      {aviso ? (
        <div className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 right-4 z-[60] sm:left-auto sm:right-4 sm:max-w-sm">
          <Toast tone={aviso.ok ? 'success' : 'error'} onClose={() => setAviso(null)}>
            {aviso.texto}
          </Toast>
        </div>
      ) : null}
    </div>
  );
}

async function enviarAnexos(arquivo: File, ids: string[]): Promise<boolean> {
  const comprimido = await compressImage(arquivo, 4);
  let todosOk = true;
  for (const id of ids) {
    if (!(await postFaltaAnexo(id, comprimido))) todosOk = false;
  }
  return todosOk;
}

function porClassificacao(itens: FaltaListaItem[], classificacao: string): FaltaListaItem[] {
  if (!classificacao) return itens;
  return itens.filter((item) => item.classificacao === classificacao);
}

function porNome(itens: FaltaListaItem[], termo: string): FaltaListaItem[] {
  const busca = termo.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
  if (!busca) return itens;
  return itens.filter((item) =>
    item.nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').includes(busca),
  );
}

function legenda(classificacao: string): string {
  if (classificacao === 'injustificada') return 'injustificadas';
  if (classificacao === 'justificada') return 'justificadas';
  if (classificacao === 'suspensao') return 'suspensões';
  return '';
}

function rotuloSituacao(pessoa: FaltaPessoaLinha): string {
  return marcaSituacao(pessoa).texto;
}

function tomSituacao(pessoa: FaltaPessoaLinha): BadgeTone {
  return marcaSituacao(pessoa).tom;
}

function marcaSituacao(pessoa: FaltaPessoaLinha) {
  return new SituacaoColaboradorRotulo().exibir(pessoa.situacao, pessoa.avisoAtivo, pessoa.afastamento);
}

function aplicarPeriodo(router: { push: (href: string) => void }, inicio: string, fim: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(inicio) || !/^\d{4}-\d{2}-\d{2}$/.test(fim) || inicio > fim) return;
  router.push(`/pessoas/faltas?inicio=${inicio}&fim=${fim}`);
}
