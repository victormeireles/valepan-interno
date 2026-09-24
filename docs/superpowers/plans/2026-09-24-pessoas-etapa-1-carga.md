# Pessoas etapa 1 — carga Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gravar setores, horários e colaboradores a partir dos arquivos de `tmp/rh`, e listar quem foi carregado.

**Architecture:** Validação e prévia são classes puras. A migration cria quatro tabelas com RLS. O script faz upsert pelo código. A página só lista. Depende de `2026-09-24-pessoas-etapa-1-acesso.md`.

**Tech Stack:** Next.js 15, TypeScript, Vitest, Supabase Postgres.

## Global Constraints

- Códigos únicos: setor `PRO`, turno `PRO-MAD`, colaborador `VP-0001`.
- Colaborador não é `usuarios`. Turno de RH não é `config_operacao_turnos`.
- Dia `a_confirmar` não tem hora. Domingo não tem linha.
- CPF novo só entra válido. CPF legado inválido carrega com `cpf_verificado = false` e não é chave.
- Testes não usam dados pessoais reais. O script não imprime CPF.
- RLS com `(SELECT auth_tem_modulo('interno_pessoas', ...))`. Sem `USING (true)`. Sem policy de `DELETE`.
- `editar` grava. `ler` lê. Arquivo abaixo de 500 linhas.

Fora deste plano: posição, alocação, falta, extra, pagamento, visão geral e exportação.

---

### Task 1: CPF, nome e horário

