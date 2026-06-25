# Migrations — Valepan Interno

Scripts SQL históricos aplicados manualmente no **SQL Editor** do projeto Supabase `valepan-pedidos`.

## Estrutura

```
supabase/migrations/
├── README.md           ← este arquivo
├── MANIFEST.md         ← ordem lógica e status de cada script
├── _archive/           ← scripts já aplicados em produção (referência)
└── (futuro)            ← novas migrations via Supabase CLI
```

## Fluxo atual (produção)

1. Escrever ou localizar o script em `_archive/` (para referência) ou criar migration nova.
2. Aplicar no [SQL Editor](https://supabase.com/dashboard/project/pklyjtbqtbhqbiqzlmep/sql) do Supabase.
3. Rodar `npm run gen:types` para atualizar os tipos TypeScript.

## Próximo passo recomendado (Supabase CLI)

Quando instalar o CLI (`npm i -g supabase` ou Scoop/Chocolatey):

```bash
supabase init          # gera config.toml (se ainda não existir)
supabase link          # projeto pklyjtbqtbhqbiqzlmep
supabase db pull       # baseline do schema remoto
supabase migration repair --status applied <timestamp_baseline>
```

Daí em diante, toda mudança de schema:

```bash
supabase migration new descricao_da_mudanca
# editar o .sql gerado em supabase/migrations/
supabase db push
npm run gen:types
```

## Regras

- **Não reexecutar** scripts de `_archive/` em produção — já foram aplicados.
- **RLS:** em migrations novas, preferir CREATE + RLS no mesmo arquivo.
- **Backfills de dados:** usar `scripts/backfill-*.ts` ou migration separada documentada.
- **Obsoletos:** manter em `_archive/` com nota no `MANIFEST.md`; não apagar (histórico).
