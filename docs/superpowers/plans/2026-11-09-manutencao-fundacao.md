# Manutenção — fundação — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar os dois módulos, o cadastro de máquinas por setor operacional e a tela que marca os setores de quem solicita, com a fila ainda vazia.

**Architecture:** Regras puras em `src/domain/manutencao`. Ações em `src/app/actions` checam o módulo e gravam com service role, no padrão de Pessoas. A migration cria só `manutencao_maquinas` e `manutencao_usuario_setores`. Peças, ordem, preventiva e indicadores não entram neste plano.

**Tech Stack:** Next.js 15, React 19, TypeScript, Vitest, Supabase Postgres, Tailwind, catálogo `interno-modulos-catalog`.

## Global Constraints

- Dois módulos: `interno_manutencao` e `interno_manutencao_solicitacao`, grupo `manutencao`, rótulo "Manutenção". `grupo_ordem` é o maior de `aplicativo = interno`, mais um.
- Quem lê a manutenção vê todos os setores operacionais ativos e não abre ordem. Quem edita ou administra abre corretiva em qualquer um deles. A manutenção não usa a lista de setores.
- Solicitante sem setor válido vê "Nenhum setor liberado."
- Máquina: código, nome, setor operacional ativo, observação opcional. Código único sem diferença de maiúsculas e sem espaço nas pontas. Inativar não apaga.
- Ordem nova e a escolha de máquina filtrada ficam para o plano da corretiva. Esta fila não lista ordem.
- Não há policy de DELETE para o papel `authenticated`. A troca da lista de setores usa service role.
- Texto pt-BR. Alvo de toque mínimo 44 px. Arquivo novo perto de 400 linhas se divide antes disso.
- Não aplicar a migration no projeto remoto. O arquivo versionado é o entregável.

**Fora deste plano:** peças, estoque, ordem corretiva, preventiva, indicadores, real de hora, botão de início, horímetro, WhatsApp, foto.

---

### Task 1: Catálogo dos dois módulos

**Files:**
- Modify: `src/lib/auth/interno-modulos-catalog.ts`
- Test: `src/lib/auth/interno-modulos-catalog.test.ts`

**Interfaces:**
- Consumes: `MODULOS_INTERNO`, `isModuloInterno`
- Produces: os ids `interno_manutencao` e `interno_manutencao_solicitacao` dentro de `InternoModuloId`

- [ ] **Step 1: Write the failing test**

Trocar o teste de contagem para 14 e exigir os dois ids:

```ts
it('lista exatamente os 14 módulos interno_*', () => {
  expect(MODULOS_INTERNO).toHaveLength(14);
  expect(MODULOS_INTERNO).toContain('interno_manutencao');
  expect(MODULOS_INTERNO).toContain('interno_manutencao_solicitacao');
  expect(isModuloInterno('interno_manutencao')).toBe(true);
  expect(isModuloInterno('interno_manutencao_solicitacao')).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/auth/interno-modulos-catalog.test.ts`
Expected: FAIL, length 12 and ids ausentes.

- [ ] **Step 3: Write minimal implementation**

Acrescentar os dois ids no fim de `MODULOS_INTERNO`, depois de `interno_config`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/auth/interno-modulos-catalog.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth/interno-modulos-catalog.ts src/lib/auth/interno-modulos-catalog.test.ts
git commit -m "feat(manutencao): registra os módulos de manutenção e solicitação"
```

---

### Task 2: Regras de código, setor e fila vazia

**Files:**
- Create: `src/domain/manutencao/maquina-codigo.ts`
- Create: `src/domain/manutencao/maquina-codigo.test.ts`
- Create: `src/domain/manutencao/setor-operacional.ts`
- Create: `src/domain/manutencao/setor-operacional.test.ts`
- Create: `src/domain/manutencao/fila-fundacao.ts`
- Create: `src/domain/manutencao/fila-fundacao.test.ts`
- Create: `src/domain/manutencao/maquina-cadastro.ts`
- Create: `src/domain/manutencao/maquina-cadastro.test.ts`

**Interfaces:**
- Consumes: nada de banco
- Produces:
  - `MaquinaCodigo.normalizar(valor: string): string` (trim)
  - `MaquinaCodigo.chave(valor: string): string` (`toLocaleLowerCase('pt-BR')` do normalizado)
  - `SetorLinha = { id: string; nome: string; tipo: string; ativo: boolean }`
  - `SetorOperacional.elegivel(setor: { tipo: string; ativo: boolean }): boolean`
  - `SetorOperacional.filtrar(setores: SetorLinha[]): SetorLinha[]`
  - `FilaFundacao.mensagem(veTodas: boolean, setoresValidos: number): string`
  - `MaquinaEntrada = { codigo: string; nome: string; setorId: string; observacao: string; ativo: boolean }`
  - `MaquinaCadastro.validar(entrada, setores, usadas: { id: string; codigo: string }[], proprioId?: string): { ok: true; linha: { codigo: string; nome: string; setorId: string; observacao: string | null; ativo: boolean } } | { ok: false; mensagem: string }`

- [ ] **Step 1: Write the failing tests**

`maquina-codigo.test.ts`: `"  Forno 01  "` normaliza para `"Forno 01"` e a chave é `"forno 01"`. `"  Á "` e `"  á "` têm a mesma chave.

`setor-operacional.test.ts`: operacional ativo passa. Operacional inativo, apoio ativo e apoio inativo não passam. `filtrar` devolve só o operacional ativo.

`fila-fundacao.test.ts`: `mensagem(false, 0)` é `"Nenhum setor liberado."`. `mensagem(false, 2)` e `mensagem(true, 0)` são `"Nenhuma ordem."`.

`maquina-cadastro.test.ts`:
- código vazio → `"Informe o código."`
- nome vazio → `"Informe o nome."`
- setor de apoio → `"Escolha um setor operacional ativo."`
- chave igual à de outra máquina → `"Já existe uma máquina com esse código."`
- a própria máquina, no editar, não conflita consigo
- observação só com espaço vira `null`
- linha válida guarda código com trim, nome com trim e `ativo` como veio

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/domain/manutencao`
Expected: FAIL, módulos não encontrados.

