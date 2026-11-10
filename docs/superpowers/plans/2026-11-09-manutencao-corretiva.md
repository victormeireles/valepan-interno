# Ordens corretivas — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Abrir, receber, devolver, finalizar com baixa de peças e cancelar a ordem corretiva, com a fila e o detalhe usáveis.

**Architecture:** Regras de status, tempo, fila e permissão ficam em `src/domain/manutencao`. A finalização e a troca de setores do solicitante rodam em RPC com service role. A tela só chama a ação. Preventiva e indicadores não entram.

**Tech Stack:** Next.js 15, React 19, TypeScript, Vitest, Tailwind, Supabase. Cliente service role. Consultas `as never` até regenerar os tipos.

**Spec:** `docs/superpowers/specs/2026-11-09-manutencao-design.md` — Ordem, Peças da ordem, Ajudantes, Fluxo da corretiva, Telas (fila, nova, detalhe), fatia 3.

**Telas:** o plano irmão `docs/superpowers/plans/2026-11-09-manutencao-corretiva-telas.md` (tarefas 6–8).

## Global Constraints

- pt-BR. Dinheiro em centavos. Quantidade em milésimos. Horários comparados em `America/Sao_Paulo`.
- Número da ordem: inteiro único, mostrado como `OS-` e cinco dígitos (`OS-00001`). Corretiva e preventiva compartilham a sequência.
- Status: `aberta`, `recebida`, `finalizada`, `cancelada`. Sem botão de início.
- Parada só em `maquina_parou`, da abertura até o fim informado. Outras urgências: parada zero. Execução = fim − início. Sem R$ de mão de obra.
- Custo médio só em `CustoMedio`. Consumo usa o custo vigente (ou 0). Finalização, linhas, custo e movimentos nascem na mesma transação.
- Solicitante lê e abre só nos setores marcados. Não vê preço. Não cancela preventiva (ainda não existe nesta fatia). Manutenção editar cancela aberta sem motivo. Administrar cancela aberta ou recebida com motivo.
- Recebi é atômico: só grava se ainda estiver aberta. O segundo responde `Já recebida por {nome}`.
- Troca de setores do solicitante passa a ser RPC atômica, no modelo de `replace_insumo_distribuidores`.
- Arquivo novo abaixo de 400 linhas. Não aplique migration no remoto. Não faça `git add -A`. Commit no PowerShell com `git commit -m "mensagem"`.

**Fora deste plano:** plano preventivo, job, indicadores, real de hora, foto, editar finalizada.

---

### Task 1: Número, tempo, fila e abertura

**Files:**
- Create: `src/domain/manutencao/ordem-numero.ts` + `.test.ts`
- Create: `src/domain/manutencao/tempo-ordem.ts` + `.test.ts`
- Create: `src/domain/manutencao/fila-ordem.ts` + `.test.ts`
- Create: `src/domain/manutencao/ordem-abertura.ts` + `.test.ts`

**Interfaces:**
- Consumes: `MaquinaCodigo` não. Só regras puras.
- Produces:

```ts
export class OrdemNumero {
  formatar(numero: number): string; // 1 -> "OS-00001"
  parse(texto: string): number | null;
}
export class TempoOrdem {
  execucaoMinutos(inicioIso: string, fimIso: string): number;
  paradaMinutos(urgencia: string, abertaEmIso: string, fimIso: string): number;
}
export type FilaItem = {
  numero: number;
  tipo: 'corretiva' | 'preventiva';
  urgencia: string | null;
  status: 'aberta' | 'recebida';
  abertaEm: string;
};
export class FilaOrdem {
  ordenar(itens: FilaItem[]): FilaItem[];
}
export type AberturaEntrada = {
  maquinaId: string;
  urgencia: 'maquina_parou' | 'trabalhando_com_problema' | 'oferecendo_risco';
  tipoProblema: 'eletrico' | 'mecanico' | 'ajuste_parametro';
  descricao: string;
};
export class OrdemAbertura {
  validar(
    entrada: AberturaEntrada,
    maquina: { id: string; ativo: boolean; setorId: string } | null,
    setoresPermitidos: string[] | 'todos',
  ): { ok: true; setorId: string; descricao: string } | { ok: false; mensagem: string };
}
```

