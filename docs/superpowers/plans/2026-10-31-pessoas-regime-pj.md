# Regime CLT e PJ Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cadastrar prestador PJ na ficha do colaborador, com CLT como padrão, sem aviso prévio nem exame ocupacional.

**Architecture:** Colunas `regime`, `cnpj` e `razao_social` em `pessoas_colaboradores`. O domínio normaliza e recusa troca de regime com aviso ou saída prevista. O desligamento PJ grava só a data e não cria `pessoas_avisos`.

**Tech Stack:** Next.js 15, TypeScript, Supabase SQL, Vitest, componentes de `src/components/ui`.

**Spec:** `docs/superpowers/specs/2026-10-31-pessoas-regime-pj-design.md`

## Global Constraints

- Regime `clt` ou `pj`; padrão `clt`. Quem já existe fica `clt`.
- CNPJ e razão social opcionais no PJ; CLT grava os dois vazios.
- CNPJ preenchido: 14 dígitos e dígitos verificadores. Mensagem: `CNPJ inválido.`
- Razão social: trim, máximo 200, sem capitalização de nome. Mensagem: `Razão social longa demais.`
- PJ ocupa setor, turno, quadro e faltas. Aviso e exame ocupacional só para CLT.
- INSS só para CLT. Mensagem: `INSS vale só para CLT.`
- Exame em PJ: `Exame ocupacional vale só para CLT.`
- Troca para PJ com aviso ativo: `Cancele o aviso antes de mudar o regime para PJ.`
- Troca para CLT com saída prevista: `Cancele a saída prevista antes de mudar o regime para CLT.`
- Saída prevista: regime `pj`, situação diferente de `desligado`, `data_desligamento` preenchida.
- Data de “hoje” no desligamento continua a de `pessoas_desligar` (`CURRENT_DATE`).
- Não criar card, permissão, pessoa extra nem data de contrato. Não alterar `pessoas_efetivar_desligamentos`.
- Arquivo &lt; 500 linhas. Função &lt; 40 linhas. pt-BR operacional. Testes: `npx vitest run <arquivo>`.

## File map

| Arquivo | Papel |
|---------|--------|
| `src/domain/pessoas/cnpj-verificador.ts` | Dígitos verificadores |
| `src/domain/pessoas/regime-cadastro.ts` | Regime, CNPJ e razão social |
| `src/domain/pessoas/regime-troca.ts` | Bloqueio da troca e saída prevista |
| `src/domain/pessoas/colaborador-csv.ts` | CSV com as três colunas |
| `src/domain/pessoas/carga-colaborador-upsert.ts` | Linha da carga sem regime |
| `supabase/migrations/20261031160000_pessoas_regime.sql` | Colunas, checks, desligar e cancelar saída |
| `colaborador-cadastro.ts`, parser, actions, ficha | Gravação e leitura |
| `colaborador-lista-filtro.ts`, parser, `pessoas-actions.ts`, `PessoasLista.tsx` | Selo, filtro e busca |
| `vinculo-regras.ts`, `pessoas-vinculo-actions.ts`, menu e painel | Desligamento e cancelar saída |
| `pessoas-exames-actions.ts`, `afastamento.ts` | Recusas de PJ |
| `quadro-agrupamento.ts`, `pessoas-quadro-actions.ts`, `QuadroLista.tsx` | Menu do quadro com regime |

---

### Task 1: Domínio do regime e do CNPJ

**Files:**
- Create: `src/domain/pessoas/cnpj-verificador.ts`
- Create: `src/domain/pessoas/cnpj-verificador.test.ts`
- Create: `src/domain/pessoas/regime-cadastro.ts`
- Create: `src/domain/pessoas/regime-cadastro.test.ts`
- Modify: `src/domain/pessoas/colaborador-cadastro.ts`
- Modify: `src/domain/pessoas/colaborador-cadastro.test.ts`

