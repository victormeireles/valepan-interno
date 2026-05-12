# Ordem diária ↔ OP + remoção da fila «planejamento» — Plano de implementação

> **Para agentes:** REQUIRED SUB-SKILL: usar `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans` para implementar tarefa a tarefa. Passos usam checkbox (`- [ ]`).

**Goal:** Cada linha gravada em `/producao/ordem-producao` cria ou actualiza `interno.ordens_producao` com vínculo em `ordens_producao_diarias_itens.ordens_producao_id`; remover a estação `planejamento` da fila e o UI antigo (`NovaOrdemModal`, `PlanningQueueTable`); default da fila = massa.

**Architecture:** Migração SQL única (`interno`) + módulo puro `ordem-producao-assadeira.ts` (mapear `tipo_lata` → `assadeira_id`) + módulo `ordem-producao-op-sync.ts` (gerar `lote_codigo` por data de produção da OP, insert/update OP) chamado a partir de `upsertOrdemProducaoItem` e `reorderOrdemProducaoItems`; nova action `removeOrdemProducaoDiariaItem` que chama `cancelProductionOrder` e depois apaga o item.

**Tech Stack:** Next.js 15 App Router, Server Actions, Supabase JS (service role), Vitest, TypeScript.

---

## Mapa de ficheiros

| Ficheiro | Responsabilidade |
|----------|-------------------|
| `sql/MIGRACAO_OFICIAL_ORDEM_DIARIA_OP_INTERNO.sql` (criar) | Script único: tabelas diárias + `ordens_producao_id` + colunas OP + RLS (conteúdo = spec `2026-05-12-ordem-producao-op-vinculada-design.md` secção SQL). |
| `src/lib/production/ordem-producao-assadeira.ts` (criar) | Função pura `resolveAssadeiraIdForTipoLata` + tipos mínimos. |
| `src/lib/production/ordem-producao-assadeira.test.ts` (criar) | Vitest para antiga/nova/outra. |
| `src/lib/production/ordem-producao-op-sync.ts` (criar) | `generateLoteCodigoForDataProducao`, `insertOrdemProducaoForDiariaItem`, `updateOrdemProducaoForDiariaItem`, `assertOpEditable`. |
| `src/app/actions/producao-actions.ts` (alterar) | `upsertOrdemProducaoItem`, `reorderOrdemProducaoItems`, novo `removeOrdemProducaoDiariaItem`, `getOrdemProducaoDiariaByDate` (select + join), mensagens de erro de migração, `revalidatePath` para `/producao/fila` e `/producao/ordem-producao`. |
| `src/types/database.ts` + `types/database.ts` | Regenerar após migração (`npm run gen:types`). |
| `src/app/producao/fila/page.tsx` | Remover ramo `station === 'planejamento'`; default de `station` para massa alinhado com `normalizeFilaStationQuery`. |
| `src/app/producao/fila/ProductionQueueClient.tsx` | Remover imports/uso de `NovaOrdemModal`, `PlanningQueueTable`, estados e ramos `effectiveStation === 'planejamento'`. |
| `src/components/Navigation.tsx` | Remover link «Planejamento»; ajustar `isFilaPlanejamentoActive` se existir. |
| `src/lib/production/production-station-routes.ts` | `normalizeFilaStationQuery`: vazio → `massa` (não `planejamento`). |
| `src/hooks/useProductionQueueStation.ts` | Default inicial = `massa`. |
| `src/hooks/useProductionQueueDerived.ts` | Remover ou substituir `isPlanning` baseado em `planejamento`. |
| `src/components/Producao/queue/production-queue-metrics.ts` | Remover ramos `case 'planejamento'` ou mapear para `massa` onde ainda precisares de quantidade (preferir remover se deixar de existir o tipo). |
| `src/lib/utils/production-conversions.ts` + `production-conversions.test.ts` | Remover `"planejamento"` do union `Station` **apenas** se nenhum import restante quebrar; actualizar todos os `switch`/testes. |
| `src/app/actions/producao-fila-sync-actions.ts` | Ajustar tipo `EtapaFilaSyncPreRequisitos` se referenciar `Station` sem `planejamento`. |
| `src/components/Producao/ordem/OrdemProducaoGrid.tsx` + `OrdemProducaoRow.tsx` | Botão/remover linha → chama `removeOrdemProducaoDiariaItem`; opcional mostrar `lote_codigo` vindo da view. |
| `src/app/producao/ordem-producao/OrdemProducaoClient.tsx` | Texto do botão «Publicar» (não implica «criar OPs»). |
| `src/components/Producao/NovaOrdemModal.tsx` | **Apagar** ficheiro após remover uso. |
| `src/components/Producao/PlanningQueueTable.tsx` | **Apagar** ficheiro após remover uso. |

