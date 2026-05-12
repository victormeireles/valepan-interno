# Ordem de produção diária + OP operacional — desenho (2026-05-12)

## Objetivo

- **Remover** a estação antiga `/producao/fila?station=planejamento` (UI de planejamento na fila).
- **Centralizar** o cadastro em `/producao/ordem-producao`.
- **Garantir** que cada linha gravada na grade gere/manutenha já um registro em `interno.ordens_producao`, visível no resto do fluxo (fila massa em diante).

## Decisões aprovadas

1. **Vínculo explícito:** coluna `ordens_producao_id` em `interno.ordens_producao_diarias_itens`, referenciando `interno.ordens_producao(id)`. Após um save bem-sucedido da linha, o id deve estar preenchido (exceto migração transitória / erro).
2. **Momento de criação da OP:** **A** — ao gravar cada linha (`upsertOrdemProducaoItem`), criar ou atualizar a OP associada na mesma operação lógica da aplicação (preferir transação ou falha atómica documentada).
3. **Remoção de linha na grade:** **cancelar** a OP (`status = 'cancelado'` na `ordens_producao`), não apagar fisicamente a OP; em seguida remover o registo do item na ordem diária (ou equivalente acordado na implementação), respeitando FKs (`ON DELETE RESTRICT` na FK item → OP recomenda ordem: cancelar OP primeiro, depois apagar item).

## Comportamento esperado (implementação futura)

### `upsertOrdemProducaoItem`

- **Novo item:** inserir linha em `ordens_producao_diarias_itens` **e** criar `ordens_producao` com `status` inicial operacional acordado (ex.: `planejado`), `data_producao` coerente com cabeçalho/override da linha, `qtd_planejada` = latas planejadas, `ordem_planejamento` = `prioridade`, `lote_codigo` gerado pelo mesmo critério usado hoje noutros fluxos, `assadeira_id` derivado de `tipo_lata` + produto (reutilizar regras já existentes na app). Guardar `ordens_producao_id` no item.
- **Item existente:** atualizar campos do item e da OP ligada, **desde que** a OP ainda permita edição (ver abaixo).

### `reorderOrdemProducaoItems`

- Atualizar `prioridade` nos itens **e** `ordem_planejamento` (e/ou `prioridade` na OP, conforme modelo actual) nas OPs ligadas, na mesma ordem.

### Regras quando a OP já avançou

- Se `ordens_producao.status` não for equivalente a “ainda não iniciou” (ex.: diferente de `planejado`): **bloquear** alterações estruturais (produto, quantidade, tipo de lata que altere assadeira, apagar linha) ou aplicar matriz explícita de campos editáveis (documentar na PR).
- Objectivo: evitar divergência entre grade e chão de fábrica.

### `publishOrdemProducao`

- **Não** é o momento de criar OPs (já existem no save).
- Mantém sentido como transição de estado do **cabeçalho** do dia (ex.: `rascunho` → `pronto`) e/ou “fechar planejamento”; ajustar textos na UI para não implicar “gerar OPs”.

### Remoção da fila “planejamento”

- Default da fila: **`massa`** (query vazia ou redireccionamento).
- Menu: remover link dedicado a planejamento na fila; “Ordem de Produção” aponta para `/producao/ordem-producao`.
- `fila/page.tsx`: remover o ramo que substitui `getProductionQueue()` pelos itens da ordem diária.
- Limpar `planejamento` de tipos/UI onde for exclusivo dessa estação; rever `production-conversions` / métricas para não quebrar estações operacionais.

## Pré-condições de base de dados

- Função/trigger `interno.set_updated_at` já existente (usada pelos triggers abaixo).
- Tabela `interno.ordens_producao` já existente.
- Tabelas `interno.produtos`, `interno.assadeiras` conforme FKs usadas.

## Migração SQL oficial unificada (`interno`)

Ficheiro de referência único para ambientes que **ainda não** executaram `MIGRACAO_ORDENS_PRODUCAO_DIARIAS.sql`. Idempotente onde `IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` aplicam. Políticas RLS: em re-execução, fazer `DROP POLICY IF EXISTS` antes de `CREATE POLICY` se o editor falhar por nome duplicado.

