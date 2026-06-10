import { NextResponse } from 'next/server';

const GONE_MESSAGE =
  'Rota legada descontinuada — produção embalagem usa pedidoEmbalagemId/loteId (Fase C).';

function gone() {
  return NextResponse.json({ error: GONE_MESSAGE }, { status: 410 });
}

/** @deprecated Fase C */
export async function GET() {
  return gone();
}

/** @deprecated Fase C */
export async function POST() {
  return gone();
}
