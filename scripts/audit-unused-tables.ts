/**
 * Auditoria de tabelas public do Supabase remoto vs referências no monorepo TS/TSX.
 * Uso: npx tsx scripts/audit-unused-tables.ts
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from 'fs';
import { join, relative } from 'path';

const ROOT = join(__dirname, '..');

/** Inventário obtido via Supabase MCP list_tables em 2026-06-17 */
const REMOTE_PUBLIC_TABLES: Array<{ name: string; rows: number; comment?: string }> = [
  { name: 'usuarios', rows: 108 },
  { name: 'clientes', rows: 251 },
  { name: 'pedidos', rows: 2099 },
  { name: 'pedido_itens', rows: 6328 },
  { name: 'verification_tokens', rows: 36 },
  { name: 'produtos', rows: 93 },
  { name: 'categorias', rows: 19 },
  { name: 'cliente_categorias', rows: 158 },
  { name: 'enderecos_entrega', rows: 268 },
  { name: 'sugestoes_envio_logs', rows: 0 },
  { name: 'tipos_estoque', rows: 5 },
  { name: 'empresas', rows: 3 },
  { name: 'cliente_precos', rows: 1974 },
  { name: 'parcelas', rows: 11 },
  { name: 'parcelas_empresa', rows: 25 },
  { name: 'integracao_produtos', rows: 271 },
  { name: 'masseiras', rows: 4 },
  { name: 'receitas', rows: 35 },
  { name: 'receita_masseira_parametros', rows: 8 },
  { name: 'receita_ingredientes', rows: 178 },
  { name: 'unidades', rows: 14 },
  { name: 'insumos', rows: 78 },
  { name: 'produto_receitas', rows: 258 },
  { name: 'usuario_clientes', rows: 107 },
  { name: 'produto_tags', rows: 6 },
  { name: 'produto_tag_associacoes', rows: 43 },
  { name: 'producao_etapas_log', rows: 87 },
  { name: 'producao_massa_ingredientes', rows: 155 },
  { name: 'caminhoes', rows: 3 },
  { name: 'pedido_itens_lotes', rows: 5500 },
  { name: 'fechamentos', rows: 35 },
  { name: 'distribuidor_precos_revenda', rows: 104 },
  { name: 'parceiros_indicadores', rows: 2 },
  { name: 'whatsapp_pedido_sessao', rows: 22 },
  { name: 'cadastro_hamburgueria_comentarios', rows: 34 },
  { name: 'vendedores', rows: 2 },
  { name: 'cobranca_whatsapp_envios', rows: 450 },
  { name: 'produto_familias', rows: 18 },
  { name: 'produto_familia_tags', rows: 4 },
  { name: 'produto_familia_tag_associacoes', rows: 16 },
  { name: 'clube_pontos_transacoes', rows: 23 },
  { name: 'clube_beneficios', rows: 3 },
  { name: 'clube_resgates', rows: 0 },
  { name: 'clube_config', rows: 7 },
  { name: 'veiculos_logistica', rows: 6 },
  { name: 'roteiros_entrega', rows: 75 },
  { name: 'roteiro_veiculos', rows: 242 },
  { name: 'roteiro_paradas', rows: 306 },
  { name: 'whatsapp_pedido_mensagem', rows: 118 },
  { name: 'usuario_papeis', rows: 108 },
  { name: 'assadeiras', rows: 10 },
  { name: 'produto_assadeiras', rows: 11 },
  { name: 'cliente_assadeiras', rows: 0 },
  { name: 'distribuidor_parcelas_permitidas', rows: 5 },
  { name: 'estoque_consignado_movimentos', rows: 344 },
  { name: 'carrinhos', rows: 100 },
  { name: 'cliente_assadeira_bloqueios', rows: 4 },
  { name: 'omie_webhook_eventos', rows: 545 },
  { name: 'notas_fiscais', rows: 529 },
  { name: 'boletos', rows: 483 },
  { name: 'nota_fiscal_pedido', rows: 473 },
  { name: 'nota_fiscal_fechamento', rows: 14 },
  { name: 'whatsapp_notificacao_tipos', rows: 27 },
  { name: 'whatsapp_notificacao_log', rows: 1101 },
  { name: 'estoque_saldos', rows: 97 },
  { name: 'estoque_movimentos', rows: 1650 },
  { name: 'embalagem_lotes', rows: 667 },
  { name: 'ordens_producao', rows: 308 },
  { name: 'categoria_assadeira_regras', rows: 12 },
  { name: 'etiquetas_geradas', rows: 80 },
  { name: 'fermentacao_lotes', rows: 0 },
  { name: 'forno_lotes', rows: 0 },
];