**Interfaces:**
- Produces: `CnpjVerificador.verificar(digitos: string): boolean`
- Produces: `type Regime = 'clt' | 'pj'`
- Produces: `RegimeCadastroNormalizador.normalizar(entrada: Record<string, string>): { regime: Regime; cnpj: string | null; razaoSocial: string | null }`
- Produces: `ColaboradorCadastro` com `regime`, `cnpj`, `razaoSocial`. `CADASTRO_VAZIO.regime` é `'clt'`.

- [ ] **Step 1: Write the failing tests**

```ts
// cnpj-verificador.test.ts
import { describe, expect, it } from 'vitest';
import { CnpjVerificador } from './cnpj-verificador';

describe('CnpjVerificador', () => {
  const verificador = new CnpjVerificador();

  it('aceita CNPJ com dígitos verificadores', () => {
    expect(verificador.verificar('11444777000161')).toBe(true);
  });

  it('recusa tamanho, repetido e dígito errado', () => {
    expect(verificador.verificar('1144477700016')).toBe(false);
    expect(verificador.verificar('11111111111111')).toBe(false);
    expect(verificador.verificar('11444777000162')).toBe(false);
  });
});
```

```ts
// regime-cadastro.test.ts
import { describe, expect, it } from 'vitest';
import { RegimeCadastroNormalizador } from './regime-cadastro';

describe('RegimeCadastroNormalizador', () => {
  const normalizador = new RegimeCadastroNormalizador();

  it('nasce CLT e zera CNPJ e razão social', () => {
    expect(normalizador.normalizar({})).toEqual({ regime: 'clt', cnpj: null, razaoSocial: null });
    expect(normalizador.normalizar({ regime: 'clt', cnpj: '11444777000161', razaoSocial: 'Pao LTDA' })).toEqual({
      regime: 'clt',
      cnpj: null,
      razaoSocial: null,
    });
  });

  it('aceita PJ sem documentos e com CNPJ mascarado', () => {
    expect(normalizador.normalizar({ regime: 'pj' })).toEqual({ regime: 'pj', cnpj: null, razaoSocial: null });
    expect(normalizador.normalizar({ regime: 'pj', cnpj: '11.444.777/0001-61', razaoSocial: '  Pao LTDA  ' })).toEqual({
      regime: 'pj',
      cnpj: '11444777000161',
      razaoSocial: 'Pao LTDA',
    });
  });

  it('recusa regime, CNPJ e razão social inválidos', () => {
    expect(() => normalizador.normalizar({ regime: 'mei' })).toThrow('Regime inválido.');
    expect(() => normalizador.normalizar({ regime: 'pj', cnpj: '11' })).toThrow('CNPJ inválido.');
    expect(() => normalizador.normalizar({ regime: 'pj', razaoSocial: 'A'.repeat(201) })).toThrow('Razão social longa demais.');
  });
});
```

No `colaborador-cadastro.test.ts`, no teste “aceita cadastro vazio”, acrescentar `expect(cadastro.regime).toBe('clt')`, `expect(cadastro.cnpj).toBeNull()` e `expect(cadastro.razaoSocial).toBeNull()`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/domain/pessoas/cnpj-verificador.test.ts src/domain/pessoas/regime-cadastro.test.ts src/domain/pessoas/colaborador-cadastro.test.ts`

Expected: FAIL, módulos inexistentes e `cadastro.regime` indefinido.

- [ ] **Step 3: Write minimal implementation**

`CnpjVerificador.verificar` recusa string que não seja 14 dígitos ou treze repetições do mesmo dígito. Pesos do primeiro dígito: `5,4,3,2,9,8,7,6,5,4,3,2`. Do segundo: `6,5,4,3,2,9,8,7,6,5,4,3,2`. Dígito = `resto < 2 ? 0 : 11 - resto`, com `resto = soma % 11`.

`RegimeCadastroNormalizador` usa essa classe. Vazio ou `clt` devolve CLT com os dois campos nulos. `pj` guarda CNPJ só dígitos, ou nulo se vazio, e a razão social com trim. Não chamar `NomeCapitalizador`.

Em `ColaboradorCadastro` e `CADASTRO_VAZIO`, incluir `regime: 'clt'`, `cnpj: null`, `razaoSocial: null`. `normalizar` espalha `new RegimeCadastroNormalizador().normalizar(entrada)` no retorno.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/domain/pessoas/cnpj-verificador.test.ts src/domain/pessoas/regime-cadastro.test.ts src/domain/pessoas/colaborador-cadastro.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/domain/pessoas/cnpj-verificador.ts src/domain/pessoas/cnpj-verificador.test.ts src/domain/pessoas/regime-cadastro.ts src/domain/pessoas/regime-cadastro.test.ts src/domain/pessoas/colaborador-cadastro.ts src/domain/pessoas/colaborador-cadastro.test.ts
git commit -m "feat(pessoas): normaliza regime CLT ou PJ no cadastro"
```