```sql
-- =============================================================================
-- Migração oficial unificada: ordem de produção diária + vínculo OP (interno)
-- Pré-requisito: interno.set_updated_at() e tabela interno.ordens_producao.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Ordem diária: cabeçalho + itens
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS interno.ordens_producao_diarias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data_producao date NOT NULL,
  data_etiqueta_default date NOT NULL,
  status text NOT NULL DEFAULT 'rascunho' CHECK (
    status IN ('rascunho', 'pronto', 'em_producao', 'concluido')
  ),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT ordens_producao_diarias_data_unique UNIQUE (data_producao)
);

CREATE TABLE IF NOT EXISTS interno.ordens_producao_diarias_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ordem_diaria_id uuid NOT NULL REFERENCES interno.ordens_producao_diarias (id) ON DELETE CASCADE,
  prioridade integer NOT NULL DEFAULT 1,
  produto_id uuid NOT NULL REFERENCES interno.produtos (id),
  tipo_lata text NOT NULL CHECK (tipo_lata IN ('antiga', 'nova', 'outra')),
  latas_planejadas integer NOT NULL DEFAULT 0,
  caixas_estimadas integer NOT NULL DEFAULT 0,
  clientes jsonb NOT NULL DEFAULT '[]'::jsonb,
  data_producao_override date,
  data_etiqueta_override date,
  observacao text,
  status_linha text NOT NULL DEFAULT 'rascunho' CHECK (
    status_linha IN ('rascunho', 'pronto', 'em_producao', 'concluido')
  ),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT ordens_producao_diarias_itens_latas_nn CHECK (latas_planejadas >= 0),
  CONSTRAINT ordens_producao_diarias_itens_caixas_nn CHECK (caixas_estimadas >= 0)
);

-- Vínculo cada linha da ordem diária ↔ OP operacional (decisão aprovada)
ALTER TABLE interno.ordens_producao_diarias_itens
  ADD COLUMN IF NOT EXISTS ordens_producao_id uuid NULL
    REFERENCES interno.ordens_producao (id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS ordens_producao_diarias_itens_op_id_idx
  ON interno.ordens_producao_diarias_itens (ordens_producao_id)
  WHERE ordens_producao_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ordens_producao_diarias_itens_ordem_prioridade_idx
  ON interno.ordens_producao_diarias_itens (ordem_diaria_id, prioridade);

COMMENT ON COLUMN interno.ordens_producao_diarias_itens.ordens_producao_id IS
  'OP operacional criada ao gravar a linha; remoção de linha cancela a OP, não apaga.';

DROP TRIGGER IF EXISTS trg_ordens_producao_diarias_set_updated_at ON interno.ordens_producao_diarias;
CREATE TRIGGER trg_ordens_producao_diarias_set_updated_at
  BEFORE UPDATE ON interno.ordens_producao_diarias
  FOR EACH ROW
  EXECUTE PROCEDURE interno.set_updated_at();

DROP TRIGGER IF EXISTS trg_ordens_producao_diarias_itens_set_updated_at ON interno.ordens_producao_diarias_itens;
CREATE TRIGGER trg_ordens_producao_diarias_itens_set_updated_at
  BEFORE UPDATE ON interno.ordens_producao_diarias_itens
  FOR EACH ROW
  EXECUTE PROCEDURE interno.set_updated_at();

COMMENT ON TABLE interno.ordens_producao_diarias IS 'Cabeçalho da ordem de producao planejada por dia.';
COMMENT ON TABLE interno.ordens_producao_diarias_itens IS 'Linhas da ordem diaria; cada linha gravada liga-se a interno.ordens_producao.';

-- ---------------------------------------------------------------------------
-- 2) Colunas em ordens_producao usadas pelo planejamento / fila (idempotente)
-- ---------------------------------------------------------------------------

ALTER TABLE interno.ordens_producao
  ADD COLUMN IF NOT EXISTS ordem_planejamento integer;

COMMENT ON COLUMN interno.ordens_producao.ordem_planejamento IS
  'Sequência no planejamento; menor = produzir antes. Sincronizar com prioridade da linha diária.';

CREATE INDEX IF NOT EXISTS idx_ordens_producao_ordem_planejamento
  ON interno.ordens_producao (ordem_planejamento)
  WHERE status = 'planejado';

ALTER TABLE interno.ordens_producao
  ADD COLUMN IF NOT EXISTS assadeira_id uuid NULL
    REFERENCES interno.assadeiras (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS ordens_producao_assadeira_id_idx
  ON interno.ordens_producao (assadeira_id)
  WHERE assadeira_id IS NOT NULL;

COMMENT ON COLUMN interno.ordens_producao.assadeira_id IS
  'Assadeira (tipo de lata); alinhada ao tipo_lata da linha diária. NULL = inferir pelo cadastro produto_assadeiras.';

ALTER TABLE interno.ordens_producao
  ADD COLUMN IF NOT EXISTS temporaria boolean NOT NULL DEFAULT false;

ALTER TABLE interno.ordens_producao
  ADD COLUMN IF NOT EXISTS temporaria_expira_em date NULL;

COMMENT ON COLUMN interno.ordens_producao.temporaria IS
  'Ordem só para teste; a aplicação remove o registo após o dia em temporaria_expira_em (fuso Brasília).';

COMMENT ON COLUMN interno.ordens_producao.temporaria_expira_em IS
  'Último dia civil (BR) em que a OP temporária existe.';

-- ---------------------------------------------------------------------------
-- 3) RLS (políticas alinhadas ao script diário original)
-- ---------------------------------------------------------------------------

ALTER TABLE interno.ordens_producao_diarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE interno.ordens_producao_diarias_itens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ordens_producao_diarias_select_authenticated" ON interno.ordens_producao_diarias;
CREATE POLICY "ordens_producao_diarias_select_authenticated"
  ON interno.ordens_producao_diarias FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "ordens_producao_diarias_insert_admin" ON interno.ordens_producao_diarias;
CREATE POLICY "ordens_producao_diarias_insert_admin"
  ON interno.ordens_producao_diarias FOR INSERT TO authenticated
  WITH CHECK ((SELECT is_admin()));

DROP POLICY IF EXISTS "ordens_producao_diarias_update_admin" ON interno.ordens_producao_diarias;
CREATE POLICY "ordens_producao_diarias_update_admin"
  ON interno.ordens_producao_diarias FOR UPDATE TO authenticated
  USING ((SELECT is_admin())) WITH CHECK ((SELECT is_admin()));

DROP POLICY IF EXISTS "ordens_producao_diarias_delete_admin" ON interno.ordens_producao_diarias;
CREATE POLICY "ordens_producao_diarias_delete_admin"
  ON interno.ordens_producao_diarias FOR DELETE TO authenticated
  USING ((SELECT is_admin()));

DROP POLICY IF EXISTS "ordens_producao_diarias_itens_select_authenticated" ON interno.ordens_producao_diarias_itens;
CREATE POLICY "ordens_producao_diarias_itens_select_authenticated"
  ON interno.ordens_producao_diarias_itens FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "ordens_producao_diarias_itens_insert_admin" ON interno.ordens_producao_diarias_itens;
CREATE POLICY "ordens_producao_diarias_itens_insert_admin"
  ON interno.ordens_producao_diarias_itens FOR INSERT TO authenticated
  WITH CHECK ((SELECT is_admin()));

DROP POLICY IF EXISTS "ordens_producao_diarias_itens_update_admin" ON interno.ordens_producao_diarias_itens;
CREATE POLICY "ordens_producao_diarias_itens_update_admin"
  ON interno.ordens_producao_diarias_itens FOR UPDATE TO authenticated
  USING ((SELECT is_admin())) WITH CHECK ((SELECT is_admin()));

DROP POLICY IF EXISTS "ordens_producao_diarias_itens_delete_admin" ON interno.ordens_producao_diarias_itens;
CREATE POLICY "ordens_producao_diarias_itens_delete_admin"
  ON interno.ordens_producao_diarias_itens FOR DELETE TO authenticated
  USING ((SELECT is_admin()));
```

