# Peças e estoque — plano de implementação

> **Para agentes:** subagente no checkout atual (`main`), sem worktree. Tarefas em ordem. Passos usam checkbox (`- [ ]`).

**Goal:** Cadastrar peças, lançar entrada e saída manual, e mostrar saldo e valor, com custo médio que só muda na entrada.

**Architecture:** A conta mora só em `CustoMedio`, e os testes cobrem essa classe. O Postgres não recalcula a média. A função trava a peça, confere o saldo que a ação leu e grava saldo, custo e movimento na mesma transação. A tela só chama a ação depois que o domínio aceita a quantidade e o preço.

**Tech Stack:** Next.js 15, React 19, TypeScript, Vitest, Tailwind, Supabase. Cliente service role nas ações. Consultas `as never` até a regeneração dos tipos.

**Spec:** `docs/superpowers/specs/2026-11-09-manutencao-design.md` — Peça, Movimento, Estoque e custo, tela Peças, fatia 2.

## Global Constraints

- pt-BR. Dinheiro em centavos inteiros. Quantidade em milésimos (`numeric(14,3)`).
- Código de peça: a mesma regra de `MaquinaCodigo`. Reuse a classe. Não a renomeie.
- Custo médio só muda na entrada, e só `CustoMedio` faz essa conta. Saldo anterior maior que zero: média ponderada, centavo mais próximo, empate para cima. Saldo anterior zero, negativo, ou custo ainda nulo: o custo passa a ser o preço da entrada. O SQL confere o resultado; não o recalcula.
- Saída não muda o custo. O preço gravado na saída é o custo vigente, ou zero se ele for nulo.
- Valor do saldo = saldo × custo, mesmo arredondamento. Sem custo, valor zero. Saldo negativo fica negativo e em destaque.
- Movimento não se edita. Sem policy de DELETE. Consumo de ordem não entra nesta fatia: a tabela já aceita `consumo_os`, a função desta fatia recusa esse tipo.
- Quem lê manutenção vê a lista. Quem edita lança entrada e saída. Quem administra cadastra e inativa. Solicitação não vê peça nem preço.
- Peça inativa continua na lista, com o saldo. Entrada e saída novas só em peça ativa.
- Arquivo novo abaixo de 400 linhas. `interno-route-access-map.ts` já está em 401: tire as regras de manutenção de lá antes de acrescentar peças.
- Não aplique migration no remoto. Não faça `git add -A`. Há arquivos de pessoas sujos que não são desta fatia. Commit no PowerShell com `git commit -m "mensagem"`.

---

### Task 1: Quantidade, preço e custo médio

**Files:**
- Create: `src/domain/manutencao/quantidade-estoque.ts`
- Create: `src/domain/manutencao/quantidade-estoque.test.ts`
- Create: `src/domain/manutencao/preco-centavos.ts`
- Create: `src/domain/manutencao/preco-centavos.test.ts`
- Create: `src/domain/manutencao/custo-medio.ts`
- Create: `src/domain/manutencao/custo-medio.test.ts`

**Interfaces:**
- Consumes: nada
- Produces:

```ts
export class QuantidadeEstoque {
  emMilesimos(texto: string): number | null;
  formatar(milesimos: number): string;
}
export class PrecoCentavos {
  parse(texto: string): number | null;
  formatar(centavos: number): string;
}
export class CustoMedio {
  entrada(
    saldoMilesimos: number,
    custoMedioCentavos: number | null,
    quantidadeMilesimos: number,
    precoCentavos: number,
  ): { saldoMilesimos: number; custoMedioCentavos: number };
  saida(
    saldoMilesimos: number,
    custoMedioCentavos: number | null,
    quantidadeMilesimos: number,
  ): {
    saldoMilesimos: number;
    custoMedioCentavos: number | null;
    precoUnitarioCentavos: number;
  };
  valorCentavos(saldoMilesimos: number, custoMedioCentavos: number | null): number;
}
```

- [ ] **Step 1: Testes que falham**

`QuantidadeEstoque.emMilesimos`: `"1"` → 1000, `"1,5"` → 1500, `"0.001"` → 1. `""`, `"0"`, `"-1"`, `"1,2345"` e `"abc"` → `null`. `formatar(1500)` → `"1,5"`. `formatar(-2500)` → `"-2,5"`.

`PrecoCentavos.parse`: `"10"` → 1000, `"10,5"` → 1050, `"10,50"` → 1050, `"0"` → 0. `""`, `"-1"`, `"10,505"` e `"abc"` → `null`. `formatar(1050)` → `"10,50"`.

