import type { ReactNode } from 'react';
import { FOLHA_DIAS_VALE_TRANSPORTE, type FolhaBalde } from '@/domain/pessoas/folha-balde';
import type { FolhaGrupoFiltro, FolhaResumoVista } from '@/domain/pessoas/folha-resumo';
import { FolhaGrupoRotulo } from '@/domain/pessoas/folha-resumo';
import { FolhaValor } from './FolhaValor';

const rotulo = new FolhaGrupoRotulo();

export function FolhaTotais({ vista, grupo }: { vista: FolhaResumoVista; grupo: FolhaGrupoFiltro }) {
  return (
    <section aria-label="Totais da folha" className="rounded-2xl border border-stone-200 bg-white p-3 shadow-sm sm:p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Total rotulo={rotulo.principal(grupo)} balde={vista.atual} detalhe={detalheAtual(vista.atual)} destaque />
        <Total rotulo="Ativos" balde={vista.contratados} detalhe={pessoas(vista.contratados.pessoas)} />
        <Total rotulo="A entrar" balde={vista.aEntrar} detalhe={pessoas(vista.aEntrar.pessoas)} />
      </div>
      <Composicao atual={vista.atual} />
      <p className="mt-3 text-sm leading-relaxed text-stone-600">
        {rotulo.frase(grupo)}{' '}
        <span className="font-mono tabular-nums text-stone-900">{vista.aprovado.toLocaleString('pt-BR')}</span>{' '}
        {vista.aprovado === 1 ? 'vaga aprovada' : 'vagas aprovadas'} no quadro. Vaga sem pessoa não entra no valor.
        {vista.foraDoPosto > 0 ? ` ${notaFora(vista.foraDoPosto)}` : ''}
      </p>
    </section>
  );
}

function Total({
  rotulo: nome,
  balde,
  detalhe,
  destaque = false,
}: {
  rotulo: string;
  balde: FolhaBalde;
  detalhe: string;
  destaque?: boolean;
}) {
  return (
    <article className={destaque ? 'rounded-xl border border-amber-300 bg-amber-50 px-4 py-3' : 'rounded-xl border border-stone-200 bg-stone-50 px-4 py-3'}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">{nome}</p>
      <p className="mt-1 text-2xl font-semibold leading-none text-stone-900 sm:text-3xl">
        <FolhaValor centavos={balde.totalCentavos} />
      </p>
      <p className="mt-2 text-xs leading-snug text-stone-600">{detalhe}</p>
    </article>
  );
}

function Composicao({ atual }: { atual: FolhaBalde }) {
  return (
    <dl className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-stone-200 bg-stone-200 lg:grid-cols-4">
      <Item rotulo="Salário" valor={<FolhaValor centavos={atual.salarioCentavos} className="text-sm text-stone-900" />} />
      <Item
        rotulo="Vale transporte"
        valor={<FolhaValor centavos={atual.valeTransporteCentavos} className="text-sm text-stone-900" />}
        nota={`Diária × ${FOLHA_DIAS_VALE_TRANSPORTE} dias`}
      />
      <Item rotulo="Vale alimentação" valor={<FolhaValor centavos={atual.valeAlimentacaoCentavos} className="text-sm text-stone-900" />} />
      <Item
        rotulo="Plano de saúde"
        valor={<FolhaValor centavos={atual.planoSaudeCentavos} className="text-sm text-stone-900" />}
        nota={notaPlano(atual)}
      />
    </dl>
  );
}

function Item({ rotulo: nome, valor, nota }: { rotulo: string; valor: ReactNode; nota?: string }) {
  return (
    <div className="bg-stone-50 px-3 py-3">
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">{nome}</dt>
      <dd className="mt-1">{valor}</dd>
      {nota ? <dd className="mt-0.5 text-[11px] text-stone-500">{nota}</dd> : null}
    </div>
  );
}

function detalheAtual(balde: FolhaBalde): string {
  const gente = balde.pessoas === 1 ? '1 pessoa' : `${balde.pessoas.toLocaleString('pt-BR')} pessoas`;
  const sem = balde.pessoas - balde.comPacote;
  if (sem <= 0) return gente;
  const falta = sem === 1 ? '1 sem pacote' : `${sem.toLocaleString('pt-BR')} sem pacote`;
  return `${gente} · ${falta}`;
}

function pessoas(quantidade: number): string {
  return quantidade === 1 ? '1 pessoa' : `${quantidade.toLocaleString('pt-BR')} pessoas`;
}

function notaFora(quantidade: number): string {
  const gente = quantidade === 1 ? '1 pessoa fora do posto não entra' : `${quantidade.toLocaleString('pt-BR')} pessoas fora do posto não entram`;
  return `${gente} nesta conta.`;
}

function notaPlano(balde: FolhaBalde): string {
  const gente = balde.planoSaude === 1 ? '1 pessoa' : `${balde.planoSaude.toLocaleString('pt-BR')} pessoas`;
  if (balde.planoSaudeSemFaixa <= 0) return gente;
  const falta = balde.planoSaudeSemFaixa === 1 ? '1 sem faixa' : `${balde.planoSaudeSemFaixa.toLocaleString('pt-BR')} sem faixa`;
  return `${gente} · ${falta}`;
}
