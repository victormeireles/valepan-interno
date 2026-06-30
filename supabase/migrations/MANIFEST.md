# Manifesto de migrations (ordem lógica)

Projeto Supabase: **valepan-pedidos** (`pklyjtbqtbhqbiqzlmep`)

Todos os scripts abaixo estão em `_archive/` e foram aplicados manualmente em produção.
Use esta ordem apenas para **novos ambientes** ou entendimento de dependências — não reexecute em produção.

Legenda de status: `aplicado` | `obsoleto` (superseded, não executar)

---

## 00 — Produtos (legado)

| # | Arquivo | Status | Notas |
|---|---------|--------|-------|
| 001 | `sql_add_columns_produtos.sql` | aplicado | Colunas `unidades_assadeira`, `peso_pre_assado` em produtos |

---

## 01 — Receitas multitipo

| # | Arquivo | Status | Depende de |
|---|---------|--------|------------|
| 010 | `MIGRACAO_RECEITAS_MULTITIPO.sql` | aplicado | schema base (produtos, receitas) |
| 011 | `REMOVER_TIPO_PRODUTO_RECEITAS.sql` | aplicado | 010 |
| 012 | `ADICIONAR_TIPO_ANTIMOFO.sql` | aplicado | 010 |
| 013 | `ALTER_QUANTIDADE_INGREDIENTES_DECIMAL.sql` | aplicado | receita_ingredientes |
| 014 | `ALTER_TEMPO_MISTURA_DECIMAL.sql` | aplicado | masseiras, producao_massa_lotes |

---

## 02 — Produção massa (merge em etapas_log)

| # | Arquivo | Status | Depende de |
|---|---------|--------|------------|
| 020 | `MESCLAR_PRODUCAO_MASSA_LOTES_EM_PRODUCAO_ETAPAS_LOG.sql` | aplicado | producao_etapas_log, producao_massa_lotes |
| 021 | `REMOVER_CONSTRAINT_MASSA_OBRIGATORIA.sql` | aplicado | 020 (se constraint foi criada) |
| 022 | `ATUALIZAR_PRODUCAO_MASSA_INGREDIENTES.sql` | aplicado | 020 |
| 023 | `REMOVER_TABELA_PRODUCAO_MASSA_LOTES.sql` | aplicado | 020, 022 |
| 024 | `REMOVE_MASSEIRA_ID_FROM_PRODUCAO_ETAPAS_LOG.sql` | aplicado | 020 |
| 025 | `REMOVER_PESO_TOTAL_MASSA.sql` | aplicado | producao_etapas_log |

---

## 03 — Assadeiras e regras por categoria

| # | Arquivo | Status | Depende de |
|---|---------|--------|------------|
| 030 | `CREATE_CATEGORIA_ASSADEIRA_REGRAS.sql` | aplicado | assadeiras, categorias |
| 031 | `ALTER_CATEGORIA_ASSADEIRA_REGRAS_PESO_EXATO.sql` | aplicado | 030 (tabela vazia) |
| 032 | `RENAME_ASSADEIRAS_QUANTIDADE.sql` | aplicado | assadeiras |
| 033 | `DROP_ASSADEIRAS_CODIGO.sql` | aplicado | assadeiras |

---

## 04 — Estoque (Fase A)

| # | Arquivo | Status | Depende de |
|---|---------|--------|------------|
| 040 | `CREATE_ESTOQUE_TABLES.sql` | aplicado | tipos_estoque, produtos |
| 041 | `ESTOQUE_RLS.sql` | aplicado | 040 |
| 042 | `ALTER_ESTOQUE_MOVIMENTOS_CLIENTE.sql` | aplicado | 040 |
| 043 | `ALTER_TIPOS_ESTOQUE_CONGELADO.sql` | aplicado | tipos_estoque |
| 044 | `DROP_INVENTARIO_TABLES.sql` | aplicado | 040 |
| 045 | `CREATE_INSUMO_ESTOQUE_TABLES.sql` | aplicado | — (CREATE + RLS inline) |
| 046 | `ALTER_INSUMO_PENDENCIAS_ENRIQUECIMENTO_OMIE.sql` | aplicado | 045 |
| 047 | `ALTER_INSUMO_MOVIMENTOS_NUMERO_NF.sql` | aplicado | 045 — coluna `numero_nf` + backfill resoluções |
| 048 | `ALTER_INSUMO_PENDENCIAS_CATEGORIA_COMPRA.sql` | aplicado | 045 — `categoria_compra_codigo` + `categoria_compra_descricao` |