---

### Task 1: Script SQL oficial no repositório

**Files:**
- Create: `sql/MIGRACAO_OFICIAL_ORDEM_DIARIA_OP_INTERNO.sql`
- Reference: `docs/superpowers/specs/2026-05-12-ordem-producao-op-vinculada-design.md` (copiar bloco SQL completo)

- [ ] **Step 1: Criar pasta e ficheiro**

Criar `sql/` na raiz do repo se não existir. Colar no ficheiro **integralmente** o SQL entre as cercas do spec (secção «Migração SQL oficial unificada»), desde o comentário `-- =============================================================================` até ao último `CREATE POLICY ... ordens_producao_diarias_itens_delete_admin`.

- [ ] **Step 2: Aplicar no Supabase**

No SQL Editor do projecto, executar o ficheiro inteiro uma vez.

Expected: sem erros; tabelas `interno.ordens_producao_diarias` e `interno.ordens_producao_diarias_itens` existem; coluna `ordens_producao_diarias_itens.ordens_producao_id` existe.

- [ ] **Step 3: Commit**

```bash
git add sql/MIGRACAO_OFICIAL_ORDEM_DIARIA_OP_INTERNO.sql
git commit -m "chore(db): migração oficial ordem diária + vínculo OP (interno)"
```

(Se `*.md` ou outros padrões ignorarem ficheiros, usar `git add -f` conforme `.gitignore`.)

---

### Task 2: Regenerar tipos Supabase

**Files:**
- Modify: `src/types/database.ts`, `types/database.ts` (gerados)

- [ ] **Step 1: Correr gerador**

```bash
cd "c:\Users\victo\OneDrive\Documents\Cursor Projects\Valepan\valepan-interno"
npm run gen:types
```

Expected: ficheiros actualizados; em `interno.Tables['ordens_producao_diarias_itens'].Row` aparece `ordens_producao_id: string | null`.

- [ ] **Step 2: Commit**

```bash
git add src/types/database.ts types/database.ts
git commit -m "chore(types): regenerar após migração ordem diária + OP"
```

---

### Task 3: Função pura `resolveAssadeiraIdForTipoLata` + testes

**Files:**
- Create: `src/lib/production/ordem-producao-assadeira.ts`
- Create: `src/lib/production/ordem-producao-assadeira.test.ts`

- [ ] **Step 1: Implementar ficheiro de produção**

Create `src/lib/production/ordem-producao-assadeira.ts`:

```typescript
import type { OrdemProducaoTipoLata } from '@/domain/types/ordem-producao';

export type AssadeiraCandidato = {
  assadeira_id: string;
  unidades_por_assadeira: number;
};

export type ProdutoUnidadesLataMeta = {
  unidades_assadeira: number | null;
  unidades_lata_antiga: number | null;
  unidades_lata_nova: number | null;
};

/**
 * Escolhe assadeira_id a partir do tipo de lata da ordem diária e das linhas
 * `produto_assadeiras` (já ordenadas como a UI deve preferir).
 */
export function resolveAssadeiraIdForTipoLata(
  tipoLata: OrdemProducaoTipoLata,
  meta: ProdutoUnidadesLataMeta,
  candidatos: AssadeiraCandidato[],
): string | null {
  if (!candidatos.length) return null;

  const ua = meta.unidades_assadeira;
  const uAnt = meta.unidades_lata_antiga ?? ua;
  const uNova = meta.unidades_lata_nova;

  const matchUnidades = (u: number | null | undefined): string | null => {
    if (u == null || !Number.isFinite(u)) return null;
    const c = candidatos.find((x) => x.unidades_por_assadeira === u);
    return c?.assadeira_id ?? null;
  };

  if (tipoLata === 'antiga') {
    return matchUnidades(uAnt) ?? candidatos[0]!.assadeira_id;
  }
  if (tipoLata === 'nova') {
    return matchUnidades(uNova) ?? candidatos[0]!.assadeira_id;
  }
  // outra: primeira cujo par de unidades não coincide só com antiga nem só com nova
  for (const c of candidatos) {
    const isAnt = uAnt != null && c.unidades_por_assadeira === uAnt;
    const isNov = uNova != null && c.unidades_por_assadeira === uNova;
    if (!isAnt && !isNov) return c.assadeira_id;
  }
  return candidatos[0]!.assadeira_id;
}
```

