# Preventiva — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development.

**Goal:** Cadastrar planos preventivos e gerar a ordem na fila pelo job diário das 00:10 em São Paulo.

**Architecture:** A próxima data mora em `ProximaDataPreventiva`. O job `SECURITY DEFINER` cria no máximo uma OS por plano e empurra a data. A tela só lista e grava planos. Indicadores ficam fora.

**Tech Stack:** Next.js 15, React 19, TypeScript, Vitest, Supabase, `pg_cron`.

**Spec:** seção Preventiva, fatia 4.

## Global Constraints

- pt-BR. Datas no calendário `America/Sao_Paulo`.
- Frequências: `a_cada_n_dias` (N ≥ 1, âncora = primeira data), `semanal` (1–7 seg–dom), `mensal` (dia 1–28).
- Primeira data ≥ hoje. Próxima data estritamente depois de hoje após gerar ou recalcular.
- Remover = `ativo = false`. Sem restaurar. Ordem já gerada permanece.
- Job `manutencao-gerar-preventivas` em `10 3 * * *`. Se existe OS do plano em aberta/recebida, não cria outra e não muda a data. Máquina ou plano inativo: pula.
- Ordem preventiva: urgência e tipo nulos, autor nulo, descrição do plano, setor atual da máquina.
- Manutenção ler vê; editar grava. Solicitação não vê a tela.
- Arquivo < 400 linhas. Não aplique migration. Não `git add -A`. Commit PowerShell `git commit -m "..."`.

---

### Task 1: Próxima data e validação do plano

**Files:**
- Create: `src/domain/manutencao/proxima-data-preventiva.ts` + `.test.ts`
- Create: `src/domain/manutencao/plano-preventivo.ts` + `.test.ts`

```ts
export type FrequenciaPlano =
  | { tipo: 'a_cada_n_dias'; intervalo: number; ancora: string } // YYYY-MM-DD
  | { tipo: 'semanal'; diaSemana: number } // 1=seg … 7=dom
  | { tipo: 'mensal'; diaMes: number };

export class ProximaDataPreventiva {
  /** Menor data estritamente depois de hojeSP que encaixa. */
  depoisDeHoje(freq: FrequenciaPlano, hojeSp: string): string;
  /** Valida que a primeira data encaixa na frequência. */
  encaixa(freq: FrequenciaPlano, data: string): boolean;
}

export class PlanoPreventivo {
  validar(entrada: {
    maquinaId: string;
    descricao: string;
    frequencia: FrequenciaPlano;
    primeiraData: string; // ou proxima ao editar
    hojeSp: string;
  }, maquina: { id: string; ativo: boolean } | null):
    | { ok: true; descricao: string; proximaEm: string; ancora?: string }
    | { ok: false; mensagem: string };
}
```

- [ ] **Step 1: Testes**

`a_cada_n_dias` âncora 2026-11-01, N=7, hoje 2026-11-09 → 2026-11-15.  
`semanal` dia 1 (segunda), hoje domingo 2026-11-08 → 2026-11-09.  
`mensal` dia 10, hoje 2026-11-10 → 2026-12-10.  
Primeira data no passado → `Informe uma data de hoje ou futura.`  
N < 1 → `Informe o intervalo em dias.`  
diaSemana fora 1–7 → `Informe o dia da semana.`  
diaMes fora 1–28 → `Informe o dia do mês.`  
Máquina inativa → `Máquina inativa.`  
Descrição vazia → `Informe a descrição.`  
Semanal com primeira data que não cai no dia → `A primeira data deve cair no dia da semana escolhido.`

- [ ] **Step 2: Implementar, verde, commit**

```powershell
git add src/domain/manutencao/proxima-data-preventiva.ts src/domain/manutencao/proxima-data-preventiva.test.ts src/domain/manutencao/plano-preventivo.ts src/domain/manutencao/plano-preventivo.test.ts
git commit -m "feat(manutencao): calcula a proxima data do plano preventivo"
```

---

### Task 2: Tabela, FK e job

**Files:**
- Create: `supabase/migrations/20261109220000_manutencao_planos.sql`

- [ ] **Step 1: Migration**

