import { NextResponse } from 'next/server';

const GONE_MESSAGE =
  'Rota legada descontinuada — use POST /api/producao/embalagem/pedido/[pedidoEmbalagemId]/lote (Fase C).';

function gone() {
  return NextResponse.json({ error: GONE_MESSAGE }, { status: 410 });
}

/** @deprecated Fase C — produção parcial usa lotes no Supabase. */
export async function POST() {
  return gone();
}
