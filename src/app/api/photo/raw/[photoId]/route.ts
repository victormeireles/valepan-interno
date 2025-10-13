import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ photoId: string }> }
) {
  try {
    await context.params;
    
    // Por enquanto, retorna um erro 404
    // Este endpoint pode ser implementado posteriormente se necessário
    return NextResponse.json(
      { error: 'Endpoint não implementado' },
      { status: 404 }
    );
  } catch {
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
