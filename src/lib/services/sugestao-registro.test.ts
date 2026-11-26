import { describe, expect, it } from 'vitest';
import { SugestaoRegistro, type SugestaoFotoArquivo, type SugestaoInsert } from './sugestao-registro';

class Fotos implements SugestaoFotoArquivo {
  apagou: string[] = [];
  async upload(): Promise<string> { return 'foto.jpg'; }
  async remove(paths: string[]) { this.apagou.push(...paths); }
}

function banco(falha: boolean): SugestaoInsert & { linhas: unknown[] } {
  return {
    linhas: [],
    async inserir(linha) {
      if (falha) throw new Error('insert');
      this.linhas.push(linha);
    },
  };
}

describe('SugestaoRegistro', () => {
  const foto = { type: 'image/jpeg', size: 1, bytes: new Uint8Array([1]) };

  it('grava sem foto', async () => {
    const fotos = new Fotos();
    const db = banco(false);
    await new SugestaoRegistro(db, fotos).gravar({
      colaboradorId: 'ana', tema: 'seguranca', texto: 'melhorar o piso', foto: null,
    });
    expect(db.linhas).toEqual([{
      colaborador_id: 'ana', tema: 'seguranca', texto: 'melhorar o piso', foto_path: null,
    }]);
    expect(fotos.apagou).toEqual([]);
  });

  it('apaga a foto se o insert falhar', async () => {
    const fotos = new Fotos();
    await expect(new SugestaoRegistro(banco(true), fotos).gravar({
      colaboradorId: 'ana', tema: 'seguranca', texto: 'melhorar o piso', foto,
    })).rejects.toThrow('insert');
    expect(fotos.apagou).toEqual(['foto.jpg']);
  });
});
