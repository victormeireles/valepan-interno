import { NextResponse } from 'next/server';
import { insumoVinculoSugestaoService } from '@/lib/services/insumo-vinculo-sugestao-service';

export async function POST() {
  try {
    const resultado = await insumoVinculoSugestaoService.gerarSugestoes();
    return NextResponse.json(resultado);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao gerar sugestões';
    console.error('Erro em /api/insumos/pendencias/sugerir:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
