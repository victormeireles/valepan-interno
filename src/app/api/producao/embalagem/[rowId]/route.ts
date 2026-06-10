import { NextResponse } from 'next/server';

const GONE_MESSAGE =
  'Rota legada descontinuada — use /api/producao/embalagem/lote/[loteId] (Fase C).';

function gone() {
  return NextResponse.json({ error: GONE_MESSAGE }, { status: 410 });
}

/** @deprecated Fase C — produção embalagem usa loteId no Supabase. */
export async function GET() {
  return gone();
}

/** @deprecated Ver GET. */
export async function PUT() {
  return gone();
}