---

## 05 — Saídas

| # | Arquivo | Status | Notas |
|---|---------|--------|-------|
| 050 | `DROP_SAIDAS_TABLE.sql` | aplicado | Saídas via estoque_movimentos (origem `saida`) |

---

## 06 — Embalagem (Fase B)

| # | Arquivo | Status | Depende de |
|---|---------|--------|------------|
| 060 | `CREATE_EMBALAGEM_LOTES_TABLES.sql` | aplicado | Fase A |
| 061 | `EMBALAGEM_LOTES_RLS.sql` | aplicado | 060 |
| 062 | `CREATE_PEDIDOS_EMBALAGEM_TABLES.sql` | aplicado | Fase A |
| 063 | `PEDIDOS_EMBALAGEM_RLS.sql` | aplicado | 062 |
| 064 | `ALTER_EMBALAGEM_LOTES_PEDIDO_FK.sql` | aplicado | 060, 062 (pedidos populados) |
| 065 | `ADD_CATEGORIA_VISIVEL_EMBALAGEM.sql` | aplicado | categorias |

---

## 07 — Ordens de produção unificadas (Fase D)

| # | Arquivo | Status | Depende de |
|---|---------|--------|------------|
| 070 | `MIGRATE_ORDENS_PRODUCAO_UNIFICADA.sql` | aplicado | Fase B (pedidos_embalagem) |
| 071 | `ORDENS_PRODUCAO_RLS.sql` | aplicado | 070 |
| 072 | `ALTER_ORDENS_PRODUCAO_ETAPA_META.sql` | aplicado | 070 |
| 073 | `ALTER_ORDENS_PRODUCAO_ASSADEIRA_ID_NULLABLE.sql` | aplicado | 070 |
| 074 | `MIGRATE_PRODUTO_ASSADEIRAS_ORDEM.sql` | aplicado | produto_assadeiras |
| 075 | `BACKFILL_ORDENS_PRODUCAO_ETAPA_FINALIZADA_3D.sql` | aplicado | 072 (dados) |

---

## 08 — Fermentação e forno

| # | Arquivo | Status | Depende de |
|---|---------|--------|------------|
| 080 | `CREATE_FERMENTACAO_FORNO_LOTES_TABLES.sql` | aplicado | 070 (ordens_producao) |
| 081 | `FERMENTACAO_LOTES_RLS.sql` | aplicado | 080 |
| 082 | `FORNO_LOTES_RLS.sql` | aplicado | 080 |

---

## 09 — Etiquetas

| # | Arquivo | Status | Notas |
|---|---------|--------|-------|
| 090 | `CREATE_ETIQUETAS_GERADAS.sql` | aplicado | Fila pós-embalagem |

---

## 10 — WhatsApp notificações

| # | Arquivo | Status | Notas |
|---|---------|--------|-------|
| 100 | `WHATSAPP_NOTIFICACOES_CONFIG.sql` | aplicado | Estado inicial em public |
| 101 | `WHATSAPP_NOTIFICACOES_CONFIG_MOVE_TO_INTERNO.sql` | **obsoleto** | Superseded por 102 — não executar |
| 102 | `DROP_INTERNO_MOVE_WHATSAPP_TO_PUBLIC.sql` | aplicado | Estado final: tabela em public |

---

## 11 — Limpeza / auditoria

| # | Arquivo | Status | Notas |
|---|---------|--------|-------|
| 110 | `DROP_UNUSED_TABLES_AUDITORIA.sql` | aplicado | Remove 8 tabelas sem uso; ver `docs/auditoria-tabelas-remocao-consolidada.md` |

---

## Backfills em TypeScript (não SQL)

Estes scripts complementam migrations e ficam em `scripts/`:

- `backfill-ordens-producao-assadeiras.ts`
- `backfill-insumo-recebimentos-omie.ts`
- `backfill-insumo-pendencias-enriquecimento-omie.ts` (se existir)
- `backfill-insumo-movimentos-numero-nf.ts` (entradas NF antigas → `numero_nf` via Omie; depende da migration 047)
- `migrate-produto-assadeiras-to-excecoes.ts`
- `migrate-tipos-estoque-etiqueta-flags.ts`
