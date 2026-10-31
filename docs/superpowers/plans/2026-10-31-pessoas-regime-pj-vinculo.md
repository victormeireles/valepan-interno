# Regime CLT e PJ — vínculo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Desligar PJ sem aviso, recusar exame e INSS, e preservar o regime na carga.

**Architecture:** A parte anterior grava o regime na ficha e na lista. Esta parte usa esse regime no vínculo, no exame e na carga.

**Tech Stack:** Next.js 15, TypeScript, Supabase SQL, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-31-pessoas-regime-pj-design.md`

**Parte anterior:** `docs/superpowers/plans/2026-10-31-pessoas-regime-pj.md` (Tasks 1 a 4)

## Global Constraints

- PJ não cria `pessoas_avisos`. Data futura grava `data_desligamento` e mantém a situação. Data de hoje ou anterior desliga e libera a vaga.
- Hoje no SQL continua `CURRENT_DATE`. Não alterar `pessoas_efetivar_desligamentos`.
- Cancelar saída limpa `data_desligamento` e mantém a situação. Mensagem de sucesso: `Saída prevista cancelada.`
- Exame em PJ: `Exame ocupacional vale só para CLT.` INSS em PJ: `INSS vale só para CLT.`
- A carga não envia `regime`, `cnpj` nem `razao_social`.
- PJ ativo em posição conta como contratado. Não mudar a fórmula do quadro.
- Arquivo &lt; 500 linhas. Função &lt; 40 linhas. pt-BR operacional. Testes: `npx vitest run <arquivo>`.

---

### Task 5: Desligamento e cancelar saída

**Files:**
- Modify: `src/domain/pessoas/vinculo-regras.ts`
- Modify: `src/domain/pessoas/vinculo-regras.test.ts`
- Modify: `src/app/actions/pessoas-vinculo-actions.ts`
- Modify: `src/features/pessoas/components/MenuPessoa.tsx`
- Modify: `src/features/pessoas/components/PessoasAcaoPainel.tsx`

**Interfaces:**
- Consumes: `Regime` de `regime-cadastro.ts` e `RegimeTroca.saidaPrevista(regime, situacao, dataDesligamento): boolean`.
- Consumes: `pessoas_desligar` e `pessoas_cancelar_saida` da migration `20261031160000_pessoas_regime.sql`.
- Produces: `VinculoRegras.desligar(data: string, hoje: string, tipo: string, regime?: Regime): { data: string; futuro: boolean; tipo: 'com_trabalho' | 'sem_trabalho' | null }`
- Produces: `VinculoRegras.afastar(situacao: string, motivo: string, regime?: Regime): { motivo: MotivoAfastamento }`
- Produces: `cancelarSaidaColaborador(codigo: string): Promise<VinculoResultado>`
- Produces: `AcaoPessoa` inclui `'cancelar_saida'`.

- [ ] **Step 1: Write the failing test**

Acrescentar em `vinculo-regras.test.ts`:

```ts
it('desliga PJ sem tipo de aviso e recusa INSS', () => {
  expect(regras.desligar('2026-11-02', '2026-10-31', '', 'pj')).toEqual({
    data: '2026-11-02',
    futuro: true,
    tipo: null,
  });
  expect(regras.desligar('2026-10-31', '2026-10-31', '', 'pj').futuro).toBe(false);
  expect(() => regras.afastar('ativo', 'inss', 'pj')).toThrow('INSS vale só para CLT.');
  expect(regras.afastar('ativo', 'abandono', 'pj')).toEqual({ motivo: 'abandono' });
});
```

O teste antigo de `desligar` com três argumentos permanece e continua exigindo com ou sem trabalho.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/domain/pessoas/vinculo-regras.test.ts`

Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

`desligar` recebe `regime: Regime = 'clt'`. Em PJ, ignora `tipo` e devolve `tipo: null`. Em CLT, mantém a validação atual. `afastar` recebe `regime: Regime = 'clt'`. Se o regime for `pj` e o motivo lido for `inss`, lança `INSS vale só para CLT.`