---

### Task 2: Colunas e desligamento no banco

**Files:**
- Create: `supabase/migrations/20261031160000_pessoas_regime.sql`

**Interfaces:**
- Consumes: `Regime` da Task 1, só como valores `clt` e `pj`.
- Produces: `pessoas_desligar(p_codigo text, p_data date, p_tipo text)` passa a ler `regime`. `pessoas_cancelar_saida(p_codigo text) returns void`.

- [ ] **Step 1: Add the migration**

```sql
ALTER TABLE public.pessoas_colaboradores
  ADD COLUMN regime text NOT NULL DEFAULT 'clt',
  ADD COLUMN cnpj text NULL,
  ADD COLUMN razao_social text NULL;

ALTER TABLE public.pessoas_colaboradores
  ADD CONSTRAINT pessoas_colaboradores_regime_check CHECK (regime IN ('clt', 'pj')),
  ADD CONSTRAINT pessoas_colaboradores_cnpj_digitos_check CHECK (cnpj IS NULL OR cnpj ~ '^[0-9]{14}$'),
  ADD CONSTRAINT pessoas_colaboradores_razao_social_check CHECK (razao_social IS NULL OR char_length(razao_social) <= 200),
  ADD CONSTRAINT pessoas_colaboradores_regime_clt_check CHECK (
    regime = 'pj' OR (cnpj IS NULL AND razao_social IS NULL)
  );

CREATE OR REPLACE FUNCTION public.pessoas_desligar(p_codigo text, p_data date, p_tipo text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_col uuid;
  v_regime text;
BEGIN
  SELECT id, regime INTO v_col, v_regime FROM public.pessoas_colaboradores WHERE codigo = p_codigo;
  IF v_col IS NULL THEN RAISE EXCEPTION 'Colaborador não encontrado.'; END IF;
  IF v_regime IS DISTINCT FROM 'pj' AND p_tipo NOT IN ('com_trabalho', 'sem_trabalho') THEN
    RAISE EXCEPTION 'Informe se o aviso é com ou sem trabalho.';
  END IF;
  UPDATE public.pessoas_avisos
  SET situacao = 'encerrado', updated_at = now()
  WHERE colaborador_id = v_col AND situacao = 'ativo';
  IF p_data > CURRENT_DATE THEN
    UPDATE public.pessoas_colaboradores SET data_desligamento = p_data, updated_at = now() WHERE id = v_col;
    IF v_regime IS DISTINCT FROM 'pj' THEN
      INSERT INTO public.pessoas_avisos (colaborador_id, tipo, inicio, ultimo_dia, termino, situacao)
      VALUES (v_col, p_tipo, CURRENT_DATE, p_data, p_data, 'ativo');
    END IF;
    RETURN;
  END IF;
  UPDATE public.pessoas_alocacoes SET fim = p_data, updated_at = now() WHERE colaborador_id = v_col AND fim IS NULL;
  IF v_regime IS DISTINCT FROM 'pj' THEN
    INSERT INTO public.pessoas_avisos (colaborador_id, tipo, inicio, ultimo_dia, termino, situacao)
    VALUES (v_col, p_tipo, p_data, p_data, p_data, 'encerrado');
  END IF;
  UPDATE public.pessoas_colaboradores
  SET situacao = 'desligado', data_desligamento = p_data, afastamento = NULL, updated_at = now()
  WHERE id = v_col;
END $$;

CREATE OR REPLACE FUNCTION public.pessoas_cancelar_saida(p_codigo text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_col uuid;
  v_regime text;
  v_situacao text;
  v_data date;
BEGIN
  SELECT id, regime, situacao, data_desligamento
  INTO v_col, v_regime, v_situacao, v_data
  FROM public.pessoas_colaboradores WHERE codigo = p_codigo;
  IF v_col IS NULL THEN RAISE EXCEPTION 'Colaborador não encontrado.'; END IF;
  IF v_regime IS DISTINCT FROM 'pj' OR v_situacao = 'desligado' OR v_data IS NULL THEN
    RAISE EXCEPTION 'Não há saída prevista para cancelar.';
  END IF;
  UPDATE public.pessoas_colaboradores SET data_desligamento = NULL, updated_at = now() WHERE id = v_col;
END $$;
```

