/**
 * Manager para lógica de negócio de ordens de produção
 * Responsabilidade: Criação, atualização e cálculos relacionados a ordens
 */

import { ProductionOrderRepository } from '@/data/production/ProductionOrderRepository';
import {
  ProductionOrder,
  CreateProductionOrderInput,
  UpdateProductionOrderInput,
} from '@/data/production/ProductionOrderRepository';
import { getQuantityByStation, ProductConversionInfo } from '@/lib/utils/production-conversions';

export class ProductionOrderManager {
  constructor(private readonly orderRepository: ProductionOrderRepository) {}

  /**
   * Cria uma nova ordem de produção
   */
  async createOrder(input: CreateProductionOrderInput): Promise<ProductionOrder> {
    if (input.qtd_planejada <= 0) {
      throw new Error('Quantidade planejada deve ser maior que zero');
    }

    return this.orderRepository.create(input);
  }

  /**
   * Atualiza uma ordem de produção
   */
  async updateOrder(
    id: string,
    input: UpdateProductionOrderInput,
  ): Promise<ProductionOrder> {
    if (input.qtd_planejada !== undefined && input.qtd_planejada <= 0) {
      throw new Error('Quantidade planejada deve ser maior que zero');
    }

    return this.orderRepository.update(id, input);
  }

  /**
   * Calcula quantas receitas faltam para completar uma ordem
   */
  async calculateRemainingRecipes(
    ordemProducaoId: string,
    productInfo: ProductConversionInfo,
  ): Promise<number> {
    const order = await this.orderRepository.findById(ordemProducaoId);
    if (!order) {
      throw new Error('Ordem de produção não encontrada');
    }

    // Calcula receitas necessárias
    const stationQuantity = getQuantityByStation(
      'massa',
      order.qtd_planejada,
      productInfo,
    );

    return stationQuantity.receitas?.value || 0;
  }

  /**
   * Busca ordem por ID
   */
  async getOrderById(id: string): Promise<ProductionOrder | null> {
    return this.orderRepository.findById(id);
  }

  /**
   * Busca ordens ativas
   */
  async getActiveOrders(): Promise<ProductionOrder[]> {
    return this.orderRepository.findActive();
  }
}








