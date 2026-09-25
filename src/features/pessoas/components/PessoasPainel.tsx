'use client';

import Link from 'next/link';
import { exportarColaboradoresCsv } from '@/app/actions/pessoas-painel-actions';
import { Card } from '@/components/ui/Card';
import { Toolbar } from '@/components/ui/Toolbar';
import type { PainelPessoas } from '@/app/actions/pessoas-painel-actions';

const CARDS = [
  { chave: 'ativos', titulo: 'Ativos', href: '/pessoas?situacao=ativo' },
  { chave: 'admissoes', titulo: 'Admissões previstas', href: '/pessoas?situacao=admissao_prevista' },
  { chave: 'avisos', titulo: 'Avisos', href: '/pessoas?aviso=1' },
  { chave: 'livres', titulo: 'Vagas livres', href: '/pessoas/quadro' },
  { chave: 'faltas', titulo: 'Faltas no período', href: '/pessoas/faltas?inicio=2026-06-01&fim=2026-10-31' },
] as const;

export function PessoasPainel({ dados }: { dados: PainelPessoas }) {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-6">
      <Toolbar
        title="Visão geral"
        resumo="Alocado não significa presente hoje"
        actions={
          <button
            type="button"
            className="h-11 rounded-xl bg-amber-600 px-4 text-sm font-medium text-white"
            onClick={() => baixar()}
          >
            Exportar filtro
          </button>
        }
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((card) => (
          <Link key={card.chave} href={card.href}>
            <Card>
              <p className="text-xs font-medium tracking-wide text-stone-500 uppercase">{card.titulo}</p>
              <p className="font-mono text-4xl tabular-nums text-stone-900">{dados[card.chave].toLocaleString('pt-BR')}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

async function baixar(): Promise<void> {
  const csv = await exportarColaboradoresCsv();
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'colaboradores.csv';
  link.click();
  URL.revokeObjectURL(url);
}