Não criar policy nova. As policies de `pessoas_colaboradores` cobrem as colunas. Não alterar `pessoas_efetivar_desligamentos`.

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/20261031160000_pessoas_regime.sql
git commit -m "feat(pessoas): guarda regime e desliga PJ sem aviso"
```

---

### Task 3: Gravar e mostrar a ficha

**Files:**
- Create: `src/domain/pessoas/regime-troca.ts`
- Create: `src/domain/pessoas/regime-troca.test.ts`
- Modify: `src/domain/pessoas/colaborador-cadastro-row-parser.ts`
- Modify: `src/domain/pessoas/colaborador-cadastro-row-parser.test.ts`
- Modify: `src/domain/pessoas/cadastro-exibicao.ts`
- Modify: `src/domain/pessoas/cadastro-exibicao.test.ts`
- Modify: `src/app/actions/pessoas-cadastro-actions.ts`
- Modify: `src/features/pessoas/components/CadastroFormulario.tsx`
- Modify: `src/features/pessoas/components/CadastroLeitura.tsx`

**Interfaces:**
- Consumes: `RegimeCadastroNormalizador` e `ColaboradorCadastro` da Task 1.
- Produces: `RegimeTroca.avaliar(destino: Regime, avisoAtivo: boolean, situacao: string, dataDesligamento: string | null): void`
- Produces: `RegimeTroca.saidaPrevista(regime: Regime, situacao: string, dataDesligamento: string | null): boolean`
- Produces: `CadastroExibicao.cnpj(valor: string | null): string` e `CadastroExibicao.regime(valor: Regime): string`

- [ ] **Step 1: Write the failing tests**

```ts
// regime-troca.test.ts
import { describe, expect, it } from 'vitest';
import { RegimeTroca } from './regime-troca';

describe('RegimeTroca', () => {
  const troca = new RegimeTroca();

  it('recusa PJ com aviso e CLT com saída prevista', () => {
    expect(() => troca.avaliar('pj', true, 'ativo', null)).toThrow('Cancele o aviso antes de mudar o regime para PJ.');
    expect(() => troca.avaliar('clt', false, 'ativo', '2026-11-02')).toThrow(
      'Cancele a saída prevista antes de mudar o regime para CLT.',
    );
  });

  it('permite desligado e PJ sem aviso', () => {
    expect(() => troca.avaliar('clt', false, 'desligado', '2026-10-01')).not.toThrow();
    expect(() => troca.avaliar('pj', false, 'ativo', null)).not.toThrow();
  });

  it('reconhece saída prevista só no PJ ainda ligado', () => {
    expect(troca.saidaPrevista('pj', 'ativo', '2026-11-02')).toBe(true);
    expect(troca.saidaPrevista('pj', 'desligado', '2026-11-02')).toBe(false);
    expect(troca.saidaPrevista('clt', 'ativo', '2026-11-02')).toBe(false);
    expect(troca.saidaPrevista('pj', 'ativo', null)).toBe(false);
  });
});
```

No parser test, a linha sem `regime` continua válida e `cadastro.regime` é `'clt'`. Uma linha com `regime: 'pj'`, `cnpj: '11444777000161'` e `razao_social: 'Pao LTDA'` devolve esses três campos. `regime: 'mei'` lança `Cadastro do colaborador inválido.`

Em `cadastro-exibicao.test.ts`: `exibir.cnpj('11444777000161')` é `11.444.777/0001-61`; `exibir.cnpj(null)` é `—`; `exibir.regime('pj')` é `PJ`; `exibir.regime('clt')` é `CLT`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/domain/pessoas/regime-troca.test.ts src/domain/pessoas/colaborador-cadastro-row-parser.test.ts src/domain/pessoas/cadastro-exibicao.test.ts`

Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

