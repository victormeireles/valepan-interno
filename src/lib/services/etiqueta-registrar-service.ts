import {
  etiquetasGeradasRepository,
  type EtiquetasGeradasRepository,
} from '@/data/etiquetas/EtiquetasGeradasRepository';

export type RegistrarEtiquetaInput = {
  ordemProducaoId?: string;
  produtoId: string;
  tipoEstoqueId: string;
  dataFabricacao: string;
  modo: 'pedido' | 'manual';
  geradoPor?: string | null;
};

export class EtiquetaRegistrarService {
  constructor(
    private readonly etiquetasRepository: Pick<
      EtiquetasGeradasRepository,
      'findByOrdemProducaoIds' | 'insert'
    > = etiquetasGeradasRepository,
  ) {}

  async registrar(input: RegistrarEtiquetaInput): Promise<void> {
    if (input.modo === 'pedido') {
      if (!input.ordemProducaoId) {
        throw new Error('ordemProducaoId é obrigatório para modo pedido');
      }

      const existing = await this.etiquetasRepository.findByOrdemProducaoIds([
        input.ordemProducaoId,
      ]);
      if (existing.has(input.ordemProducaoId)) {
        return;
      }

      await this.etiquetasRepository.insert({
        ordemProducaoId: input.ordemProducaoId,
        produtoId: input.produtoId,
        tipoEstoqueId: input.tipoEstoqueId,
        dataFabricacao: input.dataFabricacao,
        modo: 'pedido',
        geradoPor: input.geradoPor ?? null,
      });
      return;
    }

    await this.etiquetasRepository.insert({
      ordemProducaoId: null,
      produtoId: input.produtoId,
      tipoEstoqueId: input.tipoEstoqueId,
      dataFabricacao: input.dataFabricacao,
      modo: 'manual',
      geradoPor: input.geradoPor ?? null,
    });
  }
}

export const etiquetaRegistrarService = new EtiquetaRegistrarService();