- [ ] **Step 3: Write minimal implementation**

`MaquinaCodigo` só faz trim e chave. Não junta espaços internos.

`SetorOperacional.elegivel` é `tipo === 'operacional' && ativo === true`.

`FilaFundacao` devolve a frase de setor quando `!veTodas && setoresValidos === 0`. Nos outros casos, `"Nenhuma ordem."`.

`MaquinaCadastro` usa as duas classes. Compara `chave` com as usadas cujo `id` é diferente de `proprioId`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/domain/manutencao`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/domain/manutencao
git commit -m "feat(manutencao): valida máquina, setor operacional e fila vazia"
```

---

### Task 3: Quem vê a fila e quem administra

**Files:**
- Create: `src/domain/manutencao/manutencao-acesso.ts`
- Create: `src/domain/manutencao/manutencao-acesso.test.ts`
- Modify: `src/lib/auth/require-interno-modulo.ts`
- Create: `src/lib/auth/algum-modulo-atende.ts`
- Create: `src/lib/auth/algum-modulo-atende.test.ts`

**Interfaces:**
- Consumes: `InternoAccessManager.temModulo`, `UsuarioAuthzSnapshot`, `FilaFundacao`
- Produces:
  - `ManutencaoAcesso.veTodas(snap): boolean` — `interno_manutencao` no mínimo `ler`, ou dono
  - `ManutencaoAcesso.administra(snap): boolean` — `interno_manutencao` no mínimo `administrar`, ou dono
  - `ManutencaoAcesso.veFila(snap): boolean` — qualquer um dos dois módulos no mínimo `ler`, ou dono
  - `algumModuloAtende(snap, modulos, minimo, manager?): boolean`
  - `requireInternoQualquerModulo(modulos, minimo): Promise<{ snap: UsuarioAuthzSnapshot; usuarioId: string }>`

- [ ] **Step 1: Write the failing tests**

Acesso, com `new ManutencaoAcesso()`:
- dono: `veTodas`, `administra` e `veFila` verdadeiros, mesmo com `modulosEfetivos` vazio
- só `interno_manutencao: 'ler'`: vê todas e a fila, não administra
- só `interno_manutencao_solicitacao: 'editar'`: vê a fila, não vê todas, não administra
- sem módulo: os três são falsos

`algumModuloAtende`: verdadeiro se um dos ids atende o nível. `ler` não atende mínimo `administrar`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/domain/manutencao/manutencao-acesso.test.ts src/lib/auth/algum-modulo-atende.test.ts`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

`ManutencaoAcesso` delega a `InternoAccessManager`. `requireInternoQualquerModulo` copia o fluxo de `requireInternoModulo`: sem sessão redireciona para `/login`; sem app para `/login?error=SemPermissao`; se `algumModuloAtende` falha, redireciona para `/?erro=sem-permissao`. Devolve `{ snap, usuarioId: session.user.id }`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/domain/manutencao/manutencao-acesso.test.ts src/lib/auth/algum-modulo-atende.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/domain/manutencao/manutencao-acesso.ts src/domain/manutencao/manutencao-acesso.test.ts src/lib/auth/algum-modulo-atende.ts src/lib/auth/algum-modulo-atende.test.ts src/lib/auth/require-interno-modulo.ts
git commit -m "feat(manutencao): distingue fila, leitura total e administração"
```

---

### Task 4: Migration da fundação

**Files:**
- Create: `supabase/migrations/20261109180000_manutencao_fundacao.sql`

**Interfaces:**
- Consumes: `public.modulos`, `public.pessoas_setores`, `public.usuarios(id)` (a mesma referência de `usuario_perfis.usuario_id`)
- Produces: módulos `interno_manutencao` e `interno_manutencao_solicitacao`; tabelas `manutencao_maquinas` e `manutencao_usuario_setores`; função `manutencao_setor_vale(uuid)`

- [ ] **Step 1: Write the migration**

`manutencao_setor_vale` é `SECURITY DEFINER` porque a policy do solicitante precisa ler `pessoas_setores`, e o RLS dessa tabela exige o módulo de Pessoas. `search_path = public`.