`manutencao_planos`: id, maquina_id FK, descricao, ativo default true, frequencia_tipo check, intervalo_dias nullable, dia_semana nullable, dia_mes nullable, ancora_em date nullable, proxima_em date not null, created_at, updated_at. Checks por tipo.

`ALTER TABLE manutencao_ordens ADD CONSTRAINT … FOREIGN KEY (plano_id) REFERENCES manutencao_planos(id)`.

RLS: select manutenção ler OU admin. Insert/update manutenção editar OU admin. Sem DELETE.

`manutencao_gerar_preventivas()` SECURITY DEFINER, search_path public, returns integer:
- `v_hoje = (now() AT TIME ZONE 'America/Sao_Paulo')::date`
- Para cada plano ativo com máquina ativa e `proxima_em <= v_hoje`, ORDER BY id:
  - Se EXISTS ordem do plano com status aberta/recebida → skip
  - Senão INSERT ordem preventiva (numero nextval, tipo preventiva, plano_id, maquina, setor atual, descricao, status aberta, aberta_por null, urgencia/tipo null)
  - UPDATE proxima_em = encaixe estritamente depois de v_hoje (replicar a lógica de ProximaDataPreventiva em SQL, ou chamar só as três fórmulas)
- Return count created

Cron: unschedule if exists, schedule `manutencao-gerar-preventivas` at `10 3 * * *`.

REVOKE ALL function FROM PUBLIC, anon, authenticated (cron runs as superuser/definer).

- [ ] **Step 2: Commit**

```powershell
git add supabase/migrations/20261109220000_manutencao_planos.sql
git commit -m "feat(manutencao): cria planos preventivos e o job diario"
```

---

### Task 3: Ações do plano

**Files:**
- Create: `src/app/actions/manutencao-plano-actions.ts`
- Create: `src/app/actions/manutencao-plano-consulta.ts`

- [ ] **Step 1**

`listarPlanos`: manutenção ler. Inclui flag `temOrdemAberta` (exists aberta/recebida do plano). Só ativos na lista principal; inativos não listam (spec: some da lista).

`salvarPlano`: editar. Validar com PlanoPreventivo. Create: seta ancora se a_cada_n_dias. Edit descrição only: não mexe proxima. Edit frequência: recalcula proxima; se vira a_cada_n_dias, ancora = nova proxima. Edit máquina: só futura. Sucesso `Plano salvo.`

`inativarPlano`: editar. `ativo=false`. Sucesso `Plano removido.`

- [ ] **Step 2: Commit**

```powershell
git add src/app/actions/manutencao-plano-actions.ts src/app/actions/manutencao-plano-consulta.ts
git commit -m "feat(manutencao): grava e lista planos preventivos"
```

---

### Task 4: Rota, nav e tela

**Files:**
- Modify: `manutencao-route-rules.ts`, hub, main-nav + tests
- Create: `src/app/manutencao/preventiva/page.tsx`
- Create: `src/features/manutencao/components/PlanosPainel.tsx`
- Create: `src/features/manutencao/components/PlanoFormulario.tsx`

- [ ] **Step 1**

Rota `/manutencao/preventiva` → interno_manutencao ler, antes do genérico. Hub/barra: Preventiva, ícone `event_repeat`, descrição `Planos e próxima data`. Fila match exclui preventiva.

Tela: lista máquina, frequência, próxima data, selo se tem ordem aberta/recebida. Quem edita: Novo plano, Editar, Remover. Form: máquina ativa, descrição, tipo frequência + campos, primeira/próxima data. ≥44px, pt-BR.

- [ ] **Step 2: Suíte e commit**

```powershell
git add src/lib/auth/manutencao-route-rules.ts src/lib/auth/interno-route-access-map.test.ts src/components/Hub/hub-nav-config.ts src/components/Hub/filter-hub-nav-items.test.ts src/config/main-nav-config.ts src/config/main-nav-config.test.ts src/app/manutencao/preventiva/page.tsx src/features/manutencao/components/PlanosPainel.tsx src/features/manutencao/components/PlanoFormulario.tsx
git commit -m "feat(manutencao): mostra os planos preventivos"
```

---

## Self-review

- Fatia 4: planos + job. Indicadores fora.
- Job não empilha backlog. Datas em America/Sao_Paulo.
