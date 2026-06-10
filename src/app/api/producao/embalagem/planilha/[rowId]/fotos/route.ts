import { NextResponse } from 'next/server';

const GONE_MESSAGE =
  'Rota legada descontinuada — fotos de lote via PATCH /api/producao/embalagem/lote/[loteId] (Fase C).';

function gone() {
  return NextResponse.json({ error: GONE_MESSAGE }, { status: 410 });
}

/** @deprecated Fase C */
export async function PATCH() {
  return gone();
}