- [ ] **Step 2: Escrever testes Vitest**

Create `src/lib/production/ordem-producao-assadeira.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  resolveAssadeiraIdForTipoLata,
  type AssadeiraCandidato,
  type ProdutoUnidadesLataMeta,
} from './ordem-producao-assadeira';

const meta: ProdutoUnidadesLataMeta = {
  unidades_assadeira: 10,
  unidades_lata_antiga: 12,
  unidades_lata_nova: 14,
};

const candidatos: AssadeiraCandidato[] = [
  { assadeira_id: 'a-ant', unidades_por_assadeira: 12 },
  { assadeira_id: 'a-nov', unidades_por_assadeira: 14 },
  { assadeira_id: 'a-out', unidades_por_assadeira: 20 },
];

describe('resolveAssadeiraIdForTipoLata', () => {
  it('antiga: escolhe assadeira com unidades da lata antiga', () => {
    expect(resolveAssadeiraIdForTipoLata('antiga', meta, candidatos)).toBe('a-ant');
  });
  it('nova: escolhe assadeira com unidades da lata nova', () => {
    expect(resolveAssadeiraIdForTipoLata('nova', meta, candidatos)).toBe('a-nov');
  });
  it('outra: escolhe candidato que não é só antiga nem só nova', () => {
    expect(resolveAssadeiraIdForTipoLata('outra', meta, candidatos)).toBe('a-out');
  });
  it('fallback: uma única candidata', () => {
    const one = [{ assadeira_id: 'only', unidades_por_assadeira: 99 }];
    expect(resolveAssadeiraIdForTipoLata('antiga', meta, one)).toBe('only');
  });
});
```

- [ ] **Step 3: Correr testes**

```bash
npm run test -- src/lib/production/ordem-producao-assadeira.test.ts
```

Expected: 4 tests passed.

- [ ] **Step 4: Commit**

```bash
git add src/lib/production/ordem-producao-assadeira.ts src/lib/production/ordem-producao-assadeira.test.ts
git commit -m "feat(production): resolver assadeira por tipo_lata (ordem diária)"
```

---

### Task 4: Módulo `ordem-producao-op-sync.ts`

**Files:**
- Create: `src/lib/production/ordem-producao-op-sync.ts`

- [ ] **Step 1: Implementar geração de lote por data de produção**

Create `src/lib/production/ordem-producao-op-sync.ts`:

```typescript
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { normalizeToISODate } from '@/lib/utils/date-utils';

const PLANEJADO_EDITAVEL = 'planejado' as const;

export function isOrdemProducaoPlanejadaEditavel(status: string | null | undefined): boolean {
  return (status ?? PLANEJADO_EDITAVEL) === PLANEJADO_EDITAVEL;
}

/**
 * Gera `OP-YYYYMMDD-xxx` com prefixo baseado na data de produção (YYYY-MM-DD),
 * contando ordens existentes com o mesmo prefixo (inclui canceladas no count de sequência — aceitável; alternativa: excluir cancelado numa iteracão futura).
 */
export async function generateLoteCodigoForDataProducao(
  supabase: SupabaseClient<Database>,
  dataProducaoIso: string,
): Promise<string> {
  const d = normalizeToISODate(dataProducaoIso).replace(/-/g, '');
  const prefix = `OP-${d}-`;
  const { data: lastOp } = await supabase
    .from('ordens_producao')
    .select('lote_codigo')
    .ilike('lote_codigo', `${prefix}%`)
    .order('lote_codigo', { ascending: false })
    .limit(1)
    .maybeSingle();

  let sequence = 1;
  if (lastOp?.lote_codigo) {
    const parts = lastOp.lote_codigo.split('-');
    if (parts.length === 3) {
      const n = parseInt(parts[2]!, 10);
      if (!Number.isNaN(n)) sequence = n + 1;
    }
  }
  return `${prefix}${String(sequence).padStart(3, '0')}`;
}
```

