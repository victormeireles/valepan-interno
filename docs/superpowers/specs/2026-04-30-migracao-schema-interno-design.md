# Design: Migração de `public` para `interno` (Supabase)

## Contexto

O sistema atual compartilha tabelas no schema `public` com outro sistema, gerando acoplamento e risco operacional. O objetivo é isolar o domínio deste app em um novo schema `interno`, com migração one-shot em janela de manutenção.

## Objetivo

Migrar o sistema para operar em `interno`, clonando das tabelas usadas no app (e dependências obrigatórias) tudo que caracteriza funcionamento completo:

- estrutura;
- dados;
- índices;
- constraints;
- RLS e policies;
- permissões necessárias.

Após a virada, o app deve deixar de depender funcionalmente do `public` para o domínio migrado.

## Escopo

### Incluído

- Migração one-shot com janela de manutenção.
- Criação do schema `interno`.
- Clonagem de tabelas usadas no app e dependências de FK/join necessárias.
- Ajuste de código para usar `interno`.
- Regeneração de tipos para refletir schema novo.
- Validação pós-migração com checklist técnico e smoke test.

### Excluído

- Refatorações não relacionadas.
- Remoção/destruição de objetos em `public`.
- Estratégia contínua de sincronização `public` <-> `interno`.

## Inventário inicial de tabelas alvo

Baseado no uso em código:

- `assadeiras`
- `carrinhos`
- `cliente_assadeira_bloqueios`
- `clientes`
- `insumos`
- `masseiras`
- `ordens_producao`
- `pedidos`
- `produto_assadeiras`
- `produto_receitas`
- `produtos`
- `producao_etapas_log`
- `producao_massa_ingredientes`
- `receita_ingredientes`
- `receitas`
- `tipos_estoque`
- `unidades` (dependência de join/opções)

Regra de fechamento do inventário: incluir automaticamente tabelas adicionais que sejam dependências obrigatórias por relacionamentos para manter integridade.

## Abordagens consideradas

### 1) Clone dirigido por lista de tabelas (recomendada)

Definir lista de tabelas de uso do app + dependências, clonar para `interno`, validar e virar código.

**Prós**
- Escopo controlado;
- menor risco de carregar objetos desnecessários do `public`;
- melhor auditabilidade no repositório.

**Contras**
- Exige fechamento cuidadoso de dependências.

### 2) Dump/restore parcial por filtros

Usar export/import filtrando objetos específicos.

**Prós**
- Fidelidade DDL alta.

**Contras**
- Operação mais opaca e mais difícil de revisar no Git.

### 3) Recriação manual + carga

Reescrever DDL e copiar dados manualmente.

**Prós**
- Controle total.

**Contras**
- Maior risco de erro e maior tempo.

## Decisão

Adotar abordagem 1: clone dirigido por lista de tabelas com expansão por dependências obrigatórias.

## Arquitetura da solução

### Banco

Script SQL one-shot que executa:

1. criação do schema `interno`;
2. criação das tabelas espelho;
3. carga de dados (`INSERT INTO interno.t SELECT * FROM public.t`);
4. recriação de PK/FK/unique/check/defaults/identities/sequences;
5. recriação de índices;
6. habilitação de RLS e recriação de policies;
7. aplicação de grants necessários aos papéis usados pelo app.

### Aplicação

Virada para `interno` com foco em ponto central:

- atualizar factory/client usage para operar no schema `interno`;
- revisar acessos `.from(...)` para não depender de default implícito `public`;
- corrigir rota dinâmica de options para schema fixo `interno` e allowlist explícita de tabelas;
- regenerar tipos para refletir schema novo e manter consistência dos aliases (`Tables`, `Enums`, etc.).

## Fluxo operacional de execução

1. Congelar deploys e abrir janela de manutenção.
2. Confirmar backup/snapshot atualizado.
3. Fechar inventário final de tabelas (incluindo dependências indiretas).
4. Executar script SQL one-shot.
5. Executar validações de integridade e contagem.
6. Publicar versão de código já apontando para `interno`.
7. Rodar smoke test de fluxos críticos.
8. Encerrar janela de manutenção.

## Validação e critérios de aceite

### Validação técnica obrigatória

- contagem de linhas por tabela (`public` vs `interno`);
- existência de índices e constraints esperadas;
- RLS habilitada nas tabelas migradas;
- policies presentes e equivalentes às do `public`;
- grants necessários aplicados.

### Validação funcional (smoke test)

- fluxos críticos de produção (fila/etapas/log);
- receitas e vínculos produto-receita;
- clientes e bloqueios de assadeira;
- estoque e tipos de estoque;
- carrinhos e alocação operacional.

### Critério de sucesso

App operando integralmente em `interno`, sem dependência funcional do `public` para o domínio migrado.

## Riscos e mitigação

- **Dependência omitida no inventário**
  - Mitigação: expansão por FK + validação de joins/consultas críticas.
- **Divergência de policy/permissão**
  - Mitigação: checklist explícito de RLS/policies/grants por tabela.
- **Ponto de código ainda em `public`**
  - Mitigação: varredura de acessos Supabase e revisão do ponto central de cliente.
- **Falha pós-virada**
  - Mitigação: rollback por reversão de deploy/código (mantendo `public` intacto).

## Rollback

Como o `public` será mantido intacto, rollback operacional é:

1. reverter aplicação para build anterior;
2. restaurar uso do `public` no código;
3. corrigir script/ajustes e repetir em nova janela.

## Fora do escopo imediato (próxima fase opcional)

- limpeza gradual de objetos não usados no `public`;
- políticas de governança para impedir novos acessos indevidos ao schema antigo.