**Files:**
- Create: `src/domain/pessoas/cpf-verificador.ts`
- Create: `src/domain/pessoas/cpf-verificador.test.ts`
- Create: `src/domain/pessoas/nome-capitalizador.ts`
- Create: `src/domain/pessoas/nome-capitalizador.test.ts`
- Create: `src/domain/pessoas/horario-dia.ts`
- Create: `src/domain/pessoas/horario-dia.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces: `CpfVerificador.verificar(digitos: string): boolean`, `NomeCapitalizador.formatar(texto: string): string`, `HorarioDiaParser.parseCelula(celula: string): HorarioCelula`.

```ts
export type HorarioCelula = {
  inicio: string | null;
  fim: string | null;
  terminaDiaSeguinte: boolean;
  situacao: 'definido' | 'nao_trabalha' | 'a_confirmar';
};
```

- [ ] **Step 1: Write the failing test**

`52998224725` é um CPF de exemplo com dígito válido, não um documento da empresa.

```ts
expect(new CpfVerificador().verificar('52998224725')).toBe(true);
expect(new CpfVerificador().verificar('11111111111')).toBe(false);
expect(new NomeCapitalizador().formatar('maria da silva')).toBe('Maria da Silva');
expect(new NomeCapitalizador().formatar('analista de rh')).toBe('Analista de RH');
expect(new HorarioDiaParser().parseCelula('21:00–07:00 (+1 dia)')).toEqual({
  inicio: '21:00', fim: '07:00', terminaDiaSeguinte: true, situacao: 'definido',
});
expect(new HorarioDiaParser().parseCelula('não trabalha').situacao).toBe('nao_trabalha');
expect(new HorarioDiaParser().parseCelula('**a confirmar**')).toEqual({
  inicio: null, fim: null, terminaDiaSeguinte: false, situacao: 'a_confirmar',
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/domain/pessoas`
Expected: FAIL, arquivos ausentes.

- [ ] **Step 3: Write minimal implementation**

```ts
export class CpfVerificador {
  verificar(digitos: string): boolean {
    if (!/^\d{11}$/.test(digitos) || /^(\d)\1{10}$/.test(digitos)) return false;
    return this.bate(digitos, 9) && this.bate(digitos, 10);
  }

  private bate(digitos: string, tamanho: number): boolean {
    let soma = 0;
    for (let i = 0; i < tamanho; i += 1) soma += Number(digitos[i]) * (tamanho + 1 - i);
    const resto = (soma * 10) % 11;
    return Number(digitos[tamanho]) === (resto === 10 ? 0 : resto);
  }
}
```

`NomeCapitalizador.formatar` divide por espaço, põe inicial maiúscula, deixa `de da do dos das e` minúsculas e `RH CPF CEP RJ` maiúsculas. `HorarioDiaParser.parseCelula` trata `não trabalha`, `a confirmar` e `HH:MM–HH:MM` com sufixo opcional `(+1 dia)`. Aceita hífen ou travessão.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/domain/pessoas`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/domain/pessoas
git commit -m "feat(pessoas): valida CPF, capitaliza nome e le horario do dia"
```

---

### Task 2: Prévia

**Files:**
- Create: `src/domain/pessoas/carga-pessoas-tipos.ts`
- Create: `src/domain/pessoas/carga-pessoas-preview.ts`
- Create: `src/domain/pessoas/carga-pessoas-preview.test.ts`

**Interfaces:**
- Consumes: `CpfVerificador`.
- Produces: `CargaPessoasPreview.prever(entrada): CargaPrevia`.

```ts
export type CargaSetor = {
  codigo: string;
  nome: string;
  tipo: 'operacional' | 'apoio';
  agrupamentoProposto: boolean;
};
export type CargaTurno = { codigo: string; setorCodigo: string; nome: string; operacional: boolean };
export type CargaColaborador = {
  codigo: string;
  nome: string;
  situacao: 'ativo' | 'admissao_prevista' | 'desligado';
  cpf: string | null;
  cpfVerificado: boolean;
  setorCodigo: string | null;
  turnoCodigo: string | null;
  desligamentoDataDesconhecida: boolean;
};
export type CargaPrevia = {
  inserir: string[];
  atualizar: string[];
  erros: { codigo: string; motivo: string }[];
};
```

- [ ] **Step 1: Write the failing test**

```ts
const result = new CargaPessoasPreview().prever({
  setores: [{ codigo: 'PRO', nome: 'Produção', tipo: 'operacional', agrupamentoProposto: false }],
  turnos: [{ codigo: 'PRO-M', setorCodigo: 'PRO', nome: 'Manhã', operacional: true }],
  colaboradores: [
    { codigo: 'VP-9001', nome: 'Pessoa Teste', situacao: 'ativo', cpf: '52998224725', cpfVerificado: true, setorCodigo: 'PRO', turnoCodigo: 'PRO-M', desligamentoDataDesconhecida: false },
    { codigo: 'VP-9001', nome: 'Duplicada', situacao: 'ativo', cpf: null, cpfVerificado: false, setorCodigo: 'PRO', turnoCodigo: 'PRO-M', desligamentoDataDesconhecida: false },
    { codigo: 'VP-9002', nome: 'Sem setor', situacao: 'ativo', cpf: '11111111111', cpfVerificado: false, setorCodigo: 'NAO', turnoCodigo: null, desligamentoDataDesconhecida: false },
  ],
  codigosJaGravados: ['VP-9002'],
});
expect(result.inserir).toEqual(['PRO', 'PRO-M', 'VP-9001']);
expect(result.atualizar).toEqual([]);
expect(result.erros).toEqual([
  { codigo: 'VP-9001', motivo: 'código repetido na carga' },
  { codigo: 'VP-9002', motivo: 'setor desconhecido' },
]);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/domain/pessoas/carga-pessoas-preview.test.ts`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

Ordem: setores, turnos, colaboradores. Código vazio ou repetido na entrada gera `código repetido na carga` e não entra em `inserir`. Turno cujo setor não entrou gera `setor desconhecido`. Colaborador com setor ou turno fora dos códigos válidos gera `setor desconhecido` ou `turno desconhecido` e não entra em `atualizar`, mesmo se o código já existir. Código válido já gravado vai para `atualizar`. CPF inválido não é erro nem chave. Linha ausente da entrada não é criada.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/domain/pessoas/carga-pessoas-preview.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/domain/pessoas/carga-pessoas-tipos.ts src/domain/pessoas/carga-pessoas-preview.ts src/domain/pessoas/carga-pessoas-preview.test.ts
git commit -m "feat(pessoas): previa da carga sem duplicar codigo"
```

---

### Task 3: Tabelas

**Files:**
- Create: `supabase/migrations/20260924200000_pessoas_etapa1.sql`

**Interfaces:**
- Consumes: `auth_tem_modulo(p_modulo text, p_nivel text)`.
- Produces: `pessoas_setores`, `pessoas_turnos`, `pessoas_turno_dias`, `pessoas_colaboradores`.

- [ ] **Step 1: Write the migration**

Colunas de setor: `id uuid pk`, `codigo text unique`, `nome`, `tipo` em `operacional|apoio`, `agrupamento_proposto boolean`, `ativo`, `created_at`, `updated_at`.

Turno: `id`, `codigo unique`, `setor_id` fk, `nome`, `operacional boolean`, `ativo`, timestamps.

Dia: `turno_id` fk, `dia smallint` de 1 a 6, `inicio time null`, `fim time null`, `termina_dia_seguinte boolean`, `situacao` em `definido|nao_trabalha|a_confirmar`, unique `(turno_id, dia)`. Check: `definido` exige as duas horas; os outros exigem as duas nulas.

Colaborador: `codigo unique`, `nome`, `apelido`, `nascimento date`, `nome_mae`, `cpf`, `cpf_verificado boolean default false`, `endereco`, `telefone`, `email`, `cargo`, `situacao` em `ativo|admissao_prevista|desligado`, `cadastro_incompleto boolean`, `setor_id` null fk, `turno_id` null fk, `data_admissao date`, `data_desligamento date`, `desligamento_data_desconhecida boolean default false`, `observacoes`, timestamps.

`ENABLE ROW LEVEL SECURITY` nas quatro. Para cada uma, três policies e nenhuma de delete:

```sql
CREATE POLICY pessoas_setores_select ON public.pessoas_setores
  FOR SELECT TO authenticated
  USING ((SELECT auth_tem_modulo('interno_pessoas', 'ler')));
CREATE POLICY pessoas_setores_insert ON public.pessoas_setores
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth_tem_modulo('interno_pessoas', 'editar')));
CREATE POLICY pessoas_setores_update ON public.pessoas_setores
  FOR UPDATE TO authenticated
  USING ((SELECT auth_tem_modulo('interno_pessoas', 'editar')))
  WITH CHECK ((SELECT auth_tem_modulo('interno_pessoas', 'editar')));
```

Os nomes das outras são `pessoas_turnos_select|insert|update`, `pessoas_turno_dias_select|insert|update`, `pessoas_colaboradores_select|insert|update`, com o mesmo `USING`/`WITH CHECK` e a tabela correspondente.

- [ ] **Step 2: Aplicar**

Run: `npx supabase db push` se a CLI já estiver ligada ao projeto. Sem login, parar e usar o fluxo de migration já adotado no repositório. Não criar projeto novo.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260924200000_pessoas_etapa1.sql
git commit -m "feat(pessoas): cria setores, turnos e colaboradores com RLS"
```

---

### Task 4: Lista

**Files:**
- Create: `src/domain/pessoas/colaborador-lista-filtro.ts`
- Create: `src/domain/pessoas/colaborador-lista-filtro.test.ts`
- Create: `src/app/actions/pessoas-actions.ts`
- Create: `src/app/pessoas/page.tsx`
- Create: `src/features/pessoas/components/PessoasLista.tsx`

**Interfaces:**
- Consumes: `requireInternoModulo('interno_pessoas', 'ler')`.
- Produces: `ColaboradorListaFiltro.aplicar(itens, termo)`, `listColaboradores(): Promise<ColaboradorListaItem[]>`.

```ts
export type ColaboradorListaItem = {
  codigo: string;
  nome: string;
  situacao: 'ativo' | 'admissao_prevista' | 'desligado';
  setorNome: string | null;
  turnoNome: string | null;
};
```

- [ ] **Step 1: Write the failing test**

```ts
const itens = [
  { codigo: 'VP-9001', nome: 'Maria da Silva', situacao: 'ativo' as const, setorNome: 'Produção', turnoNome: 'Manhã' },
  { codigo: 'VP-9002', nome: 'João Souza', situacao: 'desligado' as const, setorNome: null, turnoNome: null },
];
const filtro = new ColaboradorListaFiltro();
expect(filtro.aplicar(itens, 'maria').map((i) => i.codigo)).toEqual(['VP-9001']);
expect(filtro.aplicar(itens, 'vp-9002').map((i) => i.codigo)).toEqual(['VP-9002']);
expect(filtro.aplicar(itens, '').length).toBe(2);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/domain/pessoas/colaborador-lista-filtro.test.ts`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

`aplicar` remove acento e caixa do termo, de `nome` e de `codigo`. Termo vazio devolve a lista. `listColaboradores` chama `requireInternoModulo('interno_pessoas', 'ler')`, lê `pessoas_colaboradores` com nome do setor e do turno, ordena por `nome`. A página passa os itens para `PessoasLista`. Rótulos: Ativo, Admissão prevista, Desligado. Vazio: `Nenhum colaborador carregado.`

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/domain/pessoas/colaborador-lista-filtro.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/domain/pessoas/colaborador-lista-filtro.ts src/domain/pessoas/colaborador-lista-filtro.test.ts src/app/actions/pessoas-actions.ts src/app/pessoas/page.tsx src/features/pessoas/components/PessoasLista.tsx
git commit -m "feat(pessoas): lista colaboradores para quem tem leitura"
```

---

### Task 5: Script

**Files:**
- Create: `src/domain/pessoas/carga-pessoas-csv.ts`
- Create: `src/domain/pessoas/carga-pessoas-csv.test.ts`
- Create: `scripts/import-pessoas-etapa1.ts`

**Interfaces:**
- Consumes: `CargaPessoasPreview`, `CpfVerificador`, `NomeCapitalizador`, `HorarioDiaParser`, tipos da Task 2.
- Produces: `CargaPessoasCsv.lerSetores(csv: string): CargaSetor[]` e `lerColaboradores(csv: string): CargaColaborador[]`.

- [ ] **Step 1: Write the failing test**

```ts
const leitor = new CargaPessoasCsv();
expect(leitor.lerSetores('setor_id,nome,tipo,agrupamento_proposto\nPRO,Produção,Operacional,Não\n')).toEqual([
  { codigo: 'PRO', nome: 'Produção', tipo: 'operacional', agrupamentoProposto: false },
]);
expect(leitor.lerColaboradores(linhaColaborador())[0]).toMatchObject({
  codigo: 'VP-9001',
  nome: 'Maria da Silva',
  situacao: 'ativo',
  setorCodigo: 'PRO',
  turnoCodigo: 'PRO-M',
  cpfVerificado: false,
  desligamentoDataDesconhecida: false,
});
```

`linhaColaborador()` devolve o cabeçalho real de `colaboradores.csv` e uma linha `VP-9001,maria da silva,,Ativo,...` com `setor_id=PRO`, `turno_id=PRO-M` e CPF vazio.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/domain/pessoas/carga-pessoas-csv.test.ts`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

`Operacional` → `operacional`. `Apoio e gestão` → `apoio`. `Sim` em agrupamento → true. Situação `Ativo|Admissão prevista|Desligado` → `ativo|admissao_prevista|desligado`. Nome por `NomeCapitalizador`. CPF só dígitos; `cpfVerificado` só se `CpfVerificador` aceitar. Setor, turno e CPF vazios viram null. `desligamento_data_desconhecida = Sim` → true. O script lê `tmp/rh/setores.csv`, `tmp/rh/colaboradores.csv` e `tmp/rh/HORARIOS.md`. Cada célula de segunda a sábado vira `pessoas_turno_dias` via `parseCelula`, dia 1 a 6. `--dry-run` imprime só contagens de inserir, atualizar e erros. Sem a flag, upsert por `codigo`. Não gravar pessoa que não esteja no CSV.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/domain/pessoas`
Expected: PASS

- [ ] **Step 5: Dry-run**

Run: `npx tsx scripts/import-pessoas-etapa1.ts --dry-run`
Expected: contagens, sem CPF no stdout. Não gravar neste passo.

- [ ] **Step 6: Commit**

```bash
git add src/domain/pessoas/carga-pessoas-csv.ts src/domain/pessoas/carga-pessoas-csv.test.ts scripts/import-pessoas-etapa1.ts
git commit -m "feat(pessoas): carga privada de setores, horarios e colaboradores"
```
