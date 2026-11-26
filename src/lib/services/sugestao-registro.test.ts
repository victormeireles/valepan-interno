import { describe, expect, it } from 'vitest';
import { SugestaoRegistro, type SugestaoFotoArquivo, type SugestaoInsert } from './sugestao-registro';

class Fotos implements SugestaoFotoArquivo {
  apagou: string[] = [];
  constructor(
    private readonly passos: string[] = [],
    private readonly falhaRemove = false,
  ) {}
  async upload(): Promise<string> {
    this.passos.push('upload');
    return 'foto.jpg';
  }
  async remove(paths: string[]) {
    this.passos.push('remove');
    if (this.falhaRemove) throw new Error('remove');
    this.apagou.push(...paths);
  }
}

class FotosUploadFalha implements SugestaoFotoArquivo {
  apagou: string[] = [];
  async upload(): Promise<string> {
    throw new Error('upload');
  }
  async remove(paths: string[]) {
    this.apagou.push(...paths);
  }
}

function banco(falha: boolean, passos: string[] = []): SugestaoInsert & { linhas: unknown[] } {
  return {
    linhas: [],
    async inserir(linha) {
      passos.push('inserir');
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

  it('grava com foto: upload primeiro, guarda foto_path e não chama remove', async () => {
    const passos: string[] = [];
    const fotos = new Fotos(passos);
    const db = banco(false, passos);
    await new SugestaoRegistro(db, fotos).gravar({
      colaboradorId: 'ana', tema: 'seguranca', texto: 'melhorar o piso', foto,
    });
    expect(passos).toEqual(['upload', 'inserir']);
    expect(db.linhas).toEqual([{
      colaborador_id: 'ana', tema: 'seguranca', texto: 'melhorar o piso', foto_path: 'foto.jpg',
    }]);
    expect(fotos.apagou).toEqual([]);
  });

  it('não chama inserir nem remove se o upload falhar', async () => {
    const fotos = new FotosUploadFalha();
    const db = banco(false);
    await expect(new SugestaoRegistro(db, fotos).gravar({
      colaboradorId: 'ana', tema: 'seguranca', texto: 'melhorar o piso', foto,
    })).rejects.toThrow('upload');
    expect(db.linhas).toEqual([]);
    expect(fotos.apagou).toEqual([]);
  });

  it('rethrow do insert se o remove também falhar', async () => {
    const fotos = new Fotos([], true);
    await expect(new SugestaoRegistro(banco(true), fotos).gravar({
      colaboradorId: 'ana', tema: 'seguranca', texto: 'melhorar o piso', foto,
    })).rejects.toThrow('insert');
  });
});