`desligarColaborador` lê `regime` em `pessoas_colaboradores`. Para PJ, o RPC envia `p_tipo: ''`. A mensagem de PJ futuro é `Saída prevista registrada. A pessoa permanece no quadro até a data.` A de PJ no dia é `Colaborador desligado.` CLT conserva as mensagens atuais.

```ts
const resultado = await rpc('pessoas_desligar', {
  p_codigo: codigo,
  p_data: data,
  p_tipo: regime === 'pj' ? '' : tipo,
});
```

`cancelarSaidaColaborador` chama `rpc('pessoas_cancelar_saida', { p_codigo: codigo })`. Sucesso: `Saída prevista cancelada.`

`AcaoPessoa` ganha `'cancelar_saida'`. `MenuPessoa` mostra Cancelar saída quando `new RegimeTroca().saidaPrevista(...)`. Cancelar aviso continua só com `avisoAtivo`. Exames só renderiza quando `onExames` existe e `item.regime !== 'pj'`.

No painel, desligar PJ esconde o select Aviso. O texto é: `Data depois de hoje marca a saída e mantém a pessoa no quadro. Data de hoje ou anterior desliga e libera a vaga.` Afastar PJ usa `new AfastamentoRotulo().opcoes().filter((opcao) => opcao.value !== 'inss')`. Em `executar`:

```ts
if (acao === 'cancelar_saida') return cancelarSaidaColaborador(pessoa.codigo);
if (acao === 'desligar') {
  return desligarColaborador(pessoa.codigo, data, pessoa.regime === 'pj' ? '' : String(form.get('tipo') ?? ''));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/domain/pessoas/vinculo-regras.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/domain/pessoas/vinculo-regras.ts src/domain/pessoas/vinculo-regras.test.ts src/app/actions/pessoas-vinculo-actions.ts src/features/pessoas/components/MenuPessoa.tsx src/features/pessoas/components/PessoasAcaoPainel.tsx
git commit -m "feat(pessoas): desliga PJ pela data e cancela a saída prevista"
```

---

### Task 6: Exame no servidor

**Files:**
- Modify: `src/domain/pessoas/regime-troca.ts`
- Modify: `src/domain/pessoas/regime-troca.test.ts`
- Modify: `src/app/actions/pessoas-exames-actions.ts`
- Modify: `src/app/actions/pessoas-vinculo-actions.ts`

**Interfaces:**
- Consumes: `VinculoRegras.afastar` da Task 5.
- Produces: `RegimeTroca.recusarExame(regime: Regime): void`

- [ ] **Step 1: Write the failing test**

```ts
it('recusa exame ocupacional de PJ', () => {
  const troca = new RegimeTroca();
  expect(() => troca.recusarExame('pj')).toThrow('Exame ocupacional vale só para CLT.');
  expect(() => troca.recusarExame('clt')).not.toThrow();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/domain/pessoas/regime-troca.test.ts`

Expected: FAIL, `recusarExame` inexistente.

- [ ] **Step 3: Write minimal implementation**

```ts
recusarExame(regime: Regime): void {
  if (regime === 'pj') throw new Error('Exame ocupacional vale só para CLT.');
}
```

Em `registrarExameColaborador`, ler `regime` junto do id. Chamar `recusarExame` antes do insert e devolver `{ ok: false, mensagem }` com o texto da exceção. Não apagar exame existente. `listarExamesColaborador` e `removerExameColaborador` permanecem.

