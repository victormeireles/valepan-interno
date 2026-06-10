import { NextResponse } from 'next/server';

const GONE_MESSAGE =
  'Rota legada descontinuada — use /api/embalagem/pedido/[pedidoEmbalagemId] (Fase C).';

function gone() {
  return NextResponse.json({ error: GONE_MESSAGE }, { status: 410 });
}

/** @deprecated Fase C — meta embalagem usa pedidoEmbalagemId no Supabase. */
export async function DELETE() {
  return gone();
}