- [ ] **Step 2: Commit parcial**

```bash
git add src/lib/production/ordem-producao-op-sync.ts
git commit -m "feat(production): gerar lote OP por data de produção"
```

(Na **Task 5** vais acrescentar ao mesmo ficheiro `insertOrdemProducaoForDiariaItem` e `updateOrdemProducaoForDiariaItem` que usam `resolveAssadeiraIdForTipoLata` e queries `produtos` / `produto_assadeiras` — mantém o ficheiro coeso.)

---

### Task 5: Completar `ordem-producao-op-sync.ts` (insert/update OP)

**Files:**
- Modify: `src/lib/production/ordem-producao-op-sync.ts`

- [ ] **Step 1: Adicionar imports e funções de sync**

No topo do mesmo ficheiro, acrescentar:

```typescript
import {
  resolveAssadeiraIdForTipoLata,
  type AssadeiraCandidato,
  type ProdutoUnidadesLataMeta,
} from '@/lib/production/ordem-producao-assadeira';
import type { OrdemProducaoTipoLata } from '@/domain/types/ordem-producao';
```

Acrescentar ao ficheiro (ajusta tipos `Json` se o linter exigir cast explícito para `pedido_id: null`):

```typescript
export type DiariaHeaderDates = {
  dataProducao: string;
  dataEtiquetaDefault: string;
};

export async function fetchProdutoMetaForAssadeira(
  supabase: SupabaseClient<Database>,
  produtoId: string,
): Promise<ProdutoUnidadesLataMeta | null> {
  const { data, error } = await supabase
    .from('produtos')
    .select('unidades_assadeira, unidades_lata_antiga, unidades_lata_nova')
    .eq('id', produtoId)
    .maybeSingle();
  if (error || !data) return null;
  return {
    unidades_assadeira: data.unidades_assadeira ?? null,
    unidades_lata_antiga: data.unidades_lata_antiga ?? null,
    unidades_lata_nova: data.unidades_lata_nova ?? null,
  };
}

export async function fetchAssadeiraCandidatos(
  supabase: SupabaseClient<Database>,
  produtoId: string,
): Promise<AssadeiraCandidato[]> {
  const { data, error } = await supabase
    .from('produto_assadeiras')
    .select('assadeira_id, unidades_por_assadeira, ordem')
    .eq('produto_id', produtoId);
  if (error || !data?.length) return [];
  const rows = data
    .map((r) => ({
      assadeira_id: String(r.assadeira_id),
      unidades_por_assadeira: Math.round(Number(r.unidades_por_assadeira)),
      ordem: r.ordem ?? 0,
    }))
    .filter((r) => r.assadeira_id && Number.isFinite(r.unidades_por_assadeira) && r.unidades_por_assadeira > 0);
  rows.sort((a, b) => a.ordem - b.ordem);
  return rows.map(({ assadeira_id, unidades_por_assadeira }) => ({
    assadeira_id,
    unidades_por_assadeira,
  }));
}

export async function insertOrdemProducaoForDiariaItem(input: {
  supabase: SupabaseClient<Database>;
  header: DiariaHeaderDates;
  itemId: string;
  prioridade: number;
  produtoId: string;
  tipoLata: OrdemProducaoTipoLata;
  latasPlanejadas: number;
  dataProducaoOverride: string | null;
}): Promise<{ opId: string } | { error: string }> {
  const dataProducaoOp =
    input.dataProducaoOverride != null && String(input.dataProducaoOverride).trim() !== ''
      ? normalizeToISODate(input.dataProducaoOverride)
      : normalizeToISODate(input.header.dataProducao);

  const meta = await fetchProdutoMetaForAssadeira(input.supabase, input.produtoId);
  if (!meta) return { error: 'Produto não encontrado para resolver lata.' };
  const candidatos = await fetchAssadeiraCandidatos(input.supabase, input.produtoId);
  const assadeiraId = resolveAssadeiraIdForTipoLata(input.tipoLata, meta, candidatos);

  const lote = await generateLoteCodigoForDataProducao(input.supabase, dataProducaoOp);

  const { data: inserted, error } = await input.supabase
    .from('ordens_producao')
    .insert({
      produto_id: input.produtoId,
      qtd_planejada: input.latasPlanejadas,
      pedido_id: null,
      prioridade: 0,
      lote_codigo: lote,
      status: 'planejado',
      data_producao: dataProducaoOp,
      ordem_planejamento: input.prioridade,
      assadeira_id: assadeiraId,
      temporaria: false,
      temporaria_expira_em: null,
    })
    .select('id')
    .single();

  if (error || !inserted?.id) {
    return { error: error?.message ?? 'Falha ao criar ordem de produção.' };
  }

  const { error: linkErr } = await input.supabase
    .from('ordens_producao_diarias_itens')
    .update({ ordens_producao_id: inserted.id, updated_at: new Date().toISOString() })
    .eq('id', input.itemId);

  if (linkErr) {
    await input.supabase.from('ordens_producao').delete().eq('id', inserted.id);
    return { error: linkErr.message };
  }

  return { opId: inserted.id };
}

export async function updateOrdemProducaoForDiariaItem(input: {
  supabase: SupabaseClient<Database>;
  opId: string;
  header: DiariaHeaderDates;
  prioridade: number;
  produtoId: string;
  tipoLata: OrdemProducaoTipoLata;
  latasPlanejadas: number;
  dataProducaoOverride: string | null;
}): Promise<{ ok: true } | { error: string }> {
  const { data: op, error: fe } = await input.supabase
    .from('ordens_producao')
    .select('id, status')
    .eq('id', input.opId)
    .maybeSingle();
  if (fe || !op) return { error: fe?.message ?? 'OP não encontrada.' };
  if (!isOrdemProducaoPlanejadaEditavel(op.status)) {
    return {
      error:
        'Esta ordem já saiu do estado planejado; não é possível alterar produto, quantidade ou lata aqui.',
    };
  }

  const dataProducaoOp =
    input.dataProducaoOverride != null && String(input.dataProducaoOverride).trim() !== ''
      ? normalizeToISODate(input.dataProducaoOverride)
      : normalizeToISODate(input.header.dataProducao);

  const meta = await fetchProdutoMetaForAssadeira(input.supabase, input.produtoId);
  if (!meta) return { error: 'Produto não encontrado.' };
  const candidatos = await fetchAssadeiraCandidatos(input.supabase, input.produtoId);
  const assadeiraId = resolveAssadeiraIdForTipoLata(input.tipoLata, meta, candidatos);

  const { error } = await input.supabase
    .from('ordens_producao')
    .update({
      produto_id: input.produtoId,
      qtd_planejada: input.latasPlanejadas,
      data_producao: dataProducaoOp,
      ordem_planejamento: input.prioridade,
      assadeira_id: assadeiraId,
    })
    .eq('id', input.opId)
    .or('status.eq.planejado,status.is.null');

  if (error) return { error: error.message };
  return { ok: true };
}
```

