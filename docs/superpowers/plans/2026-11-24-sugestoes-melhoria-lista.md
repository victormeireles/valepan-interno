# Sugestões de melhoria — parte lista

Continuação de `2026-11-24-sugestoes-melhoria-telas.md`. Tarefa 11.

### Task 11: Lista interna

**Files:**
- Create: `src/domain/sugestoes/sugestao-data-hora.ts`
- Create: `src/lib/services/sugestao-lista-leitura.ts`
- Create: `src/lib/services/sugestao-lista-fonte.ts`
- Create: `src/app/pessoas/sugestoes/page.tsx`
- Create: `src/features/sugestoes/SugestoesLista.tsx`
- Test: `src/domain/sugestoes/sugestao-data-hora.test.ts`
- Test: `src/lib/services/sugestao-lista-leitura.test.ts`
- Modify: `src/components/Hub/hub-nav-config.ts` (item depois de Extras)
- Modify: `src/config/main-nav-config.ts` (link depois de Extras)
- Modify: `src/config/main-nav-config.test.ts` (o array de `groupHrefs('pessoas')`)

**Interfaces:**
- Consumes: `SugestaoTemaCatalogo`, `requireInternoModulo`, `createServiceRoleClient`, `SugestaoFotoStorage.signedUrls`
- Produces: `SugestaoDataHora.formatar(iso: string): string` em `dd/MM/yyyy HH:mm`, fuso `America/Sao_Paulo`. `SugestaoListaItem = { id, quando, nome, rotulo, texto, fotoUrl }`. `SugestaoListaFonte.buscar(tema: string | null)` devolve no máximo 200, já filtradas. `SugestaoListaLeitura.listar(tema: string | null)`. Tema desconhecido busca como “Todos”. Falha de URL deixa `fotoUrl` nulo e mantém a linha.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { SugestaoDataHora } from './sugestao-data-hora';

describe('SugestaoDataHora', () => {
  it('formata no fuso de São Paulo', () => {
    expect(new SugestaoDataHora().formatar('2026-11-24T13:08:00.000Z')).toBe('24/11/2026 10:08');
  });
});
```

```ts
import { describe, expect, it } from 'vitest';
import type { SugestaoListaBruta, SugestaoListaFonte } from './sugestao-lista-leitura';
import { SugestaoListaLeitura } from './sugestao-lista-leitura';

const LINHA: SugestaoListaBruta = {
  id: '1', tema: 'seguranca', texto: 'melhorar o piso da área',
  fotoPath: 'a.jpg', criadoEm: '2026-11-24T13:08:00.000Z', nome: 'Ana',
};

