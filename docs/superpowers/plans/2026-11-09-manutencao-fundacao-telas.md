# Manutenção — fundação — plano de implementação (tasks 5 a 7)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gravar máquinas e setores do solicitante, abrir a seção no início e mostrar a fila ainda vazia.

**Architecture:** Continua `docs/superpowers/plans/2026-11-09-manutencao-fundacao.md`. Executar as tasks 1 a 4 daquele arquivo antes destas. As assinaturas abaixo são as que as tasks 1 a 4 produzem.

**Tech Stack:** Next.js 15, React 19, TypeScript, Vitest, Supabase service role, Tailwind.

## Global Constraints

As mesmas do plano da fundação. Texto pt-BR. Alvo de toque mínimo 44 px. Queries com `as never` até o tipo gerado existir. Não aplicar a migration no remoto.

---

### Task 5: Ações de máquina, solicitante e fila

**Files:**
- Create: `src/domain/manutencao/solicitante-setores.ts`
- Create: `src/domain/manutencao/solicitante-setores.test.ts`
- Create: `src/app/actions/manutencao-maquina-actions.ts`
- Create: `src/app/actions/manutencao-solicitante-actions.ts`
- Create: `src/app/actions/manutencao-fila-actions.ts`

**Interfaces:**
- Consumes: `MaquinaCadastro`, `SetorOperacional`, `ManutencaoAcesso`, `FilaFundacao`, `requireInternoModulo`, `requireInternoQualquerModulo`, `supabaseClientFactory.createServiceRoleClient()`
- Produces:
  - `SolicitanteSetores.filtrar(ids: string[], setores: SetorLinha[]): { ok: true; ids: string[] } | { ok: false; mensagem: string }` — ids desconhecidos ou inelegíveis devolvem `"Escolha apenas setores operacionais ativos."`; ids vazios são válidos
  - `listarMaquinas(): Promise<{ maquinas: MaquinaItem[]; setores: SetorLinha[] }>`
  - `salvarMaquina(entrada: MaquinaEntrada & { id?: string }): Promise<{ ok: boolean; mensagem: string }>`
  - `listarSolicitantes(): Promise<{ usuarios: { id: string; nome: string; setorIds: string[] }[]; setores: SetorLinha[] }>`
  - `salvarSetoresDoSolicitante(usuarioId: string, setorIds: string[]): Promise<{ ok: boolean; mensagem: string }>`
  - `carregarFilaFundacao(): Promise<{ mensagem: string }>`
  - `MaquinaItem = { id: string; codigo: string; nome: string; setorId: string; setorNome: string; observacao: string; ativo: boolean }`

- [ ] **Step 1: Write the failing test**

`solicitante-setores.test.ts`: lista vazia ok com `ids: []`. Id de setor operacional ativo permanece. Id de apoio ou id ausente devolve `"Escolha apenas setores operacionais ativos."`. Duplicata entra uma vez.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/domain/manutencao/solicitante-setores.test.ts`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

`SolicitanteSetores` usa `SetorOperacional`.

`listarMaquinas` exige `interno_manutencao` `ler`. Devolve todas as máquinas, com o nome do setor. `observacao` nula vira `""`. Os setores do formulário são só os operacionais ativos.

`salvarMaquina` exige `interno_manutencao` `administrar`. Carrega setores e códigos, chama `MaquinaCadastro.validar` e grava. Sem `id`, insert. Com `id`, update. Sucesso: `"Máquina salva."`

`listarSolicitantes` e `salvarSetoresDoSolicitante` exigem `administrar`. A lista lê `usuario_perfis` com `usuarios ( id, nome, ativo )` e `perfis ( ativo, perfil_modulos ( modulo ) )`. Fica quem está ativo, com perfil ativo, e algum módulo `interno_manutencao_solicitacao`. Ordenar por nome em pt-BR. Antes de gravar, recusar usuário fora dessa lista com `"Usuário sem o módulo de solicitação."`. Apagar as linhas daquele `usuario_id` e inserir as validadas, pelo service role.

`carregarFilaFundacao` usa `requireInternoQualquerModulo` nos dois módulos em `ler`. Se `veTodas`, a mensagem é a de `FilaFundacao` com `veTodas: true`. Senão, conta setores marcados que `elegivel` aceita.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/domain/manutencao/solicitante-setores.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/domain/manutencao/solicitante-setores.ts src/domain/manutencao/solicitante-setores.test.ts src/app/actions/manutencao-maquina-actions.ts src/app/actions/manutencao-solicitante-actions.ts src/app/actions/manutencao-fila-actions.ts
git commit -m "feat(manutencao): grava máquina e setores do solicitante"
```

---

### Task 6: Rotas, início e barra

**Files:**
- Modify: `src/lib/auth/interno-route-access-map.ts`
- Modify: `src/lib/auth/interno-route-access-map.test.ts`
- Modify: `src/components/Hub/hub-nav-config.ts`
- Modify: `src/components/Hub/filter-hub-nav-items.test.ts`
- Modify: `src/config/main-nav-config.ts`

**Interfaces:**
- Consumes: `anyModulo`, `modulo`, `HubNavItem.moduloIds`
- Produces: regras, nesta ordem, antes de `/config`:
  - prefixo `/manutencao/solicitantes` → `interno_manutencao` `administrar`
  - prefixo `/manutencao/maquinas` → `interno_manutencao` `ler`
  - prefixo `/manutencao` → `anyModulo(['interno_manutencao', 'interno_manutencao_solicitacao'], 'ler')`

- [ ] **Step 1: Write the failing test**

No teste do mapa:

```ts
expect(map.resolve('/manutencao')).toEqual({
  kind: 'anyModulo',
  modulos: ['interno_manutencao', 'interno_manutencao_solicitacao'],
  minimo: 'ler',
});
expect(map.resolve('/manutencao/maquinas')).toEqual({
  kind: 'modulo',
  modulo: 'interno_manutencao',
  minimo: 'ler',
});
expect(map.resolve('/manutencao/solicitantes')).toEqual({
  kind: 'modulo',
  modulo: 'interno_manutencao',
  minimo: 'administrar',
});
```

No teste de `HUB_SECTIONS`, incluir `'manutencao'` depois de `'pessoas'`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/auth/interno-route-access-map.test.ts src/components/Hub/filter-hub-nav-items.test.ts`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

Inserir as três regras com a mais específica primeiro. A regra genérica `/manutencao` não pode ficar antes de `/manutencao/maquinas`.

Hub, seção `manutencao`, título "Manutenção". `moduloId` é obrigatório no tipo. Na Fila, `moduloId` é `interno_manutencao` e `moduloIds` são os dois, para o filtro usar o OR. Itens:
- `/manutencao` "Fila", descrição "Ordens abertas e recebidas", ícone `handyman`
- `/manutencao/maquinas` "Máquinas", descrição "Cadastro por setor", ícone `precision_manufacturing`, `interno_manutencao`
- `/manutencao/solicitantes` "Solicitantes", descrição "Setores que podem abrir ordem", ícone `manage_accounts`, `interno_manutencao`, `nivelMinimo: 'administrar'`

Barra: grupo `manutencao` antes de Configurações, com os mesmos três links e `match` por prefixo. O `match` do grupo cobre os três prefixos.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/auth/interno-route-access-map.test.ts src/components/Hub/filter-hub-nav-items.test.ts src/config/filter-main-nav-entries.test.ts`
Expected: PASS. O teste do tablet continua sem o grupo Manutenção.

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth/interno-route-access-map.ts src/lib/auth/interno-route-access-map.test.ts src/components/Hub/hub-nav-config.ts src/components/Hub/filter-hub-nav-items.test.ts src/config/main-nav-config.ts
git commit -m "feat(manutencao): abre a seção no início e na barra"
```

---

### Task 7: Telas da fila, das máquinas e dos solicitantes

**Files:**
- Create: `src/app/manutencao/page.tsx`
- Create: `src/app/manutencao/maquinas/page.tsx`
- Create: `src/app/manutencao/solicitantes/page.tsx`
- Create: `src/features/manutencao/components/FilaVazia.tsx`
- Create: `src/features/manutencao/components/MaquinaFormulario.tsx`
- Create: `src/features/manutencao/components/MaquinasPainel.tsx`
- Create: `src/features/manutencao/components/SolicitantesPainel.tsx`

**Interfaces:**
- Consumes: `carregarFilaFundacao`, `listarMaquinas`, `salvarMaquina`, `listarSolicitantes`, `salvarSetoresDoSolicitante`, `MaquinaItem`, `Button`, `Input`, `Select`
- Produces: as três rotas renderizáveis

- [ ] **Step 1: Write the pages**

`src/app/manutencao/page.tsx` exporta `dynamic = 'force-dynamic'`, chama `carregarFilaFundacao` e renderiza `FilaVazia` com a mensagem. Sem botão de nova ordem.

`maquinas/page.tsx` chama `requireInternoModulo('interno_manutencao', 'ler')` e `listarMaquinas`. `podeGravar` vem de `ManutencaoAcesso.administra(snap)`.

`solicitantes/page.tsx` chama `requireInternoModulo('interno_manutencao', 'administrar')` e `listarSolicitantes`.

As três páginas usam `max-w-7xl px-4 py-6`.

- [ ] **Step 2: Write the components**

`FilaVazia` recebe `mensagem: string`. Título "Ordens". Parágrafo com a mensagem. Cartão branco, borda stone-200, `rounded-xl`, `shadow-sm`.

`MaquinaFormulario` recebe setores, o valor atual (`id` opcional, código, nome, setorId, observação, ativo), `podeGravar` e `onSubmit`. Campos: Código, Nome, Setor (opções já filtradas por `SetorOperacional`), Observação, checkbox "Ativa" com alvo de 44 px. Botão "Salvar" `size="lg"`. Com `podeGravar` falso, campos `disabled` e sem botão.

`MaquinasPainel` lista código, nome, setor e o texto "Inativa" quando `ativo` é falso. "Editar" preenche o formulário, inclusive o id. Chama `salvarMaquina` e mostra `mensagem`. Máquina inativa continua na lista.

`SolicitantesPainel` faz um bloco por usuário, com o nome e um checkbox por setor operacional. "Salvar" chama `salvarSetoresDoSolicitante` com os ids marcados. Sem usuários: "Ninguém com o módulo de solicitação."

- [ ] **Step 3: Run the suite**

Run: `npx vitest run src/domain/manutencao src/lib/auth/interno-modulos-catalog.test.ts src/lib/auth/algum-modulo-atende.test.ts src/lib/auth/interno-route-access-map.test.ts src/components/Hub/filter-hub-nav-items.test.ts src/config/filter-main-nav-entries.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/app/manutencao src/features/manutencao
git commit -m "feat(manutencao): mostra a fila vazia, as máquinas e os solicitantes"
```

---

## Cobertura do spec nesta fatia

Coberto: módulos, RLS e tabelas da fundação, máquinas, solicitantes, fila com "Nenhum setor liberado." e "Nenhuma ordem.", início e barra.

De propósito fora: preço, peças, Recebi, finalização, preventiva, indicadores e o seletor de máquina na abertura da ordem.