- [ ] **Step 2: `npm run lint` no ficheiro**

```bash
npx eslint src/lib/production/ordem-producao-op-sync.ts --max-warnings 0
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/production/ordem-producao-op-sync.ts
git commit -m "feat(production): sync OP com item da ordem diária"
```

---

### Task 6: Integrar sync em `upsertOrdemProducaoItem`

**Files:**
- Modify: `src/app/actions/producao-actions.ts`

- [ ] **Step 1: Importar helpers**

```typescript
import {
  insertOrdemProducaoForDiariaItem,
  updateOrdemProducaoForDiariaItem,
} from '@/lib/production/ordem-producao-op-sync';
```

- [ ] **Step 2: No ramo `if (itemId)` (update de item existente)**

Depois do `update` bem-sucedido em `ordens_producao_diarias_itens`:

1. `select('ordens_producao_id, data_producao_override, ordem_diaria_id, prioridade').eq('id', itemId).single()`
2. Carregar cabeçalho: `ordens_producao_diarias` por `ordem_diaria_id` → `data_producao`, `data_etiqueta_default`.
3. Se `ordens_producao_id` for null, chamar `insertOrdemProducaoForDiariaItem({ supabase, header, itemId, prioridade: row.prioridade, produtoId, tipoLata, latasPlanejadas, dataProducaoOverride: row.data_producao_override })`; se retornar `error`, fazer rollback manual: reverter update do item (opcional) ou devolver erro ao cliente.
4. Se não for null, chamar `updateOrdemProducaoForDiariaItem({ supabase, opId: ordens_producao_id, header, prioridade: row.prioridade ?? input.prioridade, ... })`.

