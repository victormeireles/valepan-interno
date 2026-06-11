import { estoqueRepository } from '@/data/estoque/EstoqueRepository';
import { estoqueResolverService } from '@/lib/services/estoque-resolver-service';
import { estoqueService } from '@/lib/services/estoque-service';
import {
  deltaFromQuantidade,
  movimentoToSaidaRecord,
} from '@/domain/saidas/movimento-saida-mapper';
import type { SaidaQuantidade, SaidaSheetRecord } from '@/domain/types/saidas';

export class SaidaMovimentoService {
  async listByDate(dateISO: string): Promise<SaidaSheetRecord[]> {
    const movimentos = await estoqueRepository.listSaidasByDate(dateISO);
    return movimentos.map(movimentoToSaidaRecord);
  }

  async getById(id: string): Promise<SaidaSheetRecord | null> {
    const movimento = await estoqueRepository.findMovimentoById(id);
    if (!movimento || movimento.origem !== 'saida') {
      return null;
    }
    return movimentoToSaidaRecord(movimento);
  }

  async findMatching(input: {
    data: string;
    cliente: string;
    produto: string;
    quantidade: SaidaQuantidade;
  }): Promise<SaidaSheetRecord[]> {
    const movimentos = await estoqueRepository.findSaidasMatching(input);
    return movimentos.map(movimentoToSaidaRecord);
  }

  async registrarSaida(input: {
    data: string;
    cliente: string;
    produto: string;
    quantidade: SaidaQuantidade;
  }): Promise<SaidaSheetRecord> {
    const tipoEstoque = await estoqueService.obterTipoEstoqueCliente(input.cliente);
    const clienteEstoque = tipoEstoque ?? input.cliente;

    const { movimentoId } = await estoqueService.aplicarDelta({
      cliente: clienteEstoque,
      produto: input.produto,
      delta: deltaFromQuantidade(input.quantidade),
      allowNegative: true,
      origem: 'saida',
      clienteDestino: input.cliente,
    });

    const movimento = await estoqueRepository.findMovimentoById(movimentoId);
    if (!movimento) {
      throw new Error('Movimento de saída não encontrado após registro');
    }

    return movimentoToSaidaRecord(movimento);
  }

  async estornarSaida(id: string): Promise<SaidaSheetRecord | null> {
    const movimento = await estoqueRepository.findMovimentoById(id);
    if (!movimento || movimento.origem !== 'saida') {
      return null;
    }

    const quantidade = {
      caixas: Math.abs(movimento.delta.caixas || 0),
      pacotes: Math.abs(movimento.delta.pacotes || 0),
      unidades: Math.abs(movimento.delta.unidades || 0),
      kg: Math.abs(movimento.delta.kg || 0),
    };

    const tipoEstoque = await estoqueService.obterTipoEstoqueCliente(
      movimento.clienteDestino ?? '',
    );

    if (tipoEstoque && movimento.clienteDestino) {
      await estoqueService.aplicarDelta({
        cliente: tipoEstoque,
        produto: movimento.produtoNome,
        delta: quantidade,
        allowNegative: true,
        origem: 'saida',
        clienteDestino: movimento.clienteDestino,
      });
    }

    await estoqueRepository.deleteMovimento(id);
    return movimentoToSaidaRecord(movimento);
  }

  async ajustarRealizado(
    id: string,
    realizadoNovo: SaidaQuantidade,
    quantidadeBase?: SaidaQuantidade,
  ): Promise<SaidaSheetRecord> {
    const movimento = await estoqueRepository.findMovimentoById(id);
    if (!movimento || movimento.origem !== 'saida') {
      throw new Error('Saída não encontrada');
    }

    const base = quantidadeBase ?? {
      caixas: Math.abs(movimento.delta.caixas || 0),
      pacotes: Math.abs(movimento.delta.pacotes || 0),
      unidades: Math.abs(movimento.delta.unidades || 0),
      kg: Math.abs(movimento.delta.kg || 0),
    };

    const delta = {
      caixas: (realizadoNovo.caixas || 0) - (base.caixas || 0),
      pacotes: (realizadoNovo.pacotes || 0) - (base.pacotes || 0),
      unidades: (realizadoNovo.unidades || 0) - (base.unidades || 0),
      kg: (realizadoNovo.kg || 0) - (base.kg || 0),
    };

    const houveMudanca =
      delta.caixas !== 0 ||
      delta.pacotes !== 0 ||
      delta.unidades !== 0 ||
      delta.kg !== 0;

    if (houveMudanca && movimento.clienteDestino) {
      const tipoEstoque = await estoqueService.obterTipoEstoqueCliente(
        movimento.clienteDestino,
      );

      if (tipoEstoque) {
        await estoqueService.aplicarDelta({
          cliente: tipoEstoque,
          produto: movimento.produtoNome,
          delta: {
            caixas: -delta.caixas,
            pacotes: -delta.pacotes,
            unidades: -delta.unidades,
            kg: -delta.kg,
          },
          allowNegative: true,
          origem: 'saida',
          clienteDestino: movimento.clienteDestino,
        });
      }
    }

    const produtoId = await estoqueResolverService.resolveProdutoId(movimento.produtoNome);
    await estoqueRepository.updateMovimentoDelta(id, deltaFromQuantidade(realizadoNovo), produtoId);

    const atualizado = await estoqueRepository.findMovimentoById(id);
    if (!atualizado) {
      throw new Error('Saída não encontrada após atualização');
    }

    return movimentoToSaidaRecord(atualizado);
  }
}

export const saidaMovimentoService = new SaidaMovimentoService();
