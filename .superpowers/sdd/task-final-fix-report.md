# Correções finais — `feat/sugestao-compra-insumos`

Data: 12/08/2026

## Status

Todos os achados importantes solicitados foram corrigidos. A migração nova foi aplicada no
projeto remoto `valepan-pedidos` via Supabase MCP e registrada remotamente com a mesma versão do
arquivo local: `20260812164457_atomic_replace_insumo_distribuidores`.

## Alterações

1. A configuração agora parte de todos os insumos ativos, ordenados por nome, e combina cada um
   com uma regra opcional e sua lista de distribuidores.
2. Insumos sem regra aparecem no desktop e mobile com status `Sem regra` e ação `Nova regra`.
3. O modal de nova regra inicia com lead time de 7 dias, janela `Qualquer dia`, regra ativa,
   quantidades vazias e distribuidores vazios.
4. O seed continua usando a mesma rotina de persistência e mantém o comportamento anterior.
5. `InsumoDistribuidorRepository.replaceForInsumo` agora faz uma única chamada à RPC
   `replace_insumo_distribuidores`.
6. A RPC usa `SECURITY INVOKER`, valida que `p_items` é um array e executa DELETE + INSERT na
   transação da chamada. Qualquer falha no INSERT desfaz o DELETE.
7. O `EXECUTE` foi revogado de `PUBLIC`, `anon` e `authenticated`, ficando concedido apenas a
   `service_role`, que é o cliente usado pelo repository.
8. A policy `insumo_distribuidor_delete` foi recriada para `authenticated` com
   `USING ((SELECT is_admin()))`.
9. Distribuidores alternativos agora aparecem como texto secundário na tabela e nas linhas mobile.
10. Os tipos gerados locais incluem a nova RPC.

## Verificação remota

- Migração MCP: sucesso.
- Função: `security_definer = false`.
- Privilégios: `service_role = true`, `authenticated = false`, `anon = false`.
- Policy DELETE: papel `{authenticated}`, comando `DELETE`, expressão `(SELECT is_admin())`.
- O advisor de segurança foi executado; não retornou alerta associado à nova função ou à nova
  policy. Permanecem avisos preexistentes do projeto, fora deste escopo.

## Testes

Comando:

```text
npm test -- src/domain/insumos/insumo-compra src/lib/services/insumo-compra-regra-manager.test.ts src/data/insumos/InsumoDistribuidorRepository.test.ts src/lib/services/insumo-compra-sugestao-service.test.ts src/app/actions/insumo-compra-sugestao-actions.test.ts
```

Resultado: 8 arquivos aprovados, 29 testes aprovados, 0 falhas.

Lint direcionado aos oito arquivos TypeScript/TSX alterados: aprovado, 0 erros.

`npx tsc --noEmit` não ficou verde por erros preexistentes em testes de embalagem, produção,
auth, recebimento e outros módulos. Nenhum erro reportado pertence aos arquivos alterados nesta
tarefa.

## Histórico de migrações

`npx supabase migration list --linked` mostrou divergência histórica extensa entre versões locais
e remotas, anterior a esta tarefa. Por isso não foi executado `migration repair`: reparar em massa
sem confirmar qual numeração é canônica alteraria o histórico remoto de forma insegura.

A migração desta tarefa não precisa de repair: o arquivo local foi alinhado à versão remota
`20260812164457`.

Pares equivalentes identificados que ainda exigem decisão explícita antes da normalização:

```text
local 20260629180000 <-> remoto 20260629203246  receita_gramaturas
local 20260630120000 <-> remoto 20260630192924  drop_receitas_codigo
local 20260701100000 <-> remoto 20260630204553  insumo_producao_saida
local 20260701110000 <-> remoto 20260701114344  insumo_producao_saida_forno_embalagem
local 20260702100000 <-> remoto 20260702203819  insumo_custo_unitario_nullable
local 20260803161452 <-> remoto 20260803161925  list_insumo_consumo_agregado
local 20260810191335 <-> remoto 20260810183748  login_qr_requests
local 20260812120000 <-> remoto 20260812153647  insumo_regra_compra
```

Após validar cada par pelo conteúdo SQL, os comandos exatos para trocar a versão remota pela
versão local correspondente seguem este padrão, repetido para cada par aprovado:

```text
npx supabase migration repair <VERSAO_REMOTA> --status reverted --linked
npx supabase migration repair <VERSAO_LOCAL> --status applied --linked
npx supabase migration list --linked
```

Exemplo para a migração original desta feature, somente se for decidido padronizar sua versão:

```text
npx supabase migration repair 20260812153647 --status reverted --linked
npx supabase migration repair 20260812120000 --status applied --linked
npx supabase migration list --linked
```

Não executar esses comandos em lote antes de revisar também as muitas migrações remotas sem
arquivo local correspondente.
