import Link from 'next/link';
import { Toolbar } from '@/components/ui/Toolbar';
import type { FolhaGrupoFiltro, FolhaRegimeFiltro, FolhaResumoVista } from '@/domain/pessoas/folha-resumo';
import { FolhaGrupoRotulo } from '@/domain/pessoas/folha-resumo';
import { RemuneracaoData } from '@/domain/pessoas/remuneracao-quadro';
import { FolhaLacunas } from './FolhaLacunas';
import { FolhaPlanosSemFaixa } from './FolhaPlanosSemFaixa';
import { FolhaSetores } from './FolhaSetores';
import { FolhaTotais } from './FolhaTotais';

const data = new RemuneracaoData();
const rotulo = new FolhaGrupoRotulo();

const REGIMES: { valor: FolhaRegimeFiltro; rotulo: string }[] = [
  { valor: '', rotulo: 'Todos' },
  { valor: 'clt', rotulo: 'CLT' },
  { valor: 'pj', rotulo: 'PJ' },
];

const GRUPOS: { valor: FolhaGrupoFiltro; rotulo: string }[] = [
  { valor: '', rotulo: 'Ativos e a entrar' },
  { valor: 'ativos', rotulo: 'Apenas ativos' },
  { valor: 'a_entrar', rotulo: 'Apenas a entrar' },
];

export function FolhaTela({
  vista,
  regime,
  grupo,
  hoje,
}: {
  vista: FolhaResumoVista;
  regime: FolhaRegimeFiltro;
  grupo: FolhaGrupoFiltro;
  hoje: string;
}) {
  return (
    <div className="mx-auto flex w-full min-w-0 max-w-7xl flex-col gap-4">
      <Toolbar
        title="Folha"
        sticky={false}
        flush
        resumo={resumo(vista, regime, grupo, hoje)}
        actions={<Filtros regime={regime} grupo={grupo} />}
      />
      <FolhaTotais vista={vista} grupo={grupo} />
      <FolhaSetores vista={vista} grupo={grupo} />
      <FolhaLacunas lacunas={vista.lacunas} />
      <FolhaPlanosSemFaixa lacunas={vista.planosSemFaixa} />
    </div>
  );
}

function Filtros({ regime, grupo }: { regime: FolhaRegimeFiltro; grupo: FolhaGrupoFiltro }) {
  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      <ChipNav rotulo="Regime" opcoes={REGIMES} atual={regime} hrefDe={(valor) => hrefDe(valor, grupo)} />
      <ChipNav rotulo="Quem entra na folha" opcoes={GRUPOS} atual={grupo} hrefDe={(valor) => hrefDe(regime, valor)} />
    </div>
  );
}

function ChipNav({
  rotulo: nome,
  opcoes,
  atual,
  hrefDe,
}: {
  rotulo: string;
  opcoes: { valor: string; rotulo: string }[];
  atual: string;
  hrefDe: (valor: string) => string;
}) {
  return (
    <nav aria-label={nome} className="flex flex-wrap gap-2">
      {opcoes.map((opcao) => {
        const ativo = atual === opcao.valor;
        return (
          <Link
            key={opcao.rotulo}
            href={hrefDe(opcao.valor)}
            aria-current={ativo ? 'page' : undefined}
            className={[
              'inline-flex h-11 items-center rounded-full border px-4 text-sm font-medium',
              'transition-[background,border-color,color] duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2',
              ativo ? 'border-amber-300 bg-amber-100 text-amber-800' : 'border-stone-300 bg-white text-stone-700 hover:bg-stone-50',
            ].join(' ')}
          >
            {opcao.rotulo}
          </Link>
        );
      })}
    </nav>
  );
}

function hrefDe(regime: string, grupo: string): string {
  const params = new URLSearchParams();
  if (regime) params.set('regime', regime);
  if (grupo) params.set('grupo', grupo);
  const consulta = params.toString();
  return consulta ? `/pessoas/folha?${consulta}` : '/pessoas/folha';
}

function resumo(vista: FolhaResumoVista, regime: FolhaRegimeFiltro, grupo: FolhaGrupoFiltro, hoje: string): string {
  const vagas = vista.aprovado === 1 ? '1 vaga aprovada' : `${vista.aprovado.toLocaleString('pt-BR')} vagas aprovadas`;
  const partes = [`Vigente em ${data.exibir(hoje)}`, vagas, rotulo.principal(grupo)];
  if (regime === 'clt') partes.push('Somente CLT');
  if (regime === 'pj') partes.push('Somente PJ');
  return partes.join(' · ');
}