### Backfill (opcional, só se já existirem itens diários sem OP)

Não incluído no script acima: requer rotina à parte que, para cada linha com `ordens_producao_id IS NULL`, crie a OP com as regras da app e actualize o item. Avaliar caso a caso em ambiente com dados reais.

## Testes / verificação (pós-implementação)

- Gravar linha nova → existe `ordens_producao` e `ordens_producao_diarias_itens.ordens_producao_id` preenchido.
- Fila massa lista a mesma OP.
- Remover linha (com OP ainda `planejado`) → OP `cancelado`, item removido.
- Reordenar → `ordem_planejamento` consistente com prioridades.
- `/producao/fila` sem `station` abre massa (ou redirect documentado).

## Fora de âmbito deste spec

- Regenerar tipos TypeScript (`database.ts`) após aplicar a migração.
- Refinar políticas RLS se `service_role` vs `authenticated` exigirem ajustes nos server actions.

## Auto-revisão do spec

- **Placeholders:** nenhum TBD crítico; backfill marcado como opcional explícito.
- **Consistência:** `ON DELETE RESTRICT` na FK exige cancelar OP antes de apagar OP por outro caminho; remoção de linha pela app segue ordem cancelar → apagar item.
- **Âmbito:** um único pacote de mig + um epic de código app; backfill é sub-tarefa opcional.
- **Ambiguidade:** “status editável” na OP — implementação deve fixar lista exacta (ex.: só `planejado`) na PR de código.

---

**Próximo passo:** após revisão e aprovação deste ficheiro pelo utilizador, invocar a skill **writing-plans** para o plano de implementação detalhado (sem alterar código até lá).
