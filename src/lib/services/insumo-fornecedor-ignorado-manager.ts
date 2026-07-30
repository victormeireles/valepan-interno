import {
  insumoFornecedorIgnoradoRepository,
  InsumoFornecedorIgnoradoRepository,
} from '@/data/insumos/InsumoFornecedorIgnoradoRepository';
import {
  insumoPendenciaRepository,
  InsumoPendenciaRepository,
} from '@/data/insumos/InsumoPendenciaRepository';
import { isCnpjValido, normalizarCnpj } from '@/domain/insumos/insumo-cnpj';

export type MarcarFornecedorIgnoradoInput = {
  empresaId: string;
  cnpj: string;
  nome?: string | null;
  razao?: string | null;
  criadoPor?: string | null;
};

export type DesmarcarFornecedorIgnoradoInput = {
  empresaId: string;
  cnpj: string;
  restaurarPendencias: boolean;
};

export type InsumoFornecedorIgnoradoManagerDeps = {
  fornecedorIgnoradoRepository: InsumoFornecedorIgnoradoRepository;
  pendenciaRepository: InsumoPendenciaRepository;
};

export class InsumoFornecedorIgnoradoManager {
  constructor(private readonly deps: InsumoFornecedorIgnoradoManagerDeps) {}

  async marcarFornecedor(
    input: MarcarFornecedorIgnoradoInput,
  ): Promise<{ cnpj: string; pendenciasIgnoradas: number }> {
    const cnpjDigits = this.requireCnpjDigits(input.cnpj);

    await this.deps.fornecedorIgnoradoRepository.upsert({
      empresaId: input.empresaId,
      cnpjDigits,
      nome: input.nome,
      razao: input.razao,
      criadoPor: input.criadoPor,
    });

    const pendentes = await this.deps.pendenciaRepository.listIdsAndCnpjByEmpresaStatus(
      input.empresaId,
      'pendente',
    );
    const matchingIds = this.filterIdsByCnpj(pendentes, cnpjDigits);

    for (const id of matchingIds) {
      await this.deps.pendenciaRepository.marcarIgnorado(id);
    }

    return { cnpj: cnpjDigits, pendenciasIgnoradas: matchingIds.length };
  }

  async desmarcarFornecedor(
    input: DesmarcarFornecedorIgnoradoInput,
  ): Promise<{ cnpj: string; pendenciasRestauradas: number }> {
    const cnpjDigits = this.requireCnpjDigits(input.cnpj);

    await this.deps.fornecedorIgnoradoRepository.deleteByCnpj(
      input.empresaId,
      cnpjDigits,
    );

    if (!input.restaurarPendencias) {
      return { cnpj: cnpjDigits, pendenciasRestauradas: 0 };
    }

    const ignoradas = await this.deps.pendenciaRepository.listIdsAndCnpjByEmpresaStatus(
      input.empresaId,
      'ignorado',
    );
    const matchingIds = this.filterIdsByCnpj(ignoradas, cnpjDigits);

    for (const id of matchingIds) {
      await this.deps.pendenciaRepository.marcarPendente(id);
    }

    return { cnpj: cnpjDigits, pendenciasRestauradas: matchingIds.length };
  }

  private requireCnpjDigits(cnpj: string): string {
    const digits = normalizarCnpj(cnpj);
    if (!isCnpjValido(digits)) {
      throw new Error('CNPJ inválido');
    }
    return digits;
  }

  private filterIdsByCnpj(
    rows: { id: string; fornecedor_cnpj: string | null }[],
    cnpjDigits: string,
  ): string[] {
    return rows
      .filter((row) => normalizarCnpj(row.fornecedor_cnpj) === cnpjDigits)
      .map((row) => row.id);
  }
}

export const insumoFornecedorIgnoradoManager = new InsumoFornecedorIgnoradoManager({
  fornecedorIgnoradoRepository: insumoFornecedorIgnoradoRepository,
  pendenciaRepository: insumoPendenciaRepository,
});
