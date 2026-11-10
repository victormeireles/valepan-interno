'use client';

import { useRouter } from 'next/navigation';
import type { IndicadoresCarregados, LinhaIndicador, ParadaEmAndamento } from '@/app/actions/manutencao-indicadores-consulta';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const CARTAO = 'overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm';
const NUMERO = 'text-right font-mono tabular-nums text-stone-800';
const calendario = new MesCalendario();

type PainelProps = { painel: IndicadoresCarregados };

export function IndicadoresPainel({ painel }: PainelProps) {
  const navegacao = useNavegacaoPeriodo();
  const mes = calendario.selecionado(painel.inicio, painel.fim);

  return (
    <div className="space-y-4">
      <Cabecalho />
      <SeletorPeriodo painel={painel} mes={mes} navegacao={navegacao} />
      <TabelaMaquinas linhas={painel.porMaquina} />
      <BlocoAndamento itens={painel.emAndamento} />
      <LinhaAjustes valor={painel.ajustes} />
    </div>
  );
}

function Cabecalho() {
  return (
    <header>
      <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight text-stone-900">
        <span className="material-icons text-amber-700" aria-hidden="true">
          analytics
        </span>
        Indicadores
      </h1>
      <p className="mt-1 text-sm text-stone-600">Horas e real no período</p>
    </header>
  );
}

function useNavegacaoPeriodo(): NavegacaoPeriodo {
  const router = useRouter();
  return new NavegacaoPeriodo((href) => router.push(href));
}

function SeletorPeriodo({
  painel,
  mes,
  navegacao,
}: {
  painel: IndicadoresCarregados;
  mes: string;
  navegacao: NavegacaoPeriodo;
}) {
  return (
    <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,12rem)_minmax(0,12rem)_minmax(0,12rem)_auto]">
      <Input
        key={`mes-${mes}`}
        label="Mês"
        type="month"
        defaultValue={mes}
        onChange={(event) => navegacao.mes(event.target.value)}
      />
      <Input
        key={`de-${painel.inicio}`}
        label="De"
        type="date"
        defaultValue={painel.inicio}
        onChange={(event) => navegacao.intervalo(event.target.value, painel.fim)}
      />
      <Input
        key={`ate-${painel.fim}`}
        label="Até"
        type="date"
        defaultValue={painel.fim}
        onChange={(event) => navegacao.intervalo(painel.inicio, event.target.value)}
      />
      <Button type="button" size="lg" variant="secondary" onClick={() => navegacao.mesAtual()}>
        Mês atual
      </Button>
    </div>
  );
}

function TabelaMaquinas({ linhas }: { linhas: LinhaIndicador[] }) {
  return (
    <section className={CARTAO}>
      <h2 className="border-b border-stone-100 px-4 py-3 text-sm font-semibold text-stone-800">Por máquina</h2>
      {linhas.length === 0 ? (
        <p className="px-4 py-6 text-sm text-stone-600">Nenhuma ordem finalizada no período.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[36rem] text-sm">
            <CabecalhoTabela />
            <tbody>
              {linhas.map((linha) => (
                <LinhaMaquina key={linha.maquinaId} linha={linha} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function CabecalhoTabela() {
  return (
    <thead>
      <tr className="border-b border-stone-200 text-left text-[11px] font-semibold uppercase tracking-wide text-stone-500">
        <th className="px-4 py-3 font-semibold">Máquina</th>
        <th className="px-4 py-3 text-right font-semibold">Parada</th>
        <th className="px-4 py-3 text-right font-semibold">Execução</th>
        <th className="px-4 py-3 text-right font-semibold">Peças</th>
      </tr>
    </thead>
  );
}

function LinhaMaquina({ linha }: { linha: LinhaIndicador }) {
  return (
    <tr className="min-h-11 border-b border-stone-100 odd:bg-white even:bg-stone-50 last:border-0">
      <td className="px-4 py-3 font-medium text-stone-900">{linha.nome}</td>
      <td className={`px-4 py-3 ${NUMERO}`}>{linha.parada}</td>
      <td className={`px-4 py-3 ${NUMERO}`}>{linha.execucao}</td>
      <td className={`px-4 py-3 ${NUMERO}`}>{linha.pecas}</td>
    </tr>
  );
}

function BlocoAndamento({ itens }: { itens: ParadaEmAndamento[] }) {
  return (
    <section className={CARTAO}>
      <h2 className="border-b border-stone-100 px-4 py-3 text-sm font-semibold text-stone-800">Em andamento</h2>
      {itens.length === 0 ? (
        <p className="px-4 py-6 text-sm text-stone-600">Nenhuma máquina parada.</p>
      ) : (
        <ul>
          {itens.map((item, indice) => (
            <li
              key={`${item.maquinaId}-${indice}`}
              className="flex min-h-11 items-center justify-between gap-3 border-b border-stone-100 px-4 py-2 last:border-0 odd:bg-white even:bg-stone-50"
            >
              <span className="font-medium text-stone-900">{item.nome}</span>
              <span className={NUMERO}>{item.parada}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function LinhaAjustes({ valor }: { valor: string }) {
  return (
    <section className={`${CARTAO} flex min-h-11 items-center justify-between gap-3 px-4 py-3`}>
      <div>
        <h2 className="text-sm font-semibold text-stone-800">Ajustes</h2>
        <p className="text-xs text-stone-500">Saídas manuais de peças</p>
      </div>
      <span className={`text-sm ${NUMERO}`}>{valor}</span>
    </section>
  );
}

class NavegacaoPeriodo {
  constructor(private readonly ir: (href: string) => void) {}

  mes(valor: string): void {
    const limites = calendario.limites(valor);
    if (limites) this.intervalo(limites.inicio, limites.fim);
  }

  intervalo(inicio: string, fim: string): void {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(inicio) || !/^\d{4}-\d{2}-\d{2}$/.test(fim) || inicio > fim) return;
    this.ir(`/manutencao/indicadores?inicio=${inicio}&fim=${fim}`);
  }

  mesAtual(): void {
    this.ir('/manutencao/indicadores');
  }
}

class MesCalendario {
  limites(anoMes: string): { inicio: string; fim: string } | null {
    const match = /^(\d{4})-(\d{2})$/.exec(anoMes);
    if (!match) return null;
    const ano = Number(match[1]);
    const mes = Number(match[2]);
    if (mes < 1 || mes > 12) return null;
    const ultimo = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
    return {
      inicio: `${match[1]}-${match[2]}-01`,
      fim: `${match[1]}-${match[2]}-${String(ultimo).padStart(2, '0')}`,
    };
  }

  selecionado(inicio: string, fim: string): string {
    const candidato = this.limites(inicio.slice(0, 7));
    if (!candidato || candidato.inicio !== inicio || candidato.fim !== fim) return '';
    return inicio.slice(0, 7);
  }
}
