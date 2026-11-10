'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { IndicadoresCarregados, LinhaIndicador, ParadaEmAndamento } from '@/app/actions/manutencao-indicadores-consulta';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const CARTAO = 'overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm';
const NUMERO = 'text-right font-mono tabular-nums text-stone-800';
const GRADE =
  'grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,12rem)_minmax(0,12rem)_minmax(0,12rem)_auto_auto]';
const calendario = new MesCalendario();

type Intervalo = { inicio: string; fim: string };

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
  const local = usePeriodoLocal(painel.inicio, painel.fim, mes);
  const aplicar = (inicio: string, fim: string) => navegacao.intervalo(inicio, fim, painel);

  return (
    <div className={GRADE}>
      <Input
        label="Mês"
        type="month"
        value={local.mesLocal}
        onChange={(event) => aoEscolherMes(event.target.value, mes, local.setMesLocal, navegacao, painel)}
      />
      <CampoData label="De" valor={local.de} onChange={local.setDe} onBlur={(valor) => aplicar(valor, local.ate)} />
      <CampoData label="Até" valor={local.ate} onChange={local.setAte} onBlur={(valor) => aplicar(local.de, valor)} />
      <Button type="button" size="lg" onClick={() => aplicar(local.de, local.ate)}>
        Aplicar
      </Button>
      <Button type="button" size="lg" variant="secondary" onClick={() => navegacao.mesAtual()}>
        Mês atual
      </Button>
    </div>
  );
}

function usePeriodoLocal(inicio: string, fim: string, mes: string) {
  const chave = `${inicio}|${fim}|${mes}`;
  const [vista, setVista] = useState(chave);
  const [de, setDe] = useState(inicio);
  const [ate, setAte] = useState(fim);
  const [mesLocal, setMesLocal] = useState(mes);
  if (vista !== chave) {
    setVista(chave);
    setDe(inicio);
    setAte(fim);
    setMesLocal(mes);
  }
  return { de, ate, mesLocal, setDe, setAte, setMesLocal };
}

function CampoData({
  label,
  valor,
  onChange,
  onBlur,
}: {
  label: string;
  valor: string;
  onChange: (valor: string) => void;
  onBlur: (valor: string) => void;
}) {
  return (
    <Input
      label={label}
      type="date"
      value={valor}
      onChange={(event) => onChange(event.target.value)}
      onBlur={(event) => onBlur(event.target.value)}
    />
  );
}

function aoEscolherMes(
  valor: string,
  mesCommitado: string,
  definir: (valor: string) => void,
  navegacao: NavegacaoPeriodo,
  atual: Intervalo,
): void {
  if (!calendario.limites(valor)) {
    definir(mesCommitado);
    return;
  }
  definir(valor);
  navegacao.mes(valor, atual);
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

  mes(valor: string, atual: Intervalo): void {
    const limites = calendario.limites(valor);
    if (limites) this.intervalo(limites.inicio, limites.fim, atual);
  }

  intervalo(inicio: string, fim: string, atual: Intervalo): void {
    if (!this.aceitavel(inicio, fim) || (atual.inicio === inicio && atual.fim === fim)) return;
    this.ir(`/manutencao/indicadores?inicio=${inicio}&fim=${fim}`);
  }

  private aceitavel(inicio: string, fim: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(inicio) && /^\d{4}-\d{2}-\d{2}$/.test(fim) && inicio <= fim;
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
