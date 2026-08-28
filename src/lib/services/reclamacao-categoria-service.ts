import { assertCategoriaPodeExcluir } from '@/domain/reclamacoes/reclamacao-categoria-exclusao';
import type { ReclamacaoCategoriaRecord } from '@/domain/reclamacoes/reclamacao-types';
import {
  ReclamacaoCategoriaRepository,
  type ReclamacaoCategoriaWriteInput,
} from '@/data/reclamacoes/ReclamacaoCategoriaRepository';

export type { ReclamacaoCategoriaWriteInput };

export class ReclamacaoCategoriaService {
  constructor(private readonly categorias: ReclamacaoCategoriaRepository) {}

  listAll(): Promise<ReclamacaoCategoriaRecord[]> {
    return this.categorias.listAll();
  }

  listAtivas(): Promise<ReclamacaoCategoriaRecord[]> {
    return this.categorias.listAtivas();
  }

  create(input: ReclamacaoCategoriaWriteInput): Promise<ReclamacaoCategoriaRecord> {
    return this.categorias.insert(input);
  }

  update(
    id: string,
    input: ReclamacaoCategoriaWriteInput,
  ): Promise<ReclamacaoCategoriaRecord> {
    return this.categorias.update(id, input);
  }

  async remove(id: string): Promise<void> {
    const count = await this.categorias.countByCategoriaId(id);
    const erro = assertCategoriaPodeExcluir(count);
    if (erro) throw new Error(erro);
    await this.categorias.deleteById(id);
  }
}

export const reclamacaoCategoriaService = new ReclamacaoCategoriaService(
  new ReclamacaoCategoriaRepository(),
);
