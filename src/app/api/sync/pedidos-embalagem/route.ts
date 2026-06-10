import { NextResponse } from 'next/server';

export const maxDuration = 60;

const GONE_MESSAGE =
  'Sync pedidos embalagem desligado — banco é fonte de verdade (Fase C).';

function gone() {
  return NextResponse.json({ error: GONE_MESSAGE }, { status: 410 });
}

/**
 * @deprecated Fase C — embalagem meta/realizado usa Supabase como fonte de verdade.
 * Sync planilha → banco desligado permanentemente.
 */
export async function POST() {
  return gone();
}

/** @deprecated Ver POST. */
export async function GET() {
  return gone();
}