`CustoMedio`, tudo em milésimos e centavos:

| chamada | saldo | custo | qtd | preço | saldo novo | custo novo | preço do movimento |
|---|---:|---:|---:|---:|---:|---:|---:|
| entrada | 10000 | 100 | 10000 | 200 | 20000 | 150 | — |
| entrada empate | 1000 | 1 | 1000 | 2 | 2000 | 2 | — |
| entrada saldo 0 | 0 | null | 5000 | 300 | 5000 | 300 | — |
| entrada saldo negativo | -2000 | 100 | 4000 | 50 | 2000 | 50 | — |
| saida | 10000 | 100 | 3000 | — | 7000 | 100 | 100 |
| saida sem custo | 1000 | null | 500 | — | 500 | null | 0 |

O empate é `(1×1 + 1×2) / 2 = 1,5` → 2. `valorCentavos(0, 100)` → 0. `valorCentavos(1500, 1)` → 2. `valorCentavos(-1500, 1)` → -1. `valorCentavos(1000, null)` → 0.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/domain/manutencao/quantidade-estoque.test.ts src/domain/manutencao/preco-centavos.test.ts src/domain/manutencao/custo-medio.test.ts`

- [ ] **Step 3: Implementar**

Quantidade: troca vírgula por ponto, no máximo 3 casas, valor maior que zero, resultado inteiro em milésimos. `formatar` divide por 1000, usa vírgula e corta zeros à direita.

Preço: reais com no máximo 2 casas, vezes 100. Zero é válido.

Entrada: se `saldoMilesimos > 0` e o custo não é nulo,

`novo = (saldo × custo + qtd × preco) / (saldo + qtd)`,

com divisão inteira e resto: sobe quando `resto × 2 >= divisor`. Nos outros casos o custo novo é o preço da entrada. O saldo novo é a soma.

Saída: saldo novo = saldo − quantidade. Custo permanece. Preço do movimento = custo ou 0.

Valor: custo nulo vale 0. Senão `saldo × custo / 1000`, empate para cima também no negativo (`-1,5` vira `-1`).

- [ ] **Step 4: Verde**

O mesmo comando do passo 2. Esperado: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/domain/manutencao/quantidade-estoque.ts src/domain/manutencao/quantidade-estoque.test.ts src/domain/manutencao/preco-centavos.ts src/domain/manutencao/preco-centavos.test.ts src/domain/manutencao/custo-medio.ts src/domain/manutencao/custo-medio.test.ts
git commit -m "feat(manutencao): calcula quantidade, preço e custo médio"
```

---

### Task 2: Cadastro da peça e quem movimenta

**Files:**
- Create: `src/domain/manutencao/peca-cadastro.ts`
- Create: `src/domain/manutencao/peca-cadastro.test.ts`
- Modify: `src/domain/manutencao/manutencao-acesso.ts`
- Modify: `src/domain/manutencao/manutencao-acesso.test.ts`

**Interfaces:**
- Consumes: `MaquinaCodigo`
- Produces:

```ts
export type PecaEntrada = { codigo: string; nome: string; unidade: string; ativo: boolean };
export type PecaLinhaValidada = { codigo: string; nome: string; unidade: string; ativo: boolean };
export class PecaCadastro {
  validar(
    entrada: PecaEntrada,
    usadas: { id: string; codigo: string }[],
    proprioId?: string,
  ): { ok: true; linha: PecaLinhaValidada } | { ok: false; mensagem: string };
}
```

`ManutencaoAcesso.movimenta(snap)` é `temModulo(..., 'editar')`. Administrar continua valendo como editar.

- [ ] **Step 1: Testes que falham**

`PecaCadastro`: `"  ROL-1 "` grava `"ROL-1"`. Unidade vazia vira `"UN"`. `" un "` vira `"UN"`. Código vazio → `"Informe o código."`. Nome vazio → `"Informe o nome."`. Código repetido, ignorando maiúsculas e espaços das pontas, → `"Já existe uma peça com esse código."`. O próprio id não conta como repetido. `ativo` passa direto.

