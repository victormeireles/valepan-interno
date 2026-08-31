import {
  insumoPedidoCompraRepository,
  type InsumoPedidoCompraFiltro,
  type InsumoPedidoCompraListItem,
  type InsumoPedidoCompraRepository,
} from '@/data/insumos/InsumoPedidoCompraRepository';
import type {
  InsumoPedidoCompraItemInput,
  InsumoPedidoPipelineItem,
} from '@/domain/insumos/insumo-pedido-compra-types';
import { insumoPedidoCompraValidator } from '@/domain/insumos/insumo-pedido-compra-validator';

export type SalvarInsumoPedidoCompraInput = {
  id?: string;
  fornecedorNome: string;
  dataChegadaPrevista: string;
  observacao?: string | null;
  criadoPor?: string | null;
  itens: InsumoPedidoCompraItemInput[];
};

type PedidoRepository = Pick<
  InsumoPedidoCompraRepository,
  | 'list'
  | 'getById'
  | 'insert'
  | 'replaceAberto'
  | 'updateStatus'
  | 'listInsumoOpcoes'
  | 'listPipelineAberto'
>;

export type InsumoPedidoCompraManagerDeps = {
  repository: PedidoRepository;
  validator?: typeof insumoPedidoCompraValidator;
};

export class InsumoPedidoCompraManager {
  private readonly repository: PedidoRepository;
  private readonly validator: typeof insumoPedidoCompraValidator;

  constructor(deps: InsumoPedidoCompraManagerDeps) {
    this.repository = deps.repository;
    this.validator = deps.validator ?? insumoPedidoCompraValidator;
  }

  async listar(
    filtro: InsumoPedidoCompraFiltro,
    insumoId?: string,
  ): Promise<{
    pedidos: InsumoPedidoCompraListItem[];
    atrasados: number;
    abertos: number;
  }> {
    const [pedidos, abertos, atrasados] = await Promise.all([
      this.repository.list(filtro, insumoId),
      this.repository.list('abertos', insumoId),
      this.repository.list('atrasados', insumoId),
    ]);

    return {
      pedidos,
      abertos: abertos.length,
      atrasados: atrasados.length,
    };
  }

  obter(id: string): Promise<InsumoPedidoCompraListItem | null> {
    return this.repository.getById(id);
  }

  async salvar(input: SalvarInsumoPedidoCompraInput): Promise<InsumoPedidoCompraListItem> {
    const erro = this.validator.validar({
      fornecedorNome: input.fornecedorNome,
      dataChegadaPrevista: input.dataChegadaPrevista,
      itens: input.itens,
    });
    if (erro) {
      throw new Error(erro);
    }

    const observacao = input.observacao ?? null;

    if (input.id) {
      const existente = await this.repository.getById(input.id);
      if (!existente || existente.status !== 'aberto') {
        throw new Error('Pedido encerrado ou cancelado não pode ser editado.');
      }
      return this.repository.replaceAberto(input.id, {
        fornecedorNome: input.fornecedorNome,
        dataChegadaPrevista: input.dataChegadaPrevista,
        observacao,
        itens: input.itens,
      });
    }

    return this.repository.insert({
      fornecedorNome: input.fornecedorNome,
      dataChegadaPrevista: input.dataChegadaPrevista,
      observacao,
      criadoPor: input.criadoPor ?? null,
      itens: input.itens,
    });
  }

  async encerrar(id: string): Promise<void> {
    await this.requireAberto(id);
    await this.repository.updateStatus(id, 'encerrado');
  }

  async cancelar(id: string): Promise<void> {
    await this.requireAberto(id);
    await this.repository.updateStatus(id, 'cancelado');
  }

  listarOpcoesInsumo(): Promise<Array<{ id: string; nome: string; unidade: string }>> {
    return this.repository.listInsumoOpcoes();
  }

  listarPipelineAberto(dataReferencia: string): Promise<InsumoPedidoPipelineItem[]> {
    return this.repository.listPipelineAberto(dataReferencia);
  }

  private async requireAberto(id: string): Promise<void> {
    const pedido = await this.repository.getById(id);
    if (!pedido || pedido.status !== 'aberto') {
      throw new Error('Pedido não encontrado ou não está aberto.');
    }
  }
}

export const insumoPedidoCompraManager = new InsumoPedidoCompraManager({
  repository: insumoPedidoCompraRepository,
});
