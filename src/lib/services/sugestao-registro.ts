import type { SugestaoTema } from '@/domain/sugestoes/sugestao-tema-catalogo';
import type { SugestaoFotoEntrada } from '@/domain/sugestoes/sugestao-foto-regra';

export interface SugestaoFotoArquivo {
  upload(bytes: Uint8Array, type: string): Promise<string>;
  remove(paths: string[]): Promise<void>;
}

export type SugestaoLinhaInsert = {
  colaborador_id: string;
  tema: SugestaoTema;
  texto: string;
  foto_path: string | null;
};

export interface SugestaoInsert {
  inserir(linha: SugestaoLinhaInsert): Promise<void>;
}

export class SugestaoRegistro {
  constructor(
    private readonly db: SugestaoInsert,
    private readonly fotos: SugestaoFotoArquivo,
  ) {}

  async gravar(entrada: {
    colaboradorId: string;
    tema: SugestaoTema;
    texto: string;
    foto: SugestaoFotoEntrada | null;
  }): Promise<void> {
    const path = entrada.foto
      ? await this.fotos.upload(entrada.foto.bytes, entrada.foto.type)
      : null;
    try {
      await this.db.inserir({
        colaborador_id: entrada.colaboradorId,
        tema: entrada.tema,
        texto: entrada.texto,
        foto_path: path,
      });
    } catch (error) {
      if (path) {
        try {
          await this.fotos.remove([path]);
        } catch {
          throw error;
        }
      }
      throw error;
    }
  }
}