`movimenta`: editar e administrar retornam true. Só ler, só solicitação e sem módulo retornam false. O dono do sistema retorna true.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/domain/manutencao/peca-cadastro.test.ts src/domain/manutencao/manutencao-acesso.test.ts`

- [ ] **Step 3: Implementar e ver verde**

Reuse `MaquinaCodigo`. Unidade: `trim`; se ficar vazia, `"UN"`; senão, o texto aparado. O mesmo comando do passo 2. Esperado: PASS.

- [ ] **Step 4: Commit**

```powershell
git add src/domain/manutencao/peca-cadastro.ts src/domain/manutencao/peca-cadastro.test.ts src/domain/manutencao/manutencao-acesso.ts src/domain/manutencao/manutencao-acesso.test.ts
git commit -m "feat(manutencao): valida a peça e quem movimenta o estoque"
```

---

### Task 3: Tabelas e a transação do movimento

**Files:**
- Create: `supabase/migrations/20261109200000_manutencao_pecas.sql`

**Interfaces:**
- Consumes: `interno_manutencao` já existe em `public.modulos` pela migration da fundação
- Produces: `manutencao_pecas`, `manutencao_estoque_movimentos`, `manutencao_registrar_movimento(uuid, text, numeric, integer, text, uuid, numeric, integer, numeric, integer)`

- [ ] **Step 1: Escrever a migration**

`manutencao_pecas`: `id uuid pk default gen_random_uuid()`, `codigo text not null check (btrim(codigo) <> '')`, `nome text not null check (btrim(nome) <> '')`, `unidade text not null default 'UN' check (btrim(unidade) <> '')`, `saldo numeric(14,3) not null default 0`, `custo_medio_centavos integer`, `ativo boolean not null default true`, `created_at` e `updated_at timestamptz not null default now()`. Índice único em `lower(btrim(codigo))`. `custo_medio_centavos` nulo ou `>= 0`.

`manutencao_estoque_movimentos`: `id`, `peca_id uuid not null references manutencao_pecas(id)`, `tipo text not null check (tipo in ('entrada','saida_manual','consumo_os'))`, `quantidade numeric(14,3) not null check (quantidade > 0)`, `preco_unitario_centavos integer not null check (preco_unitario_centavos >= 0)`, `ordem_id uuid`, `motivo text`, `usuario_id uuid not null references public.usuarios(id)`, `created_at timestamptz not null default now()`.

Checks: `consumo_os` exige `ordem_id`; os outros tipos exigem `ordem_id` nulo. `saida_manual` exige `btrim(motivo) <> ''`; os outros exigem `motivo` nulo. Sem FK de `ordem_id` nesta fatia.

RLS ligado nas duas. Select: `(SELECT auth_tem_modulo('interno_manutencao', 'ler')) OR (SELECT is_admin())`. Peças também aceitam insert e update para `(SELECT auth_tem_modulo('interno_manutencao', 'administrar')) OR (SELECT is_admin())`. Movimento não tem policy de insert para `authenticated`. Nenhuma das duas tem policy de delete.

Trigger `BEFORE UPDATE` em peças: se `saldo` ou `custo_medio_centavos` mudou e `current_setting('manutencao.movimento', true)` é distinto de `'1'`, `raise exception` com `Saldo só muda por movimento.`

Função `manutencao_registrar_movimento(p_peca uuid, p_tipo text, p_quantidade numeric, p_preco integer, p_motivo text, p_usuario uuid, p_saldo_esperado numeric, p_custo_esperado integer, p_saldo_novo numeric, p_custo_novo integer)` `returns table (saldo numeric, custo_medio_centavos integer)`, `language plpgsql`, `security invoker`, `set search_path = public`.

Ela trava a peça com `for update`. Peça ausente: `Peça não encontrada.` Peça inativa: `Peça inativa.` Tipo diferente de `entrada` e `saida_manual`: `Movimento inválido.` Quantidade nula ou `<= 0`: `Informe uma quantidade maior que zero, com até 3 casas.` Saldo ou custo diferente do esperado: `Estoque mudou. Tente de novo.` `p_custo_novo` negativo: `Movimento inválido.`

Entrada: preço nulo ou negativo recusa com `Informe o preço.`. Motivo gravado nulo. O saldo novo tem de ser o saldo atual mais a quantidade. Se o saldo atual é zero, negativo, ou o custo atual é nulo, o custo novo tem de ser o preço. Caso contrário a função grava o `p_custo_novo` que a ação calculou, sem refazer a média.

Saída: o custo novo tem de ser o custo atual, inclusive quando os dois são nulos. O preço do movimento é `coalesce(custo, 0)`. O saldo novo tem de ser o saldo atual menos a quantidade. Motivo = `btrim(p_motivo)`.

Antes do update, `perform set_config('manutencao.movimento', '1', true)`. Insere o movimento e devolve saldo e custo.

`REVOKE ALL` da função de `PUBLIC` e `anon`. `GRANT EXECUTE` só para `service_role`.

- [ ] **Step 2: Commit**

```powershell
git add supabase/migrations/20261109200000_manutencao_pecas.sql
git commit -m "feat(manutencao): cria peças e a transação do movimento"
```

---

### Task 4: Ações de gravar e movimentar

**Files:**
- Create: `src/app/manutencao/manutencao-peca-actions.ts`
- Create: `src/app/manutencao/manutencao-estoque-actions.ts`
- Create: `src/app/manutencao/manutencao-peca-consulta.ts`

**Interfaces:**
- Consumes: `requireInternoModulo`, `PecaCadastro`, `QuantidadeEstoque`, `PrecoCentavos`, `supabaseClientFactory.createServiceRoleClient()`
- Produces: `salvarPeca`, `registrarEntrada`, `registrarSaida`, `listarPecas`

`listarPecas` devolve `id`, `codigo`, `nome`, `unidade`, `saldo` string, `custoMedioCentavos` number ou null, `ativo`, `valorCentavos` calculado por `CustoMedio`. Ordem por nome em `pt-BR`.

- [ ] **Step 1: Cadastro**

`salvarPeca` exige `interno_manutencao` administrar. Valida com `PecaCadastro`. Código repetido no banco (`23505`) vira `"Já existe uma peça com esse código."`. Sucesso: `"Peça salva."`. Insert não envia saldo nem custo. Update manda só código, nome, unidade, ativo e `updated_at`.

- [ ] **Step 2: Movimentos**

`registrarEntrada(pecaId, quantidadeTexto, precoTexto)` exige editar. Quantidade inválida: `"Informe uma quantidade maior que zero, com até 3 casas."`. Preço inválido: `"Informe o preço."`. `registrarSaida(pecaId, quantidadeTexto, motivo)` exige editar. Motivo vazio: `"Informe o motivo."`.

As duas leem saldo e custo da peça, calculam o par novo com `CustoMedio` e chamam `rpc('manutencao_registrar_movimento', …)` com quantidade `milesimos / 1000` em string de 3 casas, o saldo esperado, o custo esperado e o par novo. Se a função responder `Estoque mudou. Tente de novo.`, leem outra vez e tentam uma segunda vez. A segunda falha devolve essa frase. As outras frases da task 3 chegam intactas. Qualquer outra vira `"Não foi possível movimentar."`.

Sucesso da entrada: `"Entrada registrada."`. Da saída: `"Saída registrada."`. Se o saldo devolvido for menor que zero, a frase ganha `" Saldo negativo."`.

- [ ] **Step 3: Consulta**

`listarPecas` exige ler. Converte `saldo` numeric para milésimos só para `CustoMedio.valorCentavos`, e devolve a string original do banco para a tela formatar.

- [ ] **Step 4: Checagem**

Run: `npx tsc --noEmit --pretty false`

O arquivo de ações não tem teste de banco. A conta já está coberta na task 1.

- [ ] **Step 5: Commit**

```powershell
git add src/app/manutencao/manutencao-peca-actions.ts src/app/manutencao/manutencao-estoque-actions.ts src/app/manutencao/manutencao-peca-consulta.ts
git commit -m "feat(manutencao): grava peça, entrada e saída"
```

---

### Task 5: Rota, início e barra

**Files:**
- Create: `src/lib/auth/manutencao-route-rules.ts`
- Modify: `src/lib/auth/interno-route-access-map.ts`
- Modify: `src/lib/auth/interno-route-access-map.test.ts`
- Modify: `src/components/Hub/hub-nav-config.ts`
- Modify: `src/components/Hub/filter-hub-nav-items.test.ts`
- Modify: `src/config/main-nav-config.ts`
- Modify: `src/config/main-nav-config.test.ts`

**Interfaces:**
- Consumes: as regras atuais de `/manutencao/solicitantes`, `/manutencao/maquinas` e `/manutencao`
- Produces: `/manutencao/pecas` exige `interno_manutencao` ler, antes do prefixo genérico

- [ ] **Step 1: Testes que falham**

`resolve('/manutencao/pecas')` é módulo `interno_manutencao`, mínimo `ler`. Os três resolves atuais continuam iguais.

No hub, a seção Manutenção fica Fila, Máquinas, Peças, Solicitantes. Peças: href `/manutencao/pecas`, título `Peças`, descrição `Saldo e movimentos`, ícone `construction`, `moduloId` `interno_manutencao`.

Na barra, os hrefs ficam `/manutencao`, `/manutencao/maquinas`, `/manutencao/pecas`, `/manutencao/solicitantes`. O match da Fila também é falso em `/manutencao/pecas`. O match de Peças é verdadeiro só nesse prefixo.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/lib/auth/interno-route-access-map.test.ts src/components/Hub/filter-hub-nav-items.test.ts src/config/main-nav-config.test.ts`