- [ ] **Step 3: No ramo insert (item novo)**

Após `.insert(insertRow).select('id').single()`:

1. Buscar cabeçalho da ordem `ordemId` para datas.
2. `insertOrdemProducaoForDiariaItem` com `itemId: inserted.id`, `prioridade` calculada.

- [ ] **Step 4: Revalidar fila**

```typescript
revalidatePath('/producao/fila');
revalidatePath(PATH_PRODUCAO_ORDEM_DIARIA);
```

- [ ] **Step 5: Actualizar mensagem de migração**

Substituir referências a `MIGRACAO_ORDENS_PRODUCAO_DIARIAS.sql` por `sql/MIGRACAO_OFICIAL_ORDEM_DIARIA_OP_INTERNO.sql` nas strings devolvidas por `isMissingOrdemDiariaTableError` / erros amigáveis.

- [ ] **Step 6: Commit**

```bash
git add src/app/actions/producao-actions.ts
git commit -m "feat(actions): upsert item diário cria/atualiza ordens_producao"
```

---

### Task 7: `reorderOrdemProducaoItems` + `removeOrdemProducaoDiariaItem`

**Files:**
- Modify: `src/app/actions/producao-actions.ts`

- [ ] **Step 1: `reorderOrdemProducaoItems`**

Após cada `update` de `prioridade` no item, fazer:

```typescript
const { data: row } = await supabase
  .from('ordens_producao_diarias_itens')
  .select('ordens_producao_id')
  .eq('id', iid)
  .maybeSingle();
if (row?.ordens_producao_id) {
  await supabase
    .from('ordens_producao')
    .update({ ordem_planejamento: pr })
    .eq('id', row.ordens_producao_id);
}
```

- [ ] **Step 2: Nova action `removeOrdemProducaoDiariaItem`**

```typescript
'use server';

// Dentro de producao-actions.ts (já tem 'use server' no topo do ficheiro)

export async function removeOrdemProducaoDiariaItem(
  ordemDiariaId: string,
  itemId: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = supabaseClientFactory.createServiceRoleClient();
  const oid = ordemDiariaId?.trim();
  const iid = itemId?.trim();
  if (!oid || !iid) return { success: false, error: 'Parâmetros inválidos.' };

  const { data: item, error: selErr } = await supabase
    .from('ordens_producao_diarias_itens')
    .select('id, ordens_producao_id')
    .eq('id', iid)
    .eq('ordem_diaria_id', oid)
    .maybeSingle();

  if (selErr) return { success: false, error: selErr.message };
  if (!item) return { success: false, error: 'Linha não encontrada.' };

  if (item.ordens_producao_id) {
    const cancel = await cancelProductionOrder(item.ordens_producao_id);
    if (!cancel.success) {
      return { success: false, error: cancel.error };
    }
  }

  const { error: delErr } = await supabase.from('ordens_producao_diarias_itens').delete().eq('id', iid);
  if (delErr) return { success: false, error: delErr.message };

  revalidatePath(PATH_PRODUCAO_ORDEM_DIARIA);
  revalidatePath('/producao/fila');
  return { success: true };
}
```

Nota: `cancelProductionOrder` já valida `status === 'planejado'`; se a OP avançou, devolve erro — alinhado ao spec.

- [ ] **Step 3: Commit**

```bash
git add src/app/actions/producao-actions.ts
git commit -m "feat(actions): reordenar OP com item; remover linha diária cancela OP"
```

---

### Task 8: View `getOrdemProducaoDiariaByDate` com `lote_codigo`

**Files:**
- Modify: `src/app/actions/producao-actions.ts` (tipo `OrdemProducaoDiariaItemView` + query)

- [ ] **Step 1: Estender tipo**

```typescript
export type OrdemProducaoDiariaItemView = {
  id: string;
  prioridade: number;
  produtoId: string;
  produtoNome: string;
  tipoLata: string;
  latasPlanejadas: number;
  caixasEstimadas: number;
  clientes: string[];
  dataProducaoOverride: string | null;
  dataEtiquetaOverride: string | null;
  observacao: string | null;
  statusLinha: string;
  ordensProducaoId: string | null;
  loteCodigo: string | null;
};
```