`afastarColaborador` lê o regime do código e passa o terceiro argumento para `VinculoRegras.afastar`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/domain/pessoas/regime-troca.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/domain/pessoas/regime-troca.ts src/domain/pessoas/regime-troca.test.ts src/app/actions/pessoas-exames-actions.ts src/app/actions/pessoas-vinculo-actions.ts
git commit -m "feat(pessoas): recusa exame e INSS para prestador PJ"
```

---

### Task 7: Carga e quadro

**Files:**
- Create: `src/domain/pessoas/carga-colaborador-upsert.ts`
- Create: `src/domain/pessoas/carga-colaborador-upsert.test.ts`
- Modify: `scripts/import-pessoas-etapa1.ts`
- Modify: `src/domain/pessoas/quadro-montagem.test.ts`

**Interfaces:**
- Consumes: `CargaColaboradorLinha` de `carga-pessoas-csv.ts`.
- Produces: `CargaColaboradorUpsert.montar(linha: CargaColaboradorLinha, setorId: string | null, turnoId: string | null, atualizadoEm: string): Record<string, unknown>`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest';
import { CargaColaboradorUpsert } from './carga-colaborador-upsert';
import type { CargaColaboradorLinha } from './carga-pessoas-csv';

const linha: CargaColaboradorLinha = {
  codigo: 'VP-1',
  nome: 'Ana',
  situacao: 'ativo',
  cpf: null,
  cpfVerificado: false,
  setorCodigo: 'PRO',
  turnoCodigo: 'PRO-M',
  desligamentoDataDesconhecida: false,
  apelido: null,
  nascimento: null,
  nomeMae: null,
  endereco: null,
  telefone: null,
  email: null,
  cargo: null,
  cadastroIncompleto: false,
  dataAdmissao: null,
  dataDesligamento: null,
  observacoes: null,
  noQuadro: true,
};

describe('CargaColaboradorUpsert', () => {
  it('grava a pessoa sem regime, CNPJ ou razão social', () => {
    const row = new CargaColaboradorUpsert().montar(linha, 'setor', 'turno', '2026-10-31T00:00:00.000Z');
    expect(Object.keys(row).sort()).toEqual([
      'apelido',
      'cadastro_incompleto',
      'cargo',
      'codigo',
      'cpf',
      'cpf_verificado',
      'data_admissao',
      'data_desligamento',
      'desligamento_data_desconhecida',
      'email',
      'endereco',
      'nascimento',
      'nome',
      'nome_mae',
      'observacoes',
      'setor_id',
      'situacao',
      'telefone',
      'turno_id',
      'updated_at',
    ]);
    expect(row.setor_id).toBe('setor');
    expect(row.turno_id).toBe('turno');
    expect(row.updated_at).toBe('2026-10-31T00:00:00.000Z');
  });
});
```

Em `quadro-montagem.test.ts`:

```ts
it('conta pessoa ativa no quadro como contratada', () => {
  const resultado = montagem.montar(
    [{ setorCodigo: 'PRO', turnoCodigo: 'PRO-M', quantidade: 1 }],
    [pessoa({ codigo: 'VP-1' })],
  );
  expect(contagem.contar(resultado).contratados).toBe(1);
  expect(resultado.alocacoes[0]?.papel).toBe('ocupacao');
});
```

O quadro não recebe regime. PJ ativo entra por essa mesma ocupação. Não mudar `QuadroMontagem`.

- [ ] **Step 2: Run tests to verify the upsert test fails**

Run: `npx vitest run src/domain/pessoas/carga-colaborador-upsert.test.ts src/domain/pessoas/quadro-montagem.test.ts`

Expected: FAIL no upsert. O teste do quadro passa porque a ocupação já conta contratado. Ele permanece para documentar a regra.

- [ ] **Step 3: Write minimal implementation**

`CargaColaboradorUpsert.montar` devolve as chaves do teste, com os mesmos valores que `rowColaborador` monta hoje. `setor_id` e `turno_id` são os argumentos. `scripts/import-pessoas-etapa1.ts` substitui o objeto interno por `new CargaColaboradorUpsert().montar(...)`. Inserção sem as colunas de regime nasce `clt` pelo default. Atualização não as sobrescreve.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/domain/pessoas/carga-colaborador-upsert.test.ts src/domain/pessoas/quadro-montagem.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/domain/pessoas/carga-colaborador-upsert.ts src/domain/pessoas/carga-colaborador-upsert.test.ts scripts/import-pessoas-etapa1.ts src/domain/pessoas/quadro-montagem.test.ts
git commit -m "fix(pessoas): preserva regime na carga de colaboradores"
```
