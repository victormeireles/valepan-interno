# Ordens corretivas — telas

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Continua o plano `2026-11-09-manutencao-corretiva.md`.

**Goal:** Fila com ordens, abertura da corretiva e detalhe com Recebi, devolver, finalizar e cancelar.

**Architecture:** Páginas em `src/app/manutencao`. Componentes em `src/features/manutencao/components`. Ações já existem. Esta fatia só apresenta.

**Tech Stack:** Next.js 15, React 19, Tailwind, Material Icons, design system Valepan.

## Global Constraints

- Mesmas do plano irmão. Mobile-first, alvos ≥ 44 px, pt-BR, tabular-nums, sem emoji.
- Solicitante não vê preço. Máquina parada em vermelho. Oferecendo risco em âmbar.
- Arquivo novo abaixo de 400 linhas. Não aplique migration. Não faça `git add -A`.

---

### Task 6: Rotas, início e barra

**Files:**
- Modify: `src/lib/auth/manutencao-route-rules.ts`
- Modify: `src/lib/auth/interno-route-access-map.test.ts`
- Modify: `src/components/Hub/hub-nav-config.ts`
- Modify: `src/components/Hub/filter-hub-nav-items.test.ts`
- Modify: `src/config/main-nav-config.ts`
- Modify: `src/config/main-nav-config.test.ts`

- [ ] **Step 1: Testes que falham**

`/manutencao/nova` e `/manutencao/ordens` exigem `anyModulo` dos dois módulos, mínimo `ler`, e ficam **antes** do prefixo `/manutencao` genérico (o detalhe e a abertura usam a mesma regra de leitura; a ação bloqueia quem só lê).

Hub: acrescentar item `Nova ordem`, href `/manutencao/nova`, ícone `add`, descrição `Abrir corretiva`, `moduloId` `interno_manutencao`, `moduloIds` os dois, `nivelMinimo` `editar` — se o filtro do hub já respeita `nivelMinimo` com `moduloIds`; caso contrário use só o módulo de solicitação + manutenção via o padrão que já existe para Fila e documente no teste o que o filtro exige. Conferir `filter-hub-nav-items.ts` e espelhar o padrão mais próximo que mostre o item para quem edita qualquer um dos dois.

Barra: link Nova ordem no grupo, match em `/manutencao/nova`. Match da Fila falso em `/manutencao/nova` e `/manutencao/ordens`.

- [ ] **Step 2: Implementar e ver verde**

Run: `npx vitest run src/lib/auth/interno-route-access-map.test.ts src/components/Hub/filter-hub-nav-items.test.ts src/config/main-nav-config.test.ts`

- [ ] **Step 3: Commit**

```powershell
git add src/lib/auth/manutencao-route-rules.ts src/lib/auth/interno-route-access-map.test.ts src/components/Hub/hub-nav-config.ts src/components/Hub/filter-hub-nav-items.test.ts src/config/main-nav-config.ts src/config/main-nav-config.test.ts
git commit -m "feat(manutencao): abre nova ordem no inicio e na barra"
```

---

### Task 7: Fila e abertura

**Files:**
- Modify: `src/app/manutencao/page.tsx`
- Create: `src/features/manutencao/components/FilaOrdens.tsx`
- Create: `src/app/manutencao/nova/page.tsx`
- Create: `src/features/manutencao/components/NovaOrdemFormulario.tsx`
- Modify or keep: `FilaVazia` para lista vazia

- [ ] **Step 1: Fila**

`listarFila`. Título `Fila`. Se mensagem de nenhum setor e lista vazia, mostre só o aviso. Senão liste as linhas: número (`OS-#####`), máquina, setor, urgência, tipo de problema, status, e quem recebeu se houver. `maquina_parou` → `text-red-700`. `oferecendo_risco` → âmbar. Link de cada linha para `/manutencao/ordens/{numero}`. Quem `abreCorretiva` vê botão `Nova ordem` (44px).

- [ ] **Step 2: Nova ordem**

`dynamic = 'force-dynamic'`. Exige quem abre. Lista máquinas ativas do escopo (todas se manutenção editar; senão setores do usuário). Campos: máquina, urgência, tipo de problema, descrição. Sucesso redireciona para o detalhe. Falha em `role="alert"` `text-red-700`.

- [ ] **Step 3: Commit**

```powershell
git add src/app/manutencao/page.tsx src/features/manutencao/components/FilaOrdens.tsx src/app/manutencao/nova/page.tsx src/features/manutencao/components/NovaOrdemFormulario.tsx
git commit -m "feat(manutencao): mostra a fila e a abertura da corretiva"
```

---

### Task 8: Detalhe e finalização

**Files:**
- Create: `src/app/manutencao/ordens/[numero]/page.tsx`
- Create: `src/features/manutencao/components/OrdemDetalhe.tsx`
- Create: `src/features/manutencao/components/OrdemFinalizarFormulario.tsx`
- Create: `src/features/manutencao/components/OrdemCancelarFormulario.tsx`

- [ ] **Step 1: Página**

`carregarOrdem`. Número inválido ou sem permissão → `/?erro=sem-permissao` ou notFound, no padrão do app. Título `OS-#####`. Linha do tempo: aberta (quando, por quem), recebida (quando, por quem), finalizada (início, fim, serviços) ou cancelada.

Solicitante: peças só nome e quantidade. Sem custo. Manutenção: custo das linhas e total.

Botões conforme flags: `Recebi`, `Devolver`, `Finalizar`, `Cancelar`. Alvos ≥ 44 px.

- [ ] **Step 2: Finalizar e cancelar**

Finalizar: início default = recebidaEm; fim default = agora (editáveis, datetime-local em SP). Serviços obrigatórios. Peças ativas: escolher soma quantidade; quantidade > 0 até 3 casas. Ajudantes opcionais (lista de quem tem manutenção editar, menos o receptor). Sucesso volta à fila ou atualiza o detalhe com `Ordem finalizada.` e saldo negativo se vier.

Cancelar: se `exigeMotivo`, campo motivo. Senão confirmação direta.

- [ ] **Step 3: Suíte**

Run: `npx vitest run`

Esperado: PASS. Sem browser: migrations não aplicadas.

- [ ] **Step 4: Commit**

```powershell
git add src/app/manutencao/ordens/[numero]/page.tsx src/features/manutencao/components/OrdemDetalhe.tsx src/features/manutencao/components/OrdemFinalizarFormulario.tsx src/features/manutencao/components/OrdemCancelarFormulario.tsx
git commit -m "feat(manutencao): mostra o detalhe da ordem com finalizar e cancelar"
```

---

## Self-review

- Fila, nova e detalhe cobrem a fatia 3 na UI.
- Preventiva aparece na ordenação da fila, mas não há plano nesta fatia.