- [ ] **Step 2: Na query de itens**, usar select aninhado ou segundo passo: para cada item, `ordens_producao_id` + join `ordens_producao ( lote_codigo )` se PostgREST permitir:

```
.select(`
  id,
  prioridade,
  ...,
  ordens_producao_id,
  ordens_producao ( lote_codigo )
`)
```

Mapear `loteCodigo` a partir de `row.ordens_producao`.

- [ ] **Step 3: Commit**

```bash
git add src/app/actions/producao-actions.ts
git commit -m "feat(actions): expor lote da OP na view da ordem diária"
```

---

### Task 9: UI ordem — remover linha + copy publicar

**Files:**
- Modify: `src/components/Producao/ordem/OrdemProducaoRow.tsx`, `OrdemProducaoGrid.tsx`, `src/app/producao/ordem-producao/OrdemProducaoClient.tsx`

- [ ] **Step 1:** Importar `removeOrdemProducaoDiariaItem` na grid ou no client; passar callback `onRemoveItem(itemId)` que chama a action, `router.refresh()`, trata erro com `setError`.

- [ ] **Step 2:** Botão «Remover linha» visível só quando `statusLinha` / OP ainda editável (espelhar regra: OP `planejado` ou item em rascunho — alinhar com produto).

- [ ] **Step 3:** No `OrdemProducaoClient`, texto do publicar: ex. «Marcar dia como pronto» (não «gerar ordens»).

- [ ] **Step 4: Commit**

```bash
git add src/components/Producao/ordem/OrdemProducaoRow.tsx src/components/Producao/ordem/OrdemProducaoGrid.tsx src/app/producao/ordem-producao/OrdemProducaoClient.tsx
git commit -m "feat(ui): remover linha da ordem diária; clarificar publicar"
```

---

### Task 10: Rotas e fila — remover `planejamento`

**Files:**
- Modify: `src/lib/production/production-station-routes.ts`, `src/hooks/useProductionQueueStation.ts`, `src/app/producao/fila/page.tsx`, `src/app/producao/fila/ProductionQueueClient.tsx`, `src/components/Navigation.tsx`, `src/hooks/useProductionQueueDerived.ts`

- [ ] **Step 1: `production-station-routes.ts`**

Alterar:

```typescript
export function normalizeFilaStationQuery(raw: string | null | undefined): string {
  if (raw === 'forno') return 'entrada_forno';
  if (raw === 'embalagem') return 'entrada_embalagem';
  if (raw === '' || raw == null) return 'massa';
  if (raw === 'planejamento') return 'massa'; // URLs antigas
  return raw;
}
```

- [ ] **Step 2: `useProductionQueueStation.ts`**

Default `'massa'` em vez de `'planejamento'`.

- [ ] **Step 3: `fila/page.tsx`**

Remover bloco `if (station === 'planejamento') { ... }` completo; garantir `ProductionQueueClient` recebe `station` já normalizado (massa por defeito).

- [ ] **Step 4: `ProductionQueueClient.tsx`**

- Remover imports `NovaOrdemModal`, `PlanningQueueTable`.
- Remover estados `isModalOpen`, `editingOrder` se só serviam planejamento.
- Remover JSX condicional `effectiveStation === 'planejamento'` (tabela + modal).
- Default prop `station = 'massa'`.

- [ ] **Step 5: `Navigation.tsx`**

Remover link com `filaUrlForStation('planejamento', ...)` e variável `isFilaPlanejamentoActive` se ficar morta.

- [ ] **Step 6: `useProductionQueueDerived.ts`**

Remover `isPlanning: effectiveStation === 'planejamento'` ou repor `false` se outros consumidores quebrarem; preferir remover consumidores.

- [ ] **Step 7: Commit**

```bash
git add src/lib/production/production-station-routes.ts src/hooks/useProductionQueueStation.ts src/app/producao/fila/page.tsx src/app/producao/fila/ProductionQueueClient.tsx src/components/Navigation.tsx src/hooks/useProductionQueueDerived.ts
git commit -m "refactor(fila): remover estação planejamento; default massa"
```