- [ ] **Step 1: Testes que falham**

`OrdemNumero`: `1` → `OS-00001`, `42` → `OS-00042`, `100000` → `OS-100000`. `parse("OS-00001")` → 1. Texto inválido → `null`.

`TempoOrdem`: execução de `2026-11-09T13:00:00-03:00` a `2026-11-09T14:30:00-03:00` → 90. Parada com `maquina_parou` da abertura ao fim → minutos reais. Com `oferecendo_risco` ou `trabalhando_com_problema` → 0. Fim antes do início → mensagem via validação da task 2, não aqui.

`FilaOrdem`: ordem de urgência `maquina_parou`, `oferecendo_risco`, `trabalhando_com_problema`, depois `preventiva` (urgencia nula). Dentro do grupo, a mais antiga primeiro.

`OrdemAbertura`: máquina nula → `Máquina não encontrada.`; inativa → `Máquina inativa.`; setor fora da lista → `Escolha uma máquina de um setor liberado.`; descrição vazia → `Informe a descrição.`; urgência ou tipo inválido → `Informe a urgência.` / `Informe o tipo de problema.`; com `'todos'` qualquer setor da máquina ativa passa.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/domain/manutencao/ordem-numero.test.ts src/domain/manutencao/tempo-ordem.test.ts src/domain/manutencao/fila-ordem.test.ts src/domain/manutencao/ordem-abertura.test.ts`

- [ ] **Step 3: Implementar e ver verde**

O mesmo comando. Esperado: PASS.

- [ ] **Step 4: Commit**

```powershell
git add src/domain/manutencao/ordem-numero.ts src/domain/manutencao/ordem-numero.test.ts src/domain/manutencao/tempo-ordem.ts src/domain/manutencao/tempo-ordem.test.ts src/domain/manutencao/fila-ordem.ts src/domain/manutencao/fila-ordem.test.ts src/domain/manutencao/ordem-abertura.ts src/domain/manutencao/ordem-abertura.test.ts
git commit -m "feat(manutencao): define numero, tempo, fila e abertura da ordem"
```

---

### Task 2: Finalizar, cancelar e quem age

**Files:**
- Create: `src/domain/manutencao/ordem-finalizacao.ts` + `.test.ts`
- Create: `src/domain/manutencao/ordem-cancelamento.ts` + `.test.ts`
- Create: `src/domain/manutencao/ordem-permissao.ts` + `.test.ts`
- Modify: `src/domain/manutencao/manutencao-acesso.ts` + `.test.ts`

**Interfaces:**
- Consumes: `CustoMedio` só para o total da linha (qtd × unitário, empate para cima). Pode usar `valorCentavos`-style helper interno ou `CustoMedio` se couber; o total da linha é `quantidadeMilesimos * custoUnitario / 1000` com o mesmo empate.
- Produces:

```ts
export type PecaFinalizacao = { pecaId: string; quantidadeMilesimos: number };
export class OrdemFinalizacao {
  validarHorarios(abertaEm: string, inicio: string, fim: string, agora: string):
    | { ok: true }
    | { ok: false; mensagem: string };
  validarServicos(servicos: string): { ok: true; servicos: string } | { ok: false; mensagem: string };
  consolidarPecas(
    linhas: PecaFinalizacao[],
    pecas: { id: string; ativo: boolean; custoMedioCentavos: number | null }[],
  ): { ok: true; linhas: { pecaId: string; quantidadeMilesimos: number; custoUnitarioCentavos: number; custoTotalCentavos: number }[]; custoPecasCentavos: number; faltando: string[] }
    | { ok: false; mensagem: string };
}
export class OrdemCancelamento {
  permite(args: {
    status: string;
    tipo: 'corretiva' | 'preventiva';
    solicitacaoEditar: boolean;
    manutencaoEditar: boolean;
    manutencaoAdministrar: boolean;
    motivo: string;
  }): { ok: true; exigeMotivo: boolean } | { ok: false; mensagem: string };
}
export class OrdemPermissao {
  veDetalhe(veTodas: boolean, setores: string[], setorOrdem: string): boolean;
  devolveOuFinaliza(args: {
    status: 'recebida';
    recebidoPor: string;
    usuarioId: string;
    administra: boolean;
  }): boolean;
}
```

`ManutencaoAcesso.abreCorretiva(snap)` = manutenção editar OU solicitação editar. `executaOficina(snap)` = manutenção editar (Recebi).

- [ ] **Step 1: Testes que falham**

Horários: início antes da abertura → `O início não pode ser antes da abertura.`; fim ≤ início → `O fim deve ser depois do início.`; fim depois de agora → `O fim não pode ficar no futuro.`; ok nos limites.

Serviços vazios → `Informe os serviços executados.`

Peças: mesma peça duas vezes soma; quantidade ≤ 0 → `Informe uma quantidade maior que zero, com até 3 casas.`; peça inativa → `Peça inativa.`; peça ausente → `Peça não encontrada.`; custo nulo → unitário 0; total da linha arredonda com empate para cima; `faltando` lista ids cujo saldo − qtd < 0 (a ação passa o saldo atual).

Cancelar: solicitação editar + corretiva aberta + motivo vazio → ok, `exigeMotivo: false`. Solicitação + preventiva → `Solicitante não cancela preventiva.`. Manutenção editar + aberta → ok sem motivo. Administrar + recebida + motivo vazio → `Informe o motivo.`. Finalizada → `Ordem finalizada não cancela.`.

Permissão: `veDetalhe` falso quando o setor não está na lista e não vê todas. `devolveOuFinaliza` true para o receptor ou quem administra.

- [ ] **Step 2: Implementar e ver verde**

Run: `npx vitest run src/domain/manutencao/ordem-finalizacao.test.ts src/domain/manutencao/ordem-cancelamento.test.ts src/domain/manutencao/ordem-permissao.test.ts src/domain/manutencao/manutencao-acesso.test.ts`

- [ ] **Step 3: Commit**

```powershell
git add src/domain/manutencao/ordem-finalizacao.ts src/domain/manutencao/ordem-finalizacao.test.ts src/domain/manutencao/ordem-cancelamento.ts src/domain/manutencao/ordem-cancelamento.test.ts src/domain/manutencao/ordem-permissao.ts src/domain/manutencao/ordem-permissao.test.ts src/domain/manutencao/manutencao-acesso.ts src/domain/manutencao/manutencao-acesso.test.ts
git commit -m "feat(manutencao): valida finalizacao, cancelamento e quem age na ordem"
```

---

### Task 3: Tabelas da ordem e RPCs

**Files:**
- Create: `supabase/migrations/20261109210000_manutencao_ordens.sql`
- Modify: `src/app/actions/manutencao-solicitante-actions.ts` (usar a RPC)

**Interfaces:**
- Produces: `manutencao_ordens`, `manutencao_ordem_pecas`, `manutencao_ordem_ajudantes`, `manutencao_substituir_usuario_setores`, `manutencao_finalizar_ordem`

- [ ] **Step 1: Migration**

`manutencao_ordens`:
- `id uuid pk`, `numero integer not null unique`, `tipo text check in ('corretiva','preventiva')`
- `plano_id uuid` nulo nesta fatia (sem FK ainda; a preventiva cria a FK)
- `maquina_id uuid not null references manutencao_maquinas(id)`
- `setor_id uuid not null references pessoas_setores(id)`
- `urgencia text`, `tipo_problema text`, `descricao text not null check btrim <> ''`
- `status text not null check in ('aberta','recebida','finalizada','cancelada')`
- `aberta_por uuid references usuarios(id)` (nullable), `aberta_em timestamptz not null default now()`
- `recebida_por uuid`, `recebida_em timestamptz`
- `inicio_em`, `fim_em timestamptz`, `servicos text`
- `cancelada_por uuid`, `cancelada_em timestamptz`, `cancelamento_motivo text`
- `custo_pecas_centavos integer not null default 0 check >= 0`
- `created_at`, `updated_at`
- Checks: corretiva exige urgência e tipo_problema nos enums; preventiva exige os dois nulos. Recebida exige recebida_por/em. Finalizada exige inicio, fim, servicos. Cancelada exige cancelada_por/em. Motivo obrigatório só quando preenchido via ação (não force no CHECK genérico).

Sequência `manutencao_ordens_numero_seq` owned by `numero`, default `nextval`.

`manutencao_ordem_pecas`: `id`, `ordem_id`, `peca_id`, `quantidade numeric(14,3) > 0`, `custo_unitario_centavos integer >= 0`, `custo_total_centavos integer >= 0`, unique `(ordem_id, peca_id)`.

`manutencao_ordem_ajudantes`: `ordem_id`, `usuario_id`, PK composta.

RLS ligado. Select ordem: `(SELECT auth_tem_modulo('interno_manutencao','ler')) OR (SELECT is_admin()) OR ((SELECT auth_tem_modulo('interno_manutencao_solicitacao','ler')) AND manutencao_setor_vale(setor_id))`. Insert/update: só service role na prática (sem policy de write para authenticated, igual movimento). Peças e ajudantes: select espelha a ordem via join ou via existência da ordem legível; sem write para authenticated. Sem DELETE.

Índices: `(status, aberta_em)`, `(maquina_id)`, `(plano_id)` (mesmo sem FK), `(setor_id)`.

`manutencao_substituir_usuario_setores(p_usuario uuid, p_setores uuid[])`: delete + insert na mesma função, SECURITY INVOKER, search_path public. REVOKE ALL de PUBLIC/anon/authenticated. GRANT EXECUTE só service_role.

`manutencao_finalizar_ordem(p_ordem uuid, p_usuario uuid, p_inicio timestamptz, p_fim timestamptz, p_servicos text, p_custo_pecas integer, p_pecas jsonb, p_ajudantes uuid[], p_administra boolean)`:
- Trava a ordem `FOR UPDATE`. Status tem de ser `recebida`. Se não administra, `recebida_por` tem de ser `p_usuario`. Senão: `Ordem não está recebida.` / `Só quem recebeu ou quem administra finaliza.`
- Para cada item de `p_pecas` (`peca_id`, `quantidade`, `custo_unitario`, `custo_total`, `saldo_esperado`, `custo_esperado`, `saldo_novo`): trava a peça, confere ativo, confere esperado, exige `custo_novo = custo_esperado` (consumo não muda média), grava movimento `consumo_os` com `ordem_id`, atualiza saldo com `set_config('manutencao.movimento','1',true)`.
- Insere linhas em `ordem_pecas` e `ordem_ajudantes`. Atualiza a ordem para `finalizada` com início, fim, serviços e custo.
- Returns `faltando text[]` = códigos das peças cujo `saldo_novo < 0`.
- REVOKE/GRANT como a outra RPC.

Estenda o CHECK de movimentos se preciso: `consumo_os` já exige `ordem_id`. A função `manutencao_registrar_movimento` continua recusando `consumo_os`.

- [ ] **Step 2: Action do solicitante**

`substituirSetores` passa a chamar `rpc('manutencao_substituir_usuario_setores', { p_usuario, p_setores })`.

- [ ] **Step 3: Commit**

```powershell
git add supabase/migrations/20261109210000_manutencao_ordens.sql src/app/actions/manutencao-solicitante-actions.ts
git commit -m "feat(manutencao): cria ordens e as RPCs de finalizar e setores"
```

---

### Task 4: Ações de abrir, receber, devolver e cancelar

**Files:**
- Create: `src/app/actions/manutencao-ordem-actions.ts`
- Create: `src/app/actions/manutencao-ordem-consulta.ts`

**Interfaces:**
- Consumes: domínio das tasks 1–2, `requireInternoModulo` / `requireInternoQualquerModulo`, service role
- Produces: `abrirCorretiva`, `receberOrdem`, `devolverOrdem`, `cancelarOrdem`, `listarFila`, `carregarOrdem`

- [ ] **Step 1: Abrir**

Exige `abreCorretiva`. Carrega a máquina ativa. Setores: se manutenção editar → `'todos'`; senão lista do usuário filtrada. `OrdemAbertura.validar`. Insert com status `aberta`, `aberta_por` = usuário, setor snapshot. Sucesso: `{ ok: true, numero, mensagem: "Ordem aberta." }`.

- [ ] **Step 2: Recebi / devolver / cancelar**

`receberOrdem(numero)`: manutenção editar. Update `status=recebida`, `recebida_por`, `recebida_em=now()` where `numero` and `status=aberta`. Se nenhuma linha: leia a ordem; se recebida, `Já recebida por {nome}`; senão `Ordem não está aberta.`

`devolverOrdem(numero)`: status recebida; `OrdemPermissao.devolveOuFinaliza`; limpa recebida_por/em e volta para aberta.

`cancelarOrdem(numero, motivo)`: carrega ordem; `OrdemCancelamento.permite`; grava cancelada.

- [ ] **Step 3: Consultas**

`listarFila`: qualquer módulo ler. Manutenção vê todas abertas/recebidas. Solicitante filtra por setores elegíveis; zero setores → mensagem da fundação e lista vazia. Ordena com `FilaOrdem`. Campos: numero, maquinaNome, setorNome, urgencia, tipoProblema, tipo, status, recebidaPorNome, abertaEm.

`carregarOrdem(numero)`: checa `veDetalhe`. Solicitante não recebe `custoPecasCentavos` nem custo das linhas (só nome e qtd). Inclui flags: `podeReceber`, `podeDevolver`, `podeFinalizar`, `podeCancelar`.

- [ ] **Step 4: Commit**

```powershell
git add src/app/actions/manutencao-ordem-actions.ts src/app/actions/manutencao-ordem-consulta.ts
git commit -m "feat(manutencao): abre, recebe, devolve e cancela a ordem"
```

---

### Task 5: Ação de finalizar

**Files:**
- Create: `src/app/actions/manutencao-ordem-finalizar-actions.ts`
- Modify: `src/app/actions/manutencao-ordem-actions.ts` (reexport se útil) — preferir arquivo separado

- [ ] **Step 1: Implementar**

`finalizarOrdem(numero, { inicioIso, fimIso, servicos, pecas: { pecaId, quantidadeTexto }[], ajudanteIds: string[] })`:
1. Exige manutenção editar. Carrega ordem recebida. Checa `devolveOuFinaliza`.
2. `validarHorarios` com `agora` = now ISO. `validarServicos`.
3. Carrega peças citadas; consolida com `OrdemFinalizacao.consolidarPecas` (passe saldos atuais para montar `faltando` depois do RPC, ou use o retorno do RPC).
4. Ajudantes: só usuários com manutenção editar/administrar, distintos do receptor. Lista vazia ok. Inválido → `Ajudante inválido.`
5. Chama `manutencao_finalizar_ordem`. Em `Estoque mudou. Tente de novo.`, relê peças e tenta uma segunda vez.
6. Sucesso: `Ordem finalizada.` Se o RPC devolver códigos em falta, acrescente ` Saldo negativo: {codigos}.`

- [ ] **Step 2: Checagem**

Run: `npx vitest run src/domain/manutencao`

- [ ] **Step 3: Commit**

```powershell
git add src/app/actions/manutencao-ordem-finalizar-actions.ts
git commit -m "feat(manutencao): finaliza a ordem com baixa de pecas"
```

---

## Self-review

- Fatia 3 da spec: abertura, fila, detalhe, Recebi, devolver, finalizar com baixa, cancelar. Domínio e ações cobertos aqui; telas no plano irmão.
- Preventiva e indicadores ficam fora. `plano_id` existe sem FK até a fatia 4.
- A média ponderada continua só em `CustoMedio`. Consumo não a muda.
