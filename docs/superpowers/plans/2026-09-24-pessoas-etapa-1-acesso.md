# Pessoas etapa 1 — acesso Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Quem tem `interno_pessoas` vê o menu Pessoas e consegue abrir `/pessoas`.

**Architecture:** O catálogo, o mapa de rotas, a barra e o início já filtram por módulo. Esta parte só acrescenta `interno_pessoas` nesses pontos. Tabelas e carga estão em `2026-09-24-pessoas-etapa-1-carga.md`.

**Tech Stack:** Next.js 15, TypeScript, Vitest.

## Global Constraints

- Módulo `interno_pessoas`; `ler` lê; `editar` grava; `administrar` inclui `editar` por `nivelAtende`.
- Sem tela de perfil, usuário ou permissão.
- Arquivo abaixo de 500 linhas.

---

### Task 1: Catálogo

**Files:**
- Modify: `src/lib/auth/interno-modulos-catalog.ts`
- Test: `src/lib/auth/interno-modulos-catalog.test.ts`

**Interfaces:**
- Consumes: `isModuloInterno`, `nivelAtende`.
- Produces: `'interno_pessoas'` em `MODULOS_INTERNO`.

- [ ] **Step 1: Write the failing test**

```ts
it('lista exatamente os 12 módulos interno_*', () => {
  expect(MODULOS_INTERNO).toHaveLength(12);
  expect(MODULOS_INTERNO).toContain('interno_pessoas');
  expect(isModuloInterno('interno_pessoas')).toBe(true);
  expect(MODULOS_INTERNO.every((m) => m.startsWith('interno_'))).toBe(true);
});
```

Substituir o teste que espera 11.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/auth/interno-modulos-catalog.test.ts`
Expected: FAIL, length 11.

- [ ] **Step 3: Write minimal implementation**

Depois de `'interno_reclamacoes'`:

```ts
'interno_pessoas',
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/auth/interno-modulos-catalog.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth/interno-modulos-catalog.ts src/lib/auth/interno-modulos-catalog.test.ts
git commit -m "feat(pessoas): inclui interno_pessoas no catalogo de modulos"
```

---

### Task 2: Rota

**Files:**
- Modify: `src/lib/auth/interno-route-access-map.ts`
- Test: `src/lib/auth/interno-route-access-map.test.ts`

**Interfaces:**
- Consumes: `modulo()` e `InternoRouteAccessMap.resolve`.
- Produces: `/pessoas` e subcaminhos com `{ kind: 'modulo', modulo: 'interno_pessoas', minimo: 'ler' }`.

- [ ] **Step 1: Write the failing test**

```ts
it('protege Pessoas com leitura do módulo', () => {
  expect(map.resolve('/pessoas')).toEqual({
    kind: 'modulo',
    modulo: 'interno_pessoas',
    minimo: 'ler',
  });
  expect(map.resolve('/pessoas/colaboradores')).toEqual({
    kind: 'modulo',
    modulo: 'interno_pessoas',
    minimo: 'ler',
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/auth/interno-route-access-map.test.ts`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

Inserir antes da regra de prefixo `/config`:

```ts
{
  match: 'prefix',
  prefix: '/pessoas',
  requirement: modulo('interno_pessoas', 'ler'),
},
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/auth/interno-route-access-map.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth/interno-route-access-map.ts src/lib/auth/interno-route-access-map.test.ts
git commit -m "feat(pessoas): exige interno_pessoas para abrir as rotas"
```

---

### Task 3: Menu e início

**Files:**
- Modify: `src/config/main-nav-config.ts`
- Modify: `src/config/main-nav-config.test.ts`
- Modify: `src/components/Hub/hub-nav-config.ts`
- Modify: `src/components/Hub/filter-hub-nav-items.test.ts`

**Interfaces:**
- Consumes: `InternoModuloId`.
- Produces: grupo `pessoas` e section `pessoas`, href `/pessoas`, `moduloId: 'interno_pessoas'`.

- [ ] **Step 1: Write the failing test**

Ordem da barra:

```ts
['/', 'producao', 'planejamento', 'paineis', 'insumos', 'pessoas', '/config']
```

```ts
expect(groupHrefs('pessoas')).toEqual(['/pessoas']);
expect(groupById('pessoas').children[0]?.moduloId).toBe('interno_pessoas');
```

Hub:

```ts
['producao', 'planejamento', 'paineis', 'insumos', 'pessoas']
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/config/main-nav-config.test.ts src/components/Hub/filter-hub-nav-items.test.ts`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

Antes de Configurações em `MAIN_NAV_ENTRIES`:

```ts
{
  type: 'group',
  id: 'pessoas',
  label: 'Pessoas',
  icon: 'groups',
  match: (pathname) => pathname.startsWith('/pessoas'),
  children: [
    {
      type: 'link',
      href: '/pessoas',
      label: 'Colaboradores',
      icon: 'groups',
      moduloId: 'interno_pessoas',
      match: (pathname) => pathname.startsWith('/pessoas'),
    },
  ],
},
```

Em `hub-nav-config.ts`:

```ts
export const HUB_PESSOAS_ITEMS: HubNavItem[] = [
  {
    href: '/pessoas',
    title: 'Colaboradores',
    description: 'Cadastro, setor e horário',
    icon: 'groups',
    moduloId: 'interno_pessoas',
  },
];
```

Em `HUB_SECTIONS`, depois de insumos:

```ts
{ id: 'pessoas', title: 'Pessoas', items: HUB_PESSOAS_ITEMS },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/config/main-nav-config.test.ts src/components/Hub/filter-hub-nav-items.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/config/main-nav-config.ts src/config/main-nav-config.test.ts src/components/Hub/hub-nav-config.ts src/components/Hub/filter-hub-nav-items.test.ts
git commit -m "feat(pessoas): mostra o menu so para quem tem o modulo"
```
