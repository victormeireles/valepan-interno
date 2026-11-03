# Final fix report — Pessoas regime CLT/PJ

Commit: c4bf305956210084df4157f1bd33b2ab432a89e0 — fix(pessoas): restringe busca por CNPJ e torna cancelar saida atomico

## Fix 1 — busca por CNPJ
`cnpjBate` agora só compara com o CNPJ quando o termo bruto casa `/^\s*[\d\s./-]+\s*$/` e a sequência de dígitos tem >= 5 dígitos. Nome, código e razão social ficaram como estavam.

### RED
Comando: `npx vitest run src/domain/pessoas/colaborador-lista-filtro.test.ts`
```
 ❯ src/domain/pessoas/colaborador-lista-filtro.test.ts (4 tests | 1 failed)
     × não confunde dígito de código com CNPJ
AssertionError: expected [ 'VP-9003' ] to deeply equal []
 Test Files  1 failed (1)
      Tests  1 failed | 3 passed (4)
```

### GREEN
Comando: `npx vitest run src/domain/pessoas/colaborador-lista-filtro.test.ts`
```
 Test Files  1 passed (1)
      Tests  4 passed (4)
```
`11.444.777/0001-61` continua achando só o PJ (VP-9003). `VP-1` não retorna ninguém. `VP-9001` retorna só a linha CLT.

## Fix 2 — pessoas_cancelar_saida
Editada no lugar em `supabase/migrations/20261031160000_pessoas_regime.sql` (sem segunda migration). Agora usa um único `UPDATE` condicional (`regime = 'pj'`, `situacao <> 'desligado'`, `data_desligamento IS NOT NULL`), que zera `data_desligamento` e atualiza `updated_at`.
- Se o UPDATE afetou linhas (`FOUND`, equivalente a `ROW_COUNT > 0`), retorna.
- Caso contrário, uma checagem de existência separa `Colaborador não encontrado.` de `Não há saída prevista para cancelar.`
- Sem teste SQL automatizado e sem harness novo. A migration não foi aplicada nem executada.

## Suíte completa
Comando: `npm test`
```
 Test Files  349 passed (349)
      Tests  1528 passed (1528)
```

## Arquivos alterados
- src/domain/pessoas/colaborador-lista-filtro.ts
- src/domain/pessoas/colaborador-lista-filtro.test.ts
- supabase/migrations/20261031160000_pessoas_regime.sql

Sem push, sem alteração de git config, hooks não pulados.

## Correção dos achados Important (revisão da branch de remuneração)

- Teste novo: src/app/actions/pessoas-remuneracao-actions.test.ts (3 ações recusam antes de createServiceRoleClient)
- CadastroPainel.tsx: key={pessoa.codigo} em RemuneracaoSecao

### Comando
npx vitest run src/app/actions/pessoas-remuneracao-actions.test.ts
 Test Files  1 passed (1)
      Tests  3 passed (3)

### Comando
npx vitest run src/domain/pessoas/remuneracao-centavos.test.ts src/domain/pessoas/remuneracao-pacote.test.ts src/domain/pessoas/remuneracao-quadro.test.ts src/domain/pessoas/remuneracao-linha.test.ts src/domain/pessoas/colaborador-csv.test.ts src/domain/pessoas/carga-colaborador-upsert.test.ts
 Test Files  6 passed (6)
      Tests  18 passed (18)