/** Agrupamento heurístico para orientar revisão manual */
const DOMAIN_HINTS: Record<string, string[]> = {
  'Pedidos / Auth (app valepan-pedidos)': [
    'pedidos', 'pedido_itens', 'pedido_itens_lotes', 'usuarios', 'usuario_clientes',
    'usuario_papeis', 'verification_tokens', 'enderecos_entrega', 'cliente_categorias',
    'cliente_precos', 'empresas', 'parcelas', 'parcelas_empresa', 'fechamentos',
    'integracao_produtos', 'sugestoes_envio_logs',
  ],
  'Financeiro / Omie': [
    'boletos', 'notas_fiscais', 'nota_fiscal_pedido', 'nota_fiscal_fechamento',
    'omie_webhook_eventos',
  ],
  'Logística / Rotas': [
    'caminhoes', 'veiculos_logistica', 'roteiros_entrega', 'roteiro_veiculos', 'roteiro_paradas',
  ],
  'WhatsApp / Notificações': [
    'whatsapp_pedido_sessao', 'whatsapp_pedido_mensagem', 'whatsapp_notificacao_log',
    'whatsapp_notificacao_tipos', 'cobranca_whatsapp_envios',
  ],
  'Clube Valepan': [
    'clube_config', 'clube_beneficios', 'clube_pontos_transacoes', 'clube_resgates',
  ],
  'Distribuidor / Hamburgueria': [
    'cadastro_hamburgueria_comentarios', 'distribuidor_precos_revenda',
    'distribuidor_parcelas_permitidas', 'parceiros_indicadores', 'vendedores',
    'estoque_consignado_movimentos',
  ],
  'Catálogo / Tags': [
    'produto_tags', 'produto_tag_associacoes', 'produto_familias', 'produto_familia_tags',
    'produto_familia_tag_associacoes',
  ],
  'Produção (possível legado — verificar antes de remover)': [
    'producao_etapas_log', 'producao_massa_ingredientes', 'masseiras',
    'receita_masseira_parametros', 'carrinhos',
  ],
  'Assadeiras por cliente (não implementado neste app)': [
    'cliente_assadeiras', 'cliente_assadeira_bloqueios',
  ],
};

/** Tabelas que tinham uso runtime só nos arquivos removidos (fila/meta embalagem, 2026-06-17) */
const FREED_BY_LEGACY_REMOVAL: Array<{ table: string; formerFiles: string[] }> = [
  {
    table: 'producao_etapas_log',
    formerFiles: [
      'src/data/production/ProductionStepRepository.ts',
      'src/app/actions/producao-actions.ts',
    ],
  },
  {
    table: 'producao_massa_ingredientes',
    formerFiles: ['src/data/production/ProductionMassaIngredienteRepository.ts'],
  },
  {
    table: 'masseiras',
    formerFiles: [
      'src/app/actions/producao-etapas-actions.ts',
      'src/app/producao/etapas/[ordemId]/massa/MassaStepClient.tsx',
      'src/components/Producao/MassaLotesModal.tsx',
    ],
  },
  {
    table: 'pedidos',
    formerFiles: ['src/app/actions/producao-actions.ts (join em .select)'],
  },
];

const EXCLUDED_FILES = new Set([
  'src/types/database.ts',
  'types/database.ts',
]);