`RegimeTroca.avaliar` lança as duas mensagens da spec. Desligado não entra no segundo bloqueio. `saidaPrevista` é `regime === 'pj' && situacao !== 'desligado' && dataDesligamento !== null`.

O parser lê `regime`, `cnpj` e `razao_social`. Ausente ou `clt` vira `clt`. Outro valor lança `Cadastro do colaborador inválido.`

`CadastroExibicao.cnpj` mascara 14 dígitos. `regime` devolve `CLT` ou `PJ`.

`SELECT_CADASTRO` e `paraLinha` incluem `regime`, `cnpj`, `razao_social`. Antes do update, ler o `regime` atual, `situacao`, `data_desligamento` e se existe aviso `ativo`. Se `cadastro.regime` diferir do regime atual, chamar `RegimeTroca.avaliar`. Admissão nova já passa por `atualizarCadastroColaborador`.

`CadastroFormulario` guarda o regime em estado, inicial `cadastro.regime`. Select `name="regime"` com CLT e PJ, sempre visível, inclusive na admissão. CNPJ (`name="cnpj"`, `inputMode="numeric"`) e razão social (`name="razaoSocial"`) só com PJ.

`CadastroLeitura` mostra Regime no grupo Documentos. Com PJ, mostra CNPJ mascarado e razão social.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/domain/pessoas/regime-troca.test.ts src/domain/pessoas/colaborador-cadastro-row-parser.test.ts src/domain/pessoas/cadastro-exibicao.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/domain/pessoas/regime-troca.ts src/domain/pessoas/regime-troca.test.ts src/domain/pessoas/colaborador-cadastro-row-parser.ts src/domain/pessoas/colaborador-cadastro-row-parser.test.ts src/domain/pessoas/cadastro-exibicao.ts src/domain/pessoas/cadastro-exibicao.test.ts src/app/actions/pessoas-cadastro-actions.ts src/features/pessoas/components/CadastroFormulario.tsx src/features/pessoas/components/CadastroLeitura.tsx
git commit -m "feat(pessoas): edita regime, CNPJ e razão social na ficha"
```

---

### Task 4: Lista, busca e exportação

**Files:**
- Create: `src/domain/pessoas/colaborador-csv.ts`
- Create: `src/domain/pessoas/colaborador-csv.test.ts`
- Modify: `src/domain/pessoas/colaborador-lista-filtro.ts`
- Modify: `src/domain/pessoas/colaborador-lista-filtro.test.ts`
- Modify: `src/domain/pessoas/colaborador-lista-row-parser.ts`
- Modify: `src/app/actions/pessoas-actions.ts`
- Modify: `src/app/actions/pessoas-painel-actions.ts`
- Modify: `src/features/pessoas/components/PessoasLista.tsx`
- Modify: `src/domain/pessoas/quadro-agrupamento.ts`
- Modify: `src/app/actions/pessoas-quadro-actions.ts`
- Modify: `src/features/pessoas/components/QuadroLista.tsx`

**Interfaces:**
- Consumes: `Regime` da Task 1.
- Produces: `ColaboradorListaItem` com `regime: Regime`, `cnpj: string | null`, `razaoSocial: string | null`, `dataDesligamento: string | null`.
- Produces: critério `regime?: '' | Regime`.
- Produces: `ColaboradorCsv.gerar(linhas): string`, cabeçalho `codigo;nome;cpf;situacao;regime;cnpj;razao_social`.
- Produces: `QuadroPessoa.regime?: Regime` e `QuadroPessoa.dataDesligamento?: string | null`.

- [ ] **Step 1: Write the failing tests**

Estender o item do filtro com `regime: 'clt'`, `cnpj: null`, `razaoSocial: null`, `dataDesligamento: null`. Duplicar o primeiro item como PJ: código `VP-9003`, nome `Lia`, `regime: 'pj'`, `cnpj: '11444777000161'`, `razaoSocial: 'Pão Forte LTDA'`.

```ts
expect(filtro.aplicar(itens, { regime: 'pj' }).map((i) => i.codigo)).toEqual(['VP-9003']);
expect(filtro.aplicar(itens, { regime: '' }).length).toBe(3);
expect(filtro.aplicar(itens, 'pao forte').map((i) => i.codigo)).toEqual(['VP-9003']);
expect(filtro.aplicar(itens, '11.444.777/0001-61').map((i) => i.codigo)).toEqual(['VP-9003']);
```

`regime` combina com os filtros já existentes: `{ regime: 'pj', situacao: 'desligado' }` devolve vazio se a Lia estiver ativa.

```ts
// colaborador-csv.test.ts
import { describe, expect, it } from 'vitest';
import { ColaboradorCsv } from './colaborador-csv';

