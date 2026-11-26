import { EmptyState } from '@/components/ui/EmptyState';
import { SugestaoTemaCatalogo } from '@/domain/sugestoes/sugestao-tema-catalogo';
import { SUGESTAO_MENSAGENS } from '@/domain/sugestoes/sugestao-mensagens';
import type { SugestaoListaItem } from '@/lib/services/sugestao-lista-leitura';

const opcoes = new SugestaoTemaCatalogo().opcoes();

export function SugestoesLista({ itens, tema }: { itens: SugestaoListaItem[]; tema: string | null }) {
  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      <h1 className="text-2xl font-bold tracking-tight text-text-strong">Sugestões</h1>
      <nav className="flex flex-wrap gap-2">
        <Filtro href="/pessoas/sugestoes" ativo={tema === null}>Todos</Filtro>
        {opcoes.map((item) => (
          <Filtro key={item.valor} href={`/pessoas/sugestoes?tema=${item.valor}`} ativo={tema === item.valor}>
            {item.rotulo}
          </Filtro>
        ))}
      </nav>
      {itens.length === 0 ? <EmptyState icon="lightbulb" title={SUGESTAO_MENSAGENS.listaVazia} /> : null}
      <ul className="flex flex-col gap-3">
        {itens.map((item) => (
          <li key={item.id} className="rounded-xl border border-border-default bg-surface p-4 shadow-sm">
            <p className="font-mono text-xs tabular-nums text-text-muted">{item.quando}</p>
            <p className="mt-1 text-sm font-semibold text-text-strong">{item.nome} · {item.rotulo}</p>
            <p className="mt-2 whitespace-pre-wrap text-sm text-text-strong">{item.texto}</p>
            {item.fotoUrl ? <img alt="" className="mt-3 max-h-48 rounded-xl" src={item.fotoUrl} /> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Filtro({ href, ativo, children }: { href: string; ativo: boolean; children: string }) {
  return (
    <a href={href} className={`inline-flex min-h-11 items-center rounded-full px-4 text-sm ${ativo ? 'bg-amber-600 text-white' : 'bg-stone-100 text-stone-700'}`}>
      {children}
    </a>
  );
}
