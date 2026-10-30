'use client';

import { useEffect, useState } from 'react';
import { resumoFaltasRecentes } from '@/app/actions/pessoas-faltas-actions';
import { FaltaJanelaResumo, type FaltaJanelaContagem } from '@/domain/pessoas/falta-janela-resumo';

type Props = { codigo: string };

type Estado = { codigo: string; resumo: FaltaJanelaContagem | null; erro: boolean };

export function FaltaJanelaResumoPainel({ codigo }: Props) {
  const [estado, setEstado] = useState<Estado>({ codigo: '', resumo: null, erro: false });

  useEffect(() => {
    let ativo = true;
    resumoFaltasRecentes(codigo)
      .then((resumo) => {
        if (ativo) setEstado({ codigo, resumo, erro: false });
      })
      .catch(() => {
        if (ativo) setEstado({ codigo, resumo: null, erro: true });
      });
    return () => {
      ativo = false;
    };
  }, [codigo]);

  const pronto = estado.codigo === codigo;
  if (!pronto) return <FaltaJanelaCarregando />;
  if (estado.erro || !estado.resumo) return <FaltaJanelaErro />;
  return <FaltaJanelaQuadro resumo={estado.resumo} />;
}

function FaltaJanelaCarregando() {
  return (
    <p className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-3 text-sm text-stone-500">
      Consultando faltas dos últimos {FaltaJanelaResumo.dias} dias…
    </p>
  );
}

function FaltaJanelaErro() {
  return (
    <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700">
      Não foi possível consultar as faltas recentes.
    </p>
  );
}

function FaltaJanelaQuadro({ resumo }: { resumo: FaltaJanelaContagem }) {
  return (
    <section
      aria-label={`Faltas nos últimos ${FaltaJanelaResumo.dias} dias`}
      className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-3"
    >
      <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-stone-500">
        Últimos {FaltaJanelaResumo.dias} dias
      </p>
      <dl className="flex flex-col gap-1.5">
        <Linha rotulo="Total" valor={resumo.total} tom="neutro" />
        <Linha rotulo="Injustificadas" valor={resumo.injustificadas} tom={tomAtivo(resumo.injustificadas, 'amber')} />
        <Linha rotulo="Suspensões" valor={resumo.diasSuspensao} tom={tomAtivo(resumo.diasSuspensao, 'amber')} />
        <Linha rotulo="Com advertência" valor={resumo.advertencia} tom={tomAtivo(resumo.advertencia, 'amber')} />
        <Linha rotulo="Com suspensão" valor={resumo.suspensao} tom={tomAtivo(resumo.suspensao, 'vermelho')} />
      </dl>
    </section>
  );
}

function Linha({ rotulo, valor, tom }: { rotulo: string; valor: number; tom: 'neutro' | 'amber' | 'vermelho' }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-sm text-stone-600">{rotulo}</dt>
      <dd className={`font-mono text-sm font-semibold tabular-nums ${cor(tom)}`}>{valor.toLocaleString('pt-BR')}</dd>
    </div>
  );
}

function tomAtivo(valor: number, tom: 'amber' | 'vermelho'): 'neutro' | 'amber' | 'vermelho' {
  return valor > 0 ? tom : 'neutro';
}

function cor(tom: 'neutro' | 'amber' | 'vermelho'): string {
  if (tom === 'amber') return 'text-amber-800';
  if (tom === 'vermelho') return 'text-red-700';
  return 'text-stone-900';
}