- [ ] **Step 3: Implementar**

Exporte `MANUTENCAO_ROUTE_RULES` de `manutencao-route-rules.ts`. A ordem é solicitantes, máquinas, peças, e por último `/manutencao`. O mapa só espalha esse array no lugar das três regras atuais. `interno-route-access-map.ts` precisa terminar abaixo de 400 linhas.

O match da Fila exclui `/manutencao/pecas` junto com máquinas e solicitantes.

- [ ] **Step 4: Verde**

O mesmo comando do passo 2. Esperado: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/lib/auth/manutencao-route-rules.ts src/lib/auth/interno-route-access-map.ts src/lib/auth/interno-route-access-map.test.ts src/components/Hub/hub-nav-config.ts src/components/Hub/filter-hub-nav-items.test.ts src/config/main-nav-config.ts src/config/main-nav-config.test.ts
git commit -m "feat(manutencao): abre peças no início e na barra"
```

---

### Task 6: Tela de peças

**Files:**
- Create: `src/app/manutencao/pecas/page.tsx`
- Create: `src/features/manutencao/components/PecasPainel.tsx`
- Create: `src/features/manutencao/components/PecaFormulario.tsx`
- Create: `src/features/manutencao/components/MovimentoFormulario.tsx`

**Interfaces:**
- Consumes: `listarPecas`, `salvarPeca`, `registrarEntrada`, `registrarSaida`, `ManutencaoAcesso`, `QuantidadeEstoque.formatar`, `PrecoCentavos.formatar`
- Produces: a página `/manutencao/pecas`

- [ ] **Step 1: Página**

`dynamic = 'force-dynamic'`. Exige `interno_manutencao` ler. Container `max-w-7xl px-4 py-6`. Título `Peças`. Passa `podeCadastrar` de `administra` e `podeMovimentar` de `movimenta`.

- [ ] **Step 2: Lista**

Colunas: código, nome, unidade, saldo, custo médio, valor. Saldo e dinheiro em `tabular-nums`. Saldo negativo com `text-red-700`. Custo nulo aparece como `—`. Valor nulo de custo aparece `0,00`. Peça inativa ganha o texto `Inativa`. Lista vazia: `Nenhuma peça.`

- [ ] **Step 3: Formulários**

Quem administra vê `Nova peça` e `Editar`. Campos: código, nome, unidade, ativa. Unidade começa em `UN`. Sucesso em `role="status"`. Falha em `role="alert"` com `text-red-700`.

Quem edita vê Entrada e Saída. A lista de peças desses formulários só tem ativas. Entrada pede quantidade e preço. Saída pede quantidade e motivo. Botões com no mínimo 44px. `Nova peça` limpa o formulário de cadastro.

- [ ] **Step 4: Suíte**

Run: `npx vitest run`

Esperado: a suíte inteira passa. Sem teste de browser: a migration não está aplicada.

- [ ] **Step 5: Commit**

```powershell
git add src/app/manutencao/pecas/page.tsx src/features/manutencao/components/PecasPainel.tsx src/features/manutencao/components/PecaFormulario.tsx src/features/manutencao/components/MovimentoFormulario.tsx
git commit -m "feat(manutencao): mostra peças, saldo e movimentos"
```

---

## Self-review

- Fatia 2 da spec: cadastro, entrada, saída manual, saldo negativo e custo médio. Coberto.
- Consumo de ordem, finalização e indicadores ficam nas fatias seguintes. A tabela já reserva `consumo_os` e `ordem_id`.
- A média ponderada existe só em `CustoMedio`. O SQL recusa saldo ou custo que não batem com a linha travada, recusa custo novo que não seja o preço quando a média não se aplica, e na saída exige o mesmo custo. O valor negativo do saldo é só apresentação e está no teste (`-1,5` → `-1`).
- A troca de setores do solicitante continua sem RPC. Isso só bloqueia a fatia da ordem, não esta.
