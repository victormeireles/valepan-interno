/**
 * Remove todas as ordens operacionais (`interno.ordens_producao`), logs de etapas e
 * dados de massa ligados, e desassocia `ordens_producao_id` nas linhas da ordem diária.
 *
 * Uso (obrigatório confirmar):
 *   CONFIRM_LIMPAR_ORDENS=1 node scripts/limpar-ordens-producao.js
 *
 * Requer no .env.local: SUPABASE_URL, SERVICE_ROLE (service role).
 */
/* eslint-disable @typescript-eslint/no-require-imports */
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const CHUNK = 400;

function chunkArray(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function main() {
  if (process.env.CONFIRM_LIMPAR_ORDENS !== '1') {
    console.error(
      'Abortado: defina CONFIRM_LIMPAR_ORDENS=1 para executar a limpeza (operação irreversível).',
    );
    process.exit(1);
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SERVICE_ROLE;
  if (!url || !key) {
    console.error('SUPABASE_URL e SERVICE_ROLE são obrigatórios no .env.local.');
    process.exit(1);
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false },
    db: { schema: 'interno' },
  });

  console.log('1) Desassociando ordens_producao nas linhas da ordem diária…');
  const { error: uErr } = await supabase
    .from('ordens_producao_diarias_itens')
    .update({ ordens_producao_id: null, updated_at: new Date().toISOString() })
    .not('ordens_producao_id', 'is', null);
  if (uErr) throw new Error(`ordens_producao_diarias_itens: ${uErr.message}`);

  console.log('2) Listando ids de producao_etapas_log…');
  const { data: logRows, error: lErr } = await supabase.from('producao_etapas_log').select('id');
  if (lErr) throw new Error(`producao_etapas_log select: ${lErr.message}`);
  const logIds = (logRows ?? []).map((r) => r.id);
  console.log(`   ${logIds.length} log(s).`);

  for (const part of chunkArray(logIds, CHUNK)) {
    if (part.length === 0) continue;
    const { error: miErr } = await supabase
      .from('producao_massa_ingredientes')
      .delete()
      .in('producao_etapas_log_id', part);
    if (miErr) {
      if (!String(miErr.message).includes('Could not find the table')) {
        throw new Error(`producao_massa_ingredientes: ${miErr.message}`);
      }
      console.warn('   (ignorado) producao_massa_ingredientes:', miErr.message);
    }
    const { error: mlErr } = await supabase
      .from('producao_massa_lotes')
      .delete()
      .in('producao_etapas_log_id', part);
    if (mlErr) {
      if (!String(mlErr.message).includes('Could not find the table')) {
        throw new Error(`producao_massa_lotes: ${mlErr.message}`);
      }
      console.warn('   (ignorado) producao_massa_lotes:', mlErr.message);
    }
  }

  console.log('3) Removendo producao_etapas_log…');
  for (const part of chunkArray(logIds, CHUNK)) {
    if (part.length === 0) continue;
    const { error: dErr } = await supabase.from('producao_etapas_log').delete().in('id', part);
    if (dErr) throw new Error(`producao_etapas_log delete: ${dErr.message}`);
  }

  console.log('4) Removendo ordens_producao…');
  const { data: opRows, error: oErr } = await supabase.from('ordens_producao').select('id');
  if (oErr) throw new Error(`ordens_producao select: ${oErr.message}`);
  const opIds = (opRows ?? []).map((r) => r.id);
  for (const part of chunkArray(opIds, CHUNK)) {
    if (part.length === 0) continue;
    const { error: opDel } = await supabase.from('ordens_producao').delete().in('id', part);
    if (opDel) throw new Error(`ordens_producao delete: ${opDel.message}`);
  }

  const { count: nOp } = await supabase
    .from('ordens_producao')
    .select('*', { count: 'exact', head: true });
  const { count: nLog } = await supabase
    .from('producao_etapas_log')
    .select('*', { count: 'exact', head: true });

  console.log('Concluído.');
  console.log(`   ordens_producao restantes: ${nOp ?? '?'}`);
  console.log(`   producao_etapas_log restantes: ${nLog ?? '?'}`);
  console.log(
    'Nota: ordens_producao_diarias / _itens não foram apagadas (só desligamos a OP).',
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
