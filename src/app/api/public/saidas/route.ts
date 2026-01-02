import { NextResponse } from 'next/server';
import { saidasSheetManager } from '@/lib/managers/saidas-sheet-manager';
import { NovaSaidaPayload } from '@/domain/types/saidas';
import { whatsAppNotificationService } from '@/lib/services/whatsapp-notification-service';
import { estoqueService } from '@/lib/services/estoque-service';
import { apiKeyAuthService } from '@/lib/services/api-key-auth-service';

function isValidDateISO(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function hasQuantidadeValida(meta: NovaSaidaPayload['meta']): boolean {
  return (
    meta.caixas > 0 ||
    meta.pacotes > 0 ||
    meta.unidades > 0 ||
    meta.kg > 0
  );
}

/**
 * Endpoint público para criação de saídas via API externa
 * Requer autenticação via API Key no header Authorization ou X-API-Key
 */
export async function POST(request: Request) {
  try {
    // Validar autenticação
    if (!apiKeyAuthService.validateRequest(request)) {
      return NextResponse.json(
        { error: 'Não autorizado. Forneça uma API key válida no header Authorization ou X-API-Key' },
        { status: 401 },
      );
    }

    const payload = (await request.json()) as NovaSaidaPayload;

    // Validações de payload
    if (!payload || !isValidDateISO(payload.data)) {
      return NextResponse.json(
        { error: 'Data inválida. Use o formato YYYY-MM-DD' },
        { status: 400 },
      );
    }

    if (!payload.cliente || !payload.produto) {
      return NextResponse.json(
        { error: 'Cliente e produto são obrigatórios' },
        { status: 400 },
      );
    }

    if (!hasQuantidadeValida(payload.meta)) {
      return NextResponse.json(
        { error: 'Informe pelo menos uma quantidade válida (caixas, pacotes, unidades ou kg > 0)' },
        { status: 400 },
      );
    }

    // Registrar saída na planilha
    await saidasSheetManager.appendNovaSaida(payload);

    // Obter tipo de estoque do cliente
    const tipoEstoque = await estoqueService.obterTipoEstoqueCliente(payload.cliente);
    const clienteEstoque = tipoEstoque ?? payload.cliente;

    // Atualizar estoque (debitar quantidade da saída usando tipo de estoque)
    await estoqueService.aplicarDelta({
      cliente: clienteEstoque,
      produto: payload.produto,
      delta: {
        caixas: -(payload.meta.caixas || 0),
        pacotes: -(payload.meta.pacotes || 0),
        unidades: -(payload.meta.unidades || 0),
        kg: -(payload.meta.kg || 0),
      },
      allowNegative: true,
    });

    // Enviar notificação WhatsApp (se não foi solicitado para pular)
    if (!payload.skipNotification) {
      await whatsAppNotificationService.notifySaidasProduction({
        produto: payload.produto,
        cliente: payload.cliente,
        meta: payload.meta,
        realizado: payload.meta,
        data: payload.data,
        observacao: payload.observacao,
        origem: 'criada',
        fotoUrl: payload.fotoUrl,
      });
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Saída registrada com sucesso',
        data: {
          data: payload.data,
          cliente: payload.cliente,
          produto: payload.produto,
          quantidade: payload.meta,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[API Public Saidas] Erro ao processar requisição:', error);
    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}