function isInSelectContext(line: string): boolean {
  return (
    /\.select\s*\(/.test(line) ||
    /selectQuery/.test(line) ||
    /`\s*[\s\S]*\(/.test(line) ||
    /'\s*[^']*\(/.test(line) ||
    /"\s*[^"]*\(/.test(line)
  );
}

type EvidenceType =
  | 'from_literal'
  | 'from_constant'
  | 'dynamic_url'
  | 'select_relation'
  | 'literal_string'
  | 'rpc';

interface Evidence {
  file: string;
  line: number;
  type: EvidenceType;
  snippet: string;
}

interface TableAudit {
  table: string;
  rows: number;
  classification: 'used_explicit' | 'dynamic_possible' | 'select_relation_only' | 'no_reference';
  evidences: Evidence[];
}

function collectTsFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (['node_modules', '.next', 'dist', '.git'].includes(entry)) continue;
      collectTsFiles(full, acc);
    } else if (/\.(ts|tsx)$/.test(entry)) {
      acc.push(full);
    }
  }
  return acc;
}

function extractTableConstants(content: string): Map<string, string> {
  const map = new Map<string, string>();
  const re = /(?:const|let|var)\s+([A-Z_][A-Z0-9_]*)\s*=\s*['"`]([a-z_][a-z0-9_]*)['"`]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    map.set(m[1], m[2]);
  }
  return map;
}

function isFalsePositiveFrom(line: string): boolean {
  return (
    /Array\.from\(/.test(line) ||
    /Buffer\.from\(/.test(line) ||
    /Set\(\[/.test(line) && /\.join\(/.test(line)
  );
}

function scanFile(filePath: string, allTableNames: Set<string>): Evidence[] {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const relPath = relative(ROOT, filePath).replace(/\\/g, '/');
  if (EXCLUDED_FILES.has(relPath)) return [];
  const constants = extractTableConstants(content);
  const evidences: Evidence[] = [];

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;

    // .from('table') or .from("table")
    const fromLiteral = line.match(/\.from\s*\(\s*['"`]([a-z_][a-z0-9_]*)['"`]/);
    if (fromLiteral && !isFalsePositiveFrom(line)) {
      evidences.push({
        file: relPath,
        line: lineNum,
        type: 'from_literal',
        snippet: line.trim().slice(0, 120),
      });
    }

    // .from(CONSTANT)
    const fromConst = line.match(/\.from\s*\(\s*([A-Z_][A-Z0-9_]*)\s*\)/);
    if (fromConst && !isFalsePositiveFrom(line)) {
      const tableName = constants.get(fromConst[1]);
      if (tableName) {
        evidences.push({
          file: relPath,
          line: lineNum,
          type: 'from_constant',
          snippet: `${fromConst[1]} → '${tableName}' | ${line.trim().slice(0, 80)}`,
        });
      }
    }

    // dynamic URL table=xxx
    const dynamicUrl = line.match(/table=([a-z_][a-z0-9_]*)/g);
    if (dynamicUrl) {
      dynamicUrl.forEach(() => {
        evidences.push({
          file: relPath,
          line: lineNum,
          type: 'dynamic_url',
          snippet: line.trim().slice(0, 120),
        });
      });
    }

    // .rpc('function')
    const rpcMatch = line.match(/\.rpc\s*\(\s*['"`]([a-z_][a-z0-9_]*)['"`]/);
    if (rpcMatch) {
      evidences.push({
        file: relPath,
        line: lineNum,
        type: 'rpc',
        snippet: line.trim().slice(0, 120),
      });
    }
  });

  // select relations: table_name( in select/query strings only
  for (const table of allTableNames) {
    const relationRe = new RegExp(`\\b${table}\\s*\\(`, 'g');
    lines.forEach((line, idx) => {
      if (!relationRe.test(line)) return;
      if (!isInSelectContext(line) && !line.includes('.from(')) return;
      relationRe.lastIndex = 0;
      evidences.push({
        file: relPath,
        line: idx + 1,
        type: 'select_relation',
        snippet: line.trim().slice(0, 120),
      });
    });
  }

  // literal string mentions in runtime code (skip table defs in types)
  if (EXCLUDED_FILES.has(relPath)) return evidences;
  for (const table of allTableNames) {
    const literalRe = new RegExp(`['"\`]${table}['"\`]`, 'g');
    if (literalRe.test(content)) {
      const alreadyCaptured = evidences.some(
        (e) =>
          e.type === 'from_literal' ||
          e.type === 'from_constant' ||
          e.type === 'dynamic_url',
      );
      if (!alreadyCaptured) {
        const lineIdx = lines.findIndex((l) => literalRe.test(l));
        if (lineIdx >= 0 && !isFalsePositiveFrom(lines[lineIdx])) {
          evidences.push({
            file: relPath,
            line: lineIdx + 1,
            type: 'literal_string',
            snippet: lines[lineIdx].trim().slice(0, 120),
          });
        }
      }
    }
  }

  return evidences;
}

function main(): void {
  const allTableNames = new Set(REMOTE_PUBLIC_TABLES.map((t) => t.name));
  const scanDirs = [join(ROOT, 'src'), join(ROOT, 'scripts')];
  const files = scanDirs.flatMap((d) => collectTsFiles(d));

  const tableEvidences = new Map<string, Evidence[]>();
  for (const t of REMOTE_PUBLIC_TABLES) {
    tableEvidences.set(t.name, []);
  }

  for (const file of files) {
    if (file.includes('audit-unused-tables.ts')) continue;
    const evidences = scanFile(file, allTableNames);
    for (const ev of evidences) {
      let tableName: string | null = null;

      if (ev.type === 'from_literal') {
        const m = ev.snippet.match(/\.from\s*\(\s*['"`]([a-z_][a-z0-9_]*)['"`]/);
        tableName = m?.[1] ?? null;
      } else if (ev.type === 'from_constant') {
        const m = ev.snippet.match(/→ '([a-z_][a-z0-9_]*)'/);
        tableName = m?.[1] ?? null;
      } else if (ev.type === 'dynamic_url') {
        const m = ev.snippet.match(/table=([a-z_][a-z0-9_]*)/);
        tableName = m?.[1] ?? null;
      } else {
        for (const t of REMOTE_PUBLIC_TABLES) {
          if (ev.snippet.includes(t.name) || new RegExp(`\\b${t.name}\\b`).test(ev.snippet)) {
            tableName = t.name;
            break;
          }
        }
      }

      if (tableName && allTableNames.has(tableName)) {
        const existing = tableEvidences.get(tableName) ?? [];
        const dup = existing.some(
          (e) => e.file === ev.file && e.line === ev.line && e.type === ev.type,
        );
        if (!dup) existing.push(ev);
        tableEvidences.set(tableName, existing);
      }
    }
  }

  const audits: TableAudit[] = REMOTE_PUBLIC_TABLES.map((remote) => {
    const evidences = tableEvidences.get(remote.name) ?? [];
    const hasFrom = evidences.some(
      (e) => e.type === 'from_literal' || e.type === 'from_constant',
    );
    const hasDynamic = evidences.some((e) => e.type === 'dynamic_url');
    const hasRelation = evidences.some((e) => e.type === 'select_relation');
    const hasLiteral = evidences.some((e) => e.type === 'literal_string');

    let classification: TableAudit['classification'];
    if (hasFrom || hasRelation) {
      classification = 'used_explicit';
    } else if (hasDynamic) {
      classification = 'dynamic_possible';
    } else if (hasLiteral) {
      classification = 'select_relation_only';
    } else {
      classification = 'no_reference';
    }

    return { table: remote.name, rows: remote.rows, classification, evidences };
  });

  const used = audits.filter((a) => a.classification === 'used_explicit');
  const dynamic = audits.filter((a) => a.classification === 'dynamic_possible');
  const relationOnly = audits.filter((a) => a.classification === 'select_relation_only');
  const unused = audits.filter((a) => a.classification === 'no_reference');

  const reportLines: string[] = [
    '# Auditoria de Tabelas Não Utilizadas',
    '',
    `**Data:** ${new Date().toISOString().slice(0, 10)}`,
    `**Revisão:** pós-remoção Fila de Produção + Meta Embalagem (spec 2026-06-17)`,
    `**Fonte de tabelas:** Supabase remoto (schema \`public\`, projeto valepan-pedidos)`,
    `**Escopo de código:** \`src/**\` e \`scripts/**\` (*.ts, *.tsx)`,
    '',
    '## Resumo',
    '',
    `| Categoria | Quantidade |`,
    `|-----------|------------|`,
    `| Total de tabelas public | ${REMOTE_PUBLIC_TABLES.length} |`,
    `| Usadas explicitamente (.from) | ${used.length} |`,
    `| Uso dinâmico possível (table= URL) | ${dynamic.length} |`,
    `| Apenas relação/literal secundária | ${relationOnly.length} |`,
    `| **Sem referência encontrada** | **${unused.length}** |`,
    '',
    '---',
    '',
    '## Impacto da remoção de telas legadas',
    '',
    'Removidos ~7k linhas: fila de produção, etapas massa/fermentação, meta embalagem, actions/repositories em `src/data/production/` e `src/domain/production/`.',
    '',
    '### Tabelas que **deixaram** de ser usadas neste app',
    '',
    'Estas tinham `.from()` ou join **apenas** nos arquivos deletados:',
    '',
  ];

  for (const entry of FREED_BY_LEGACY_REMOVAL) {
    const row = REMOTE_PUBLIC_TABLES.find((t) => t.name === entry.table);
    reportLines.push(`- \`${entry.table}\`${row ? ` (${row.rows} linhas no banco)` : ''}`);
    for (const f of entry.formerFiles) {
      reportLines.push(`  - antes: \`${f}\``);
    }
  }

  reportLines.push(
    '',
    '### Tabelas de produção/receitas que **permanecem** em uso',
    '',
    'Não remover só porque a fila saiu — ainda há telas/APIs ativas:',
    '',
    '- `receitas`, `receita_ingredientes`, `insumos`, `produto_receitas` → `/receitas`, `/insumos`, `/produtos/receitas`',
    '- `ordens_producao`, `embalagem_lotes`, `fermentacao_lotes`, `forno_lotes` → Ordens de Produção + Realizado',
    '- `assadeiras`, `produto_assadeiras`, `categoria_assadeira_regras` → Config assadeiras',
    '',
    '---',
    '',
    '## Candidatas a Não Utilizadas (sem referência no monorepo)',
    '',
    'Estas tabelas existem em `public` no Supabase remoto e **não apareceram** em nenhum arquivo TS/TSX deste repositório.',
    'Podem ser usadas por outros apps (valepan-pedidos, CRM, jobs externos, SQL Editor).',
    '',
    '### Por domínio (heurística para revisão)',
    '',
  );

  const unusedNames = new Set(unused.map((a) => a.table));
  for (const [domain, tables] of Object.entries(DOMAIN_HINTS)) {
    const inDomain = tables.filter((t) => unusedNames.has(t));
    if (inDomain.length === 0) continue;
    reportLines.push(`**${domain}** (${inDomain.length})`);
    for (const t of inDomain) {
      const row = unused.find((a) => a.table === t)!;
      reportLines.push(`- \`${t}\` — ${row.rows} linhas`);
    }
    reportLines.push('');
  }

  const grouped = new Set(Object.values(DOMAIN_HINTS).flat());
  const ungrouped = unused.filter((a) => !grouped.has(a.table));
  if (ungrouped.length > 0) {
    reportLines.push(`**Outras** (${ungrouped.length})`);
    for (const a of ungrouped) {
      reportLines.push(`- \`${a.table}\` — ${a.rows} linhas`);
    }
    reportLines.push('');
  }

  reportLines.push('### Lista completa', '');

  for (const a of unused.sort((x, y) => x.table.localeCompare(y.table))) {
    reportLines.push(`### \`${a.table}\` (${a.rows} linhas)`);
    reportLines.push('');
  }

  reportLines.push('---', '', '## Tabelas Usadas Explicitamente', '');
  for (const a of used.sort((x, y) => x.table.localeCompare(y.table))) {
    reportLines.push(`### \`${a.table}\` (${a.rows} linhas)`);
    const uniqueFiles = [...new Set(a.evidences.map((e) => e.file))];
    reportLines.push(`- Arquivos: ${uniqueFiles.join(', ')}`);
    reportLines.push('');
  }

  if (dynamic.length > 0) {
    reportLines.push('---', '', '## Uso Dinâmico Possível', '');
    for (const a of dynamic) {
      reportLines.push(`### \`${a.table}\``);
      for (const e of a.evidences) {
        reportLines.push(`- \`${e.file}:${e.line}\` (${e.type})`);
      }
      reportLines.push('');
    }
  }

  if (relationOnly.length > 0) {
    reportLines.push('---', '', '## Referência Indireta (select/join ou literal)', '');
    for (const a of relationOnly) {
      reportLines.push(`### \`${a.table}\``);
      for (const e of a.evidences.slice(0, 5)) {
        reportLines.push(`- \`${e.file}:${e.line}\` (${e.type}): ${e.snippet.slice(0, 80)}`);
      }
      reportLines.push('');
    }
  }

  reportLines.push('---', '', '## Limitações', '');
  reportLines.push('- Não cobre uso por outros repositórios/apps do ecossistema Valepan.');
  reportLines.push('- `/api/options/generic?table=X` aceita qualquer tabela — tabelas sem referência literal ainda podem ser acessadas dinamicamente.');
  reportLines.push('- Arquivos de tipos gerados (`src/types/database.ts`) foram **excluídos** da varredura — refletem o schema completo, não uso runtime.');
  reportLines.push('- `_ordens_producao_legacy` deixou de ser referenciada após a remoção da fila (só comentário em script de backfill).');
  reportLines.push('- Para uso no app **valepan-pedidos**, ver `docs/auditoria-tabelas-nao-utilizadas-outros-sistemas.md`.');

  const reportPath = join(ROOT, 'docs', 'auditoria-tabelas-nao-utilizadas.md');
  writeFileSync(reportPath, reportLines.join('\n'), 'utf-8');

  const jsonPath = join(ROOT, 'docs', 'auditoria-tabelas-nao-utilizadas.json');
  writeFileSync(
    jsonPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        revisionNote: 'pos-remocao-fila-meta-embalagem-2026-06-17',
        summary: {
          total: REMOTE_PUBLIC_TABLES.length,
          used: used.length,
          unused: unused.length,
          freedByLegacyRemoval: FREED_BY_LEGACY_REMOVAL.map((e) => e.table),
        },
        audits,
      },
      null,
      2,
    ),
    'utf-8',
  );

  console.log(`Relatório: ${reportPath}`);
  console.log(`JSON: ${jsonPath}`);
  console.log(`\nSem referência: ${unused.length} tabelas`);
  unused.forEach((a) => console.log(`  - ${a.table} (${a.rows} rows)`));
}

main();
