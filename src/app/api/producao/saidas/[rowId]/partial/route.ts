import { NextResponse } from 'next/server';
import { whatsAppNotificationService } from '@/lib/services/whatsapp-notification-service';
import { saidaMovimentoService } from '@/lib/services/saida-movimento-service';
import { estoqueRepository } from '@/data/estoque/EstoqueRepository';
import { estoqueService } from '@/lib/services/estoque-service';
import { parseSaidaId } from '@/domain/saidas/saida-id';
import { deltaFromQuantidade } from '@/domain/saidas/movimento-saida-mapper';
import type { SaidaQuantidade } from '@/domain/types/saidas';

export async function POST(
  request: Request,
  context: { params: Promise<{ rowId: string }> },
) {
  try {
    const { rowId } = await context.params;
    const movimentoId = parseSaidaId(rowId);
    if (!movimentoId) {
      return NextResponse.json({ error: 'ID de saída inválido' }, { status: 400 });
    }

    const body = await request.json();
    const realizado: SaidaQuantidade = {
      caixas: Number(body.caixas || 0),
      pacotes: Number(body.pacotes || 0),
      unidades: Number(body.unidades || 0),
      kg: Number(body.kg || 0),
    };

    if (
      realizado.caixas < 0 ||
      realizado.pacotes < 0 ||
      realizado.unidades < 0 ||
      realizado.kg < 0
    ) {
      return NextResponse.json({ error: 'Valores não podem ser negativos' }, { status: 400 });
    }

    const original = await estoqueRepository.findMovimentoById(movimentoId);
    if (!original || original.origem !== 'saida' || !original.clienteDestino) {
      return NextResponse.json({ error: 'Saída original não encontrada' }, { status: 404 });
    }

    const metaOriginal = {
      caixas: Math.abs(original.delta.caixas || 0),
      pacotes: Math.abs(original.delta.pacotes || 0),
      unidades: Math.abs(original.delta.unidades || 0),
      kg: Math.abs(original.delta.kg || 0),
    };

    const isPartial =
      (metaOriginal.caixas > 0 && realizado.caixas < metaOriginal.caixas) ||
      (metaOriginal.pacotes > 0 && realizado.pacotes < metaOriginal.pacotes) ||
      (metaOriginal.unidades > 0 && realizado.unidades < metaOriginal.unidades) ||
      (metaOriginal.kg > 0 && realizado.kg < metaOriginal.kg);

    if (!isPartial) {
      return NextResponse.json({
        error: 'Saída não é parcial. Use o botão "Salvar" normal.',
      }, { status: 400 });
    }

    const novaMeta = {
      caixas: Math.max(0, metaOriginal.caixas - realizado.caixas),
      pacotes: Math.max(0, metaOriginal.pacotes - realizado.pacotes),
      unidades: Math.max(0, metaOriginal.unidades - realizado.unidades),
      kg: Math.max(0, Number((metaOriginal.kg - realizado.kg).toFixed(3))),
    };

    const credito = {
      caixas: metaOriginal.caixas - novaMeta.caixas,
      pacotes: metaOriginal.pacotes - novaMeta.pacotes,
      unidades: metaOriginal.unidades - novaMeta.unidades,
      kg: Number((metaOriginal.kg - novaMeta.kg).toFixed(3)),
    };

    const tipoEstoque = await estoqueService.obterTipoEstoqueCliente(original.clienteDestino);
    if (tipoEstoque) {
      await estoqueService.aplicarDelta({
        cliente: tipoEstoque,
        produto: original.produtoNome,
        delta: credito,
        allowNegative: true,
        origem: 'saida',
        clienteDestino: original.clienteDestino,
      });
    }

    await estoqueRepository.updateMovimentoDelta(
      movimentoId,
      deltaFromQuantidade(novaMeta),
      original.produtoId,
    );

    const nova = await saidaMovimentoService.registrarSaida({
      data: original.createdAt.slice(0, 10),
      cliente: original.clienteDestino,
      produto: original.produtoNome,
      quantidade: realizado,
    });

    try {
      await whatsAppNotificationService.notifySaidasProduction({
        produto: nova.produto,
        cliente: nova.cliente,
        meta: metaOriginal,
        realizado,
        data: nova.data,
        origem: 'atualizada',
        fotoUrl: body.fotoUrl || undefined,
      });
    } catch {
      // notificação opcional
    }

    const linhaOriginal = await saidaMovimentoService.getById(movimentoId);

    return NextResponse.json({
      message: 'Saída parcial salva com sucesso',
      novaLinhaRowId: nova.id,
      linhaOriginal: {
        novaMeta: linhaOriginal?.meta ?? novaMeta,
      },
      novaLinha: {
        meta: nova.meta,
        realizado: nova.realizado,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
