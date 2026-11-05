import type { ReactNode } from 'react';
import { EmptyState } from '@/components/ui/EmptyState';
import type { FolhaBalde } from '@/domain/pessoas/folha-balde';
import type { FolhaGrupoFiltro, FolhaResumoVista, FolhaSetorLinha } from '@/domain/pessoas/folha-resumo';
import { FolhaGrupoRotulo } from '@/domain/pessoas/folha-resumo';
import { FolhaValor } from './FolhaValor';

const rotulo = new FolhaGrupoRotulo();

export function FolhaSetores({ vista, grupo }: { vista: FolhaResumoVista; grupo: FolhaGrupoFiltro }) {
  if (vista.setores.length === 0) {
    return <EmptyState icon="payments" title="Nenhuma vaga nem pessoa na folha." />;
  }
  return (
    <section aria-label="Folha por setor" className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-stone-800">Por setor</h2>
      <div className="flex flex-col gap-3 lg:hidden">
        {vista.setores.map((setor) => (
          <FolhaSetorCartao key={setor.nome} setor={setor} total={vista.atual.totalCentavos} coluna={rotulo.principal(grupo)} />
        ))}
      </div>
      <FolhaSetorTabela setores={vista.setores} total={vista.atual.totalCentavos} coluna={rotulo.principal(grupo)} />
    </section>
  );
}

function FolhaSetorCartao({ setor, total, coluna }: { setor: FolhaSetorLinha; total: number; coluna: string }) {
  return (
    <article className="rounded-xl border border-stone-200 bg-white p-3 shadow-sm">
      <h3 className="truncate text-base font-semibold text-stone-900">{setor.nome}</h3>
      <div className="mt-2 flex items-end justify-between gap-3">
        <p className="text-xl font-semibold leading-none text-stone-900">
          <FolhaValor centavos={setor.atual.totalCentavos} />
        </p>
        <Parte valor={setor.atual.totalCentavos} total={total} />
      </div>
      <p className="mt-1 text-xs text-stone-500">{coluna}</p>
      <dl className="mt-3 grid grid-cols-2 gap-3">
        <Mini rotulo="Aprovadas" valor={setor.aprovado.toLocaleString('pt-BR')} />
        <Mini rotulo="Ativos" valor={<Contagem balde={setor.contratados} />} />
        <Mini rotulo="A entrar" valor={<Contagem balde={setor.aEntrar} />} />
      </dl>
    </article>
  );
}

function Mini({ rotulo, valor }: { rotulo: string; valor: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">{rotulo}</dt>
      <dd className="mt-0.5 text-sm text-stone-800">{valor}</dd>
    </div>
  );
}

function FolhaSetorTabela({ setores, total, coluna }: { setores: FolhaSetorLinha[]; total: number; coluna: string }) {
  return (
    <div className="hidden overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm lg:block">
      <table className="w-full border-collapse text-left">
        <caption className="sr-only">Folha por setor, com a parte do total escolhido</caption>
        <thead>
          <tr className="border-b border-stone-200 bg-stone-50 text-[10px] font-semibold uppercase tracking-wide text-stone-500">
            <th scope="col" className="px-4 py-3 font-semibold">Setor</th>
            <th scope="col" className="px-3 py-3 text-right font-semibold">Aprovadas</th>
            <th scope="col" className="px-3 py-3 text-right font-semibold">Ativos</th>
            <th scope="col" className="px-3 py-3 text-right font-semibold">A entrar</th>
            <th scope="col" className="px-4 py-3 text-right font-semibold">{coluna}</th>
          </tr>
        </thead>
        <tbody>
          {setores.map((setor) => (
            <tr key={setor.nome} className="border-b border-stone-100 last:border-0">
              <th scope="row" className="px-4 py-3 text-left text-sm font-semibold text-stone-900">
                {setor.nome}
              </th>
              <td className="px-3 py-3 text-right font-mono text-sm tabular-nums text-stone-900">
                {setor.aprovado.toLocaleString('pt-BR')}
              </td>
              <Celula balde={setor.contratados} />
              <Celula balde={setor.aEntrar} />
              <td className="px-4 py-3 text-right">
                <FolhaValor centavos={setor.atual.totalCentavos} className="text-sm font-semibold text-stone-900" />
                <div className="flex justify-end">
                  <Parte valor={setor.atual.totalCentavos} total={total} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Celula({ balde }: { balde: FolhaBalde }) {
  return (
    <td className="px-3 py-3 text-right">
      <span className="block font-mono text-sm tabular-nums text-stone-900">{balde.pessoas.toLocaleString('pt-BR')}</span>
      <FolhaValor centavos={balde.totalCentavos} className="text-xs text-stone-600" />
    </td>
  );
}

function Contagem({ balde }: { balde: FolhaBalde }) {
  return (
    <span>
      <span className="font-mono tabular-nums">{balde.pessoas.toLocaleString('pt-BR')}</span>
      <span className="mt-0.5 block text-xs text-stone-600">
        <FolhaValor centavos={balde.totalCentavos} />
      </span>
    </span>
  );
}

function Parte({ valor, total }: { valor: number; total: number }) {
  const percentual = parteDaFolha(valor, total);
  return (
    <div className="mt-1.5 flex items-center gap-2">
      <div
        className="h-1.5 w-16 overflow-hidden rounded-full bg-stone-200"
        role="img"
        aria-label={`${percentual.toLocaleString('pt-BR')}% do total`}
      >
        <div className="h-full rounded-full bg-amber-600" style={{ width: `${percentual}%` }} />
      </div>
      <span className="font-mono text-[11px] tabular-nums text-stone-500">{percentual.toLocaleString('pt-BR')}%</span>
    </div>
  );
}

function parteDaFolha(valor: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((valor / total) * 100);
}