describe('SugestaoListaLeitura', () => {
  it('formata, rotula e segue sem foto se a URL falhar', async () => {
    const fonte: SugestaoListaFonte = { async buscar() { return [LINHA]; } };
    const fotos = { async signedUrls() { throw new Error('storage'); } };
    const [item] = await new SugestaoListaLeitura(fonte, fotos).listar('seguranca');
    expect(item.quando).toBe('24/11/2026 10:08');
    expect(item.rotulo).toBe('Segurança');
    expect(item.fotoUrl).toBeNull();
    expect(item.nome).toBe('Ana');
  });

  it('trata tema desconhecido como todos', async () => {
    let recebido: string | null = 'x';
    const fonte: SugestaoListaFonte = {
      async buscar(tema) { recebido = tema; return []; },
    };
    await new SugestaoListaLeitura(fonte, { async signedUrls() { return new Map(); } }).listar('outro');
    expect(recebido).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/domain/sugestoes/sugestao-data-hora.test.ts src/lib/services/sugestao-lista-leitura.test.ts`
Expected: FAIL, cannot find module

- [ ] **Step 3: Write minimal implementation**

`sugestao-data-hora.ts` usa `formatToParts` com `timeZone: 'America/Sao_Paulo'`, `hourCycle: 'h23'` e devolve `dd/MM/yyyy HH:mm`.

```ts
export class SugestaoDataHora {
  formatar(iso: string): string {
    const partes = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date(iso));
    const pegar = (tipo: Intl.DateTimeFormatPartTypes) =>
      partes.find((parte) => parte.type === tipo)?.value ?? '';
    return `${pegar('day')}/${pegar('month')}/${pegar('year')} ${pegar('hour')}:${pegar('minute')}`;
  }
}
```

A leitura e a fonte ficam em `sugestao-lista-leitura.ts` (tipos e classe) e `sugestao-lista-fonte.ts` (Supabase). A fonte faz `select` de `id, tema, texto, foto_path, criado_em, pessoas_colaboradores(nome)`, `order('criado_em', { ascending: false })`, `limit(200)` e, se `tema` não for nulo, `eq('tema', tema)`. O join pode vir objeto ou array; use o primeiro nome. `SugestaoListaLeitura.listar` ignora tema que `SugestaoTemaCatalogo.aceita` recuse, pede as URLs e, se `signedUrls` lançar, segue com mapa vazio.

Página `src/app/pessoas/sugestoes/page.tsx` chama `requireInternoModulo('interno_pessoas', 'ler')`, aceita o `tema` da query só se `SugestaoTemaCatalogo.aceita`, e passa esse valor para `listar` e para `SugestoesLista`.

`SugestoesLista` mostra o filtro “Todos” em `/pessoas/sugestoes` e um link por `opcoes()` em `/pessoas/sugestoes?tema=`. Lista vazia: `EmptyState` com `title="Nenhuma sugestão ainda."`. Cada linha: `quando` em `font-mono tabular-nums`, nome, rótulo, texto e `<img>` só quando `fotoUrl` existe.

Hub, depois de Extras e antes de Visão geral:

```ts
{
  href: '/pessoas/sugestoes',
  title: 'Sugestões',
  description: 'Melhorias enviadas pelo QR',
  icon: 'lightbulb',
  moduloId: 'interno_pessoas',
},
```

O mesmo href, label “Sugestões” e ícone `lightbulb` no grupo Pessoas de `main-nav-config.ts`, entre Extras e Visão geral, com `match` `startsWith('/pessoas/sugestoes')`.

No teste, o array de `groupHrefs('pessoas')` ganha `'/pessoas/sugestoes'` antes de `'/pessoas/painel'`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/domain/sugestoes/sugestao-data-hora.test.ts src/lib/services/sugestao-lista-leitura.test.ts src/config/main-nav-config.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/domain/sugestoes/sugestao-data-hora.ts src/domain/sugestoes/sugestao-data-hora.test.ts src/lib/services/sugestao-lista-leitura.ts src/lib/services/sugestao-lista-leitura.test.ts src/lib/services/sugestao-lista-fonte.ts src/app/pessoas/sugestoes/page.tsx src/features/sugestoes/SugestoesLista.tsx src/components/Hub/hub-nav-config.ts src/config/main-nav-config.ts src/config/main-nav-config.test.ts
git commit -m "feat(sugestoes): lista as melhorias para quem lê Pessoas"
```

A fonte e a lista, para não ficarem só descritas:

```ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { SugestaoListaBruta } from '@/lib/services/sugestao-lista-leitura';

type Join = { nome: string } | { nome: string }[] | null;
type Row = {
  id: string; tema: string; texto: string; foto_path: string | null;
  criado_em: string; pessoas_colaboradores: Join;
};

function nomeDe(valor: Join): string {
  if (!valor) return '';
  return Array.isArray(valor) ? valor[0]?.nome ?? '' : valor.nome;
}

export class SugestaoListaFonteSupabase {
  constructor(private readonly db: SupabaseClient) {}

  async buscar(tema: string | null): Promise<SugestaoListaBruta[]> {
    let consulta = this.db.from('sugestoes_melhoria' as never)
      .select('id, tema, texto, foto_path, criado_em, pessoas_colaboradores(nome)')
      .order('criado_em', { ascending: false })
      .limit(200);
    if (tema) consulta = consulta.eq('tema', tema);
    const { data, error } = await consulta;
    if (error) throw new Error(error.message);
    return ((data ?? []) as Row[]).map((row) => ({
      id: row.id, tema: row.tema, texto: row.texto,
      fotoPath: row.foto_path, criadoEm: row.criado_em, nome: nomeDe(row.pessoas_colaboradores),
    }));
  }
}
```

```ts
import { SugestaoDataHora } from '@/domain/sugestoes/sugestao-data-hora';
import { SugestaoTemaCatalogo } from '@/domain/sugestoes/sugestao-tema-catalogo';

export type SugestaoListaBruta = {
  id: string; tema: string; texto: string; fotoPath: string | null; criadoEm: string; nome: string;
};

export type SugestaoListaItem = {
  id: string; quando: string; nome: string; rotulo: string; texto: string; fotoUrl: string | null;
};

export interface SugestaoListaFonte {
  buscar(tema: string | null): Promise<SugestaoListaBruta[]>;
}

export class SugestaoListaLeitura {
  constructor(
    private readonly fonte: SugestaoListaFonte,
    private readonly fotos: { signedUrls(paths: string[]): Promise<Map<string, string>> },
    private readonly datas = new SugestaoDataHora(),
    private readonly temas = new SugestaoTemaCatalogo(),
  ) {}

  async listar(tema: string | null): Promise<SugestaoListaItem[]> {
    const filtro = tema && this.temas.aceita(tema) ? tema : null;
    const linhas = await this.fonte.buscar(filtro);
    const urls = await this.urls(linhas);
    return linhas.map((linha) => this.item(linha, urls));
  }

  private async urls(linhas: SugestaoListaBruta[]): Promise<Map<string, string>> {
    try {
      return await this.fotos.signedUrls(linhas.flatMap((linha) => linha.fotoPath ? [linha.fotoPath] : []));
    } catch {
      return new Map();
    }
  }

  private item(linha: SugestaoListaBruta, urls: Map<string, string>): SugestaoListaItem {
    return {
      id: linha.id,
      quando: this.datas.formatar(linha.criadoEm),
      nome: linha.nome,
      rotulo: this.temas.rotulo(linha.tema),
      texto: linha.texto,
      fotoUrl: linha.fotoPath ? urls.get(linha.fotoPath) ?? null : null,
    };
  }
}
```

O código da fonte e da leitura acima entra no Step 3, antes do Step 4. `SugestoesLista.tsx`:

```tsx
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
```

Página:

```tsx
import { SugestoesLista } from '@/features/sugestoes/SugestoesLista';
import { SugestaoTemaCatalogo } from '@/domain/sugestoes/sugestao-tema-catalogo';
import { requireInternoModulo } from '@/lib/auth/require-interno-modulo';
import { createServiceRoleClient } from '@/lib/clients/supabase-client-factory';
import { SugestaoFotoStorage } from '@/lib/services/sugestao-foto-storage';
import { SugestaoListaFonteSupabase } from '@/lib/services/sugestao-lista-fonte';
import { SugestaoListaLeitura } from '@/lib/services/sugestao-lista-leitura';

export const dynamic = 'force-dynamic';

export default async function PessoasSugestoesPage({
  searchParams,
}: {
  searchParams: Promise<{ tema?: string }>;
}) {
  await requireInternoModulo('interno_pessoas', 'ler');
  const bruto = (await searchParams).tema ?? '';
  const temas = new SugestaoTemaCatalogo();
  const tema = temas.aceita(bruto) ? bruto : null;
  const db = createServiceRoleClient();
  const itens = await new SugestaoListaLeitura(
    new SugestaoListaFonteSupabase(db),
    new SugestaoFotoStorage(db),
  ).listar(tema);
  return <SugestoesLista itens={itens} tema={tema} />;
}
```