describe('ColaboradorCsv', () => {
  it('inclui regime, CNPJ e razão social como texto', () => {
    const csv = new ColaboradorCsv().gerar([
      {
        codigo: 'VP-1',
        nome: 'Ana',
        cpf: null,
        situacao: 'ativo',
        regime: 'pj',
        cnpj: '11444777000161',
        razaoSocial: '=Pao',
      },
    ]);
    expect(csv.split('\n')[0]).toBe('codigo;nome;cpf;situacao;regime;cnpj;razao_social');
    expect(csv).toContain('"11444777000161"');
    expect(csv).toContain(`"'=Pao"`);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/domain/pessoas/colaborador-lista-filtro.test.ts src/domain/pessoas/colaborador-csv.test.ts`

Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

O filtro, se `criterio.regime` estiver preenchido, exige igualdade. A busca normaliza nome, código e razão social. No CNPJ, compara só dígitos do termo com os dígitos gravados.

O parser da lista lê os quatro campos. Regime desconhecido lança o erro de linha inválida. Ausente vira `clt`.

`COLABORADORES_SELECT` ganha `regime, cnpj, razao_social, data_desligamento`.

`ColaboradorCsv` usa `CsvFormulaSeguro`. `exportarColaboradoresCsv` seleciona as colunas novas e chama `gerar`.

Na lista, o título é o nome e, se `regime === 'pj'`, um `Badge` com texto `PJ`. Filtro Regime: Todos, CLT, PJ. Placeholder: `Nome, código ou CNPJ`. A grade passa a `xl:grid-cols-6`. Se `regime === 'pj'`, a coluna Próximo exame mostra `—` e não é botão. O menu recebe `onExames` só quando o regime é `clt`.

`QuadroPessoa` ganha `regime?` e `dataDesligamento?`. O select de alocações pede `pessoas_colaboradores(codigo, nome, lider_setor, afastamento, regime, data_desligamento)`. `paraColaborador` copia os dois, com padrão `clt` e `null`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/domain/pessoas/colaborador-lista-filtro.test.ts src/domain/pessoas/colaborador-csv.test.ts src/domain/pessoas/quadro-agrupamento.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/domain/pessoas/colaborador-csv.ts src/domain/pessoas/colaborador-csv.test.ts src/domain/pessoas/colaborador-lista-filtro.ts src/domain/pessoas/colaborador-lista-filtro.test.ts src/domain/pessoas/colaborador-lista-row-parser.ts src/app/actions/pessoas-actions.ts src/app/actions/pessoas-painel-actions.ts src/features/pessoas/components/PessoasLista.tsx src/domain/pessoas/quadro-agrupamento.ts src/app/actions/pessoas-quadro-actions.ts src/features/pessoas/components/QuadroLista.tsx
git commit -m "feat(pessoas): filtra e exporta colaboradores por regime"
```

---

Tasks 5 a 7 estão em `docs/superpowers/plans/2026-10-31-pessoas-regime-pj-vinculo.md`.