---

### Task 11: `Station` type e métricas — remover `planejamento`

**Files:**
- Modify: `src/lib/utils/production-conversions.ts`, `src/lib/utils/production-conversions.test.ts`, `src/components/Producao/queue/production-queue-metrics.ts`, `src/app/actions/producao-fila-sync-actions.ts`

- [ ] **Step 1: `production-conversions.ts`**

Remover `"planejamento"` do union `Station`. No `getQuantityByStation` (e funções semelhantes), remover ramo `planejamento` ou tratar como `massa` se necessário temporariamente — o objectivo final é **só** estações operacionais.

- [ ] **Step 2: `production-conversions.test.ts`**

Renomear/alterar teste que referia `planejamento` para `massa`.

- [ ] **Step 3: `production-queue-metrics.ts`**

Remover `case 'planejamento':` em `getStationInfo` / secções de quantidade; remover entrada `planejamento` de mapas de labels se existir.

- [ ] **Step 4: `producao-fila-sync-actions.ts`**

Confirmar tipo `Station` importado; ajustar `EtapaFilaSyncPreRequisitos` se ainda excluir `planejamento` explicitamente (pode ficar `Exclude<Station, 'massa'>` apenas).

- [ ] **Step 5: Correr testes**

```bash
npm run test
```

Expected: todos passam.

- [ ] **Step 6: Commit**

```bash
git add src/lib/utils/production-conversions.ts src/lib/utils/production-conversions.test.ts src/components/Producao/queue/production-queue-metrics.ts src/app/actions/producao-fila-sync-actions.ts
git commit -m "refactor(production): remover estação planejamento dos tipos e métricas"
```

---

### Task 12: Apagar componentes mortos

**Files:**
- Delete: `src/components/Producao/NovaOrdemModal.tsx`
- Delete: `src/components/Producao/PlanningQueueTable.tsx`

- [ ] **Step 1: Garantir zero imports**

```bash
rg "NovaOrdemModal|PlanningQueueTable" src
```

Expected: no matches.

- [ ] **Step 2: Apagar ficheiros e commit**

```bash
git rm src/components/Producao/NovaOrdemModal.tsx src/components/Producao/PlanningQueueTable.tsx
git commit -m "chore(ui): remover modal nova ordem e tabela planejamento da fila"
```

---

### Task 13: Dead code opcional em `producao-actions.ts`

**Files:**
- Modify: `src/app/actions/producao-actions.ts`

- [ ] **Step 1:** Se `reorderProductionPlanningOrders` deixar sem referências (confirmar com `rg reorderProductionPlanningOrders`), **remover** a função exportada ou marcar `@deprecated` — preferir **remover** se grep confirmar zero usos.

- [ ] **Step 2: Commit** (se houve remoção)

```bash
git add src/app/actions/producao-actions.ts
git commit -m "chore(actions): remover reorderProductionPlanningOrders não usado"
```

---

## Cobertura do spec (self-review)

| Requisito no spec | Tarefa |
|-------------------|--------|
| Migração única `interno` + `ordens_producao_id` | Task 1–2 |
| OP ao gravar linha | Task 5–6 |
| Reorder sync `ordem_planejamento` | Task 7 |
| Remover linha = cancelar OP + apagar item | Task 7, 9 |
| Bloquear edição se não `planejado` | Task 5 (`updateOrdemProducaoForDiariaItem`) + cancel |
| `publish` não cria OPs; copy UI | Task 9 |
| Remover fila planejamento, default massa | Task 10–11 |
| Backfill opcional | Fora do plano (script manual se necessário) |

**Placeholder scan:** nenhum TBD; passos com comandos e snippets completos.

**Consistência de tipos:** `OrdemProducaoDiariaItemView` alinhado com UI; `Station` sem `planejamento` após Task 11.

---

**Plano guardado em:** `docs/superpowers/plans/2026-05-12-ordem-producao-op-sync-remove-planejamento-fila.md`

**Opções de execução:**

1. **Subagent-Driven (recomendado)** — despachar um agente fresco por tarefa, rever entre tarefas, iteração rápida (skill `superpowers:subagent-driven-development`).

2. **Inline Execution** — executar tarefas nesta sessão com checkpoints (skill `superpowers:executing-plans`).

**Qual preferes?**