```sql
CREATE OR REPLACE FUNCTION public.manutencao_setor_vale(p_setor uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pessoas_setores
    WHERE id = p_setor AND tipo = 'operacional' AND ativo
  );
$$;

DO $$
DECLARE
  v_ordem int;
BEGIN
  SELECT COALESCE(MAX(grupo_ordem), 0) + 1 INTO v_ordem
  FROM public.modulos WHERE aplicativo = 'interno';

  INSERT INTO public.modulos (
    id, aplicativo, grupo, grupo_rotulo, grupo_descricao, grupo_ordem,
    rotulo, rotulo_curto, ajuda
  ) VALUES
  (
    'interno_manutencao', 'interno', 'manutencao', 'Manutenção',
    'Máquinas, peças, ordens de serviço e indicadores da fábrica.',
    v_ordem, 'Manutenção · Operação', 'Manutenção',
    'Ler vê máquinas e a fila de todos os setores. Editar abre corretiva em qualquer setor. Administrar cadastra máquina e marca os setores do solicitante. Administrar vale como ler e editar.'
  ),
  (
    'interno_manutencao_solicitacao', 'interno', 'manutencao', 'Manutenção',
    'Máquinas, peças, ordens de serviço e indicadores da fábrica.',
    v_ordem, 'Manutenção · Solicitação', 'Solicitação',
    'Ler acompanha a fila dos setores marcados. Editar abre corretiva nesses setores. Administrar vale como ler e editar.'
  );
END $$;

CREATE TABLE public.manutencao_maquinas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL,
  nome text NOT NULL,
  setor_id uuid NOT NULL REFERENCES public.pessoas_setores(id),
  observacao text NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX manutencao_maquinas_codigo_uidx
  ON public.manutencao_maquinas (lower(btrim(codigo)));

CREATE TABLE public.manutencao_usuario_setores (
  usuario_id uuid NOT NULL REFERENCES public.usuarios(id),
  setor_id uuid NOT NULL REFERENCES public.pessoas_setores(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (usuario_id, setor_id)
);

ALTER TABLE public.manutencao_maquinas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manutencao_usuario_setores ENABLE ROW LEVEL SECURITY;

CREATE POLICY manutencao_maquinas_select ON public.manutencao_maquinas
  FOR SELECT TO authenticated
  USING (
    (SELECT auth_tem_modulo('interno_manutencao', 'ler'))
    OR (SELECT is_admin())
    OR (
      (SELECT auth_tem_modulo('interno_manutencao_solicitacao', 'ler'))
      AND setor_id IN (
        SELECT lista.setor_id
        FROM public.manutencao_usuario_setores lista
        WHERE lista.usuario_id = (SELECT auth.uid())
          AND public.manutencao_setor_vale(lista.setor_id)
      )
    )
  );

CREATE POLICY manutencao_maquinas_insert ON public.manutencao_maquinas
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT auth_tem_modulo('interno_manutencao', 'administrar'))
    OR (SELECT is_admin())
  );

CREATE POLICY manutencao_maquinas_update ON public.manutencao_maquinas
  FOR UPDATE TO authenticated
  USING (
    (SELECT auth_tem_modulo('interno_manutencao', 'administrar'))
    OR (SELECT is_admin())
  )
  WITH CHECK (
    (SELECT auth_tem_modulo('interno_manutencao', 'administrar'))
    OR (SELECT is_admin())
  );

CREATE POLICY manutencao_usuario_setores_select ON public.manutencao_usuario_setores
  FOR SELECT TO authenticated
  USING (
    (SELECT auth_tem_modulo('interno_manutencao', 'administrar'))
    OR (SELECT is_admin())
    OR usuario_id = (SELECT auth.uid())
  );

CREATE POLICY manutencao_usuario_setores_insert ON public.manutencao_usuario_setores
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT auth_tem_modulo('interno_manutencao', 'administrar'))
    OR (SELECT is_admin())
  );

CREATE POLICY manutencao_usuario_setores_update ON public.manutencao_usuario_setores
  FOR UPDATE TO authenticated
  USING (
    (SELECT auth_tem_modulo('interno_manutencao', 'administrar'))
    OR (SELECT is_admin())
  )
  WITH CHECK (
    (SELECT auth_tem_modulo('interno_manutencao', 'administrar'))
    OR (SELECT is_admin())
  );
```

Não criar policy de DELETE. A ação troca a lista pelo service role.

- [ ] **Step 2: Revisar o SQL contra o spec**

Conferir: sem DELETE policy, `(SELECT auth.uid())`, `(SELECT auth_tem_modulo(...))`, `(SELECT is_admin())`, código único case-insensitive, setor obrigatório.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20261109180000_manutencao_fundacao.sql
git commit -m "feat(manutencao): cria máquinas e setores do solicitante"
```

Não rodar `supabase db push` nem aplicar no remoto.


As tasks 5, 6 e 7 estão em `docs/superpowers/plans/2026-11-09-manutencao-fundacao-telas.md`. Executar da task 1 até a 7, nessa ordem.
