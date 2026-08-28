import { describe, expect, it, vi } from 'vitest';
import { ReclamacaoService } from './reclamacao-service';

const validInput = {
  clienteId: 'c1',
  produtoId: 'p1',
  categoriaId: 'k1',
  exigeObservacao: false,
  observacao: null,
  dataFabricacao: '2026-08-12',
  dataProblema: '2026-08-25',
  quantidade: 10,
  unidade: 'caixas',
  fotosCount: 0,
  criadoPor: 'u1',
};

function makeService(overrides: {
  reclamacoes?: object;
  fotos?: object;
  storage?: object;
}) {
  return new ReclamacaoService(
    (overrides.reclamacoes ?? {}) as never,
    (overrides.fotos ?? { listByReclamacaoId: vi.fn().mockResolvedValue([]) }) as never,
    (overrides.storage ?? {
      upload: vi.fn(),
      remove: vi.fn(),
      signedUrls: vi.fn().mockResolvedValue(new Map()),
    }) as never,
  );
}

describe('ReclamacaoService', () => {
  it('não insere se a validação falha', async () => {
    const insert = vi.fn();
    const service = makeService({ reclamacoes: { insert } });
    await expect(
      service.create({ ...validInput, clienteId: '' }),
    ).rejects.toThrow('Informe o cliente.');
    expect(insert).not.toHaveBeenCalled();
  });

  it('remove apaga objetos do bucket', async () => {
    const fotos = {
      listByReclamacaoId: vi.fn().mockResolvedValue([
        { id: 'f1', storagePath: 'r1/a.jpg', ordem: 0 },
      ]),
    };
    const storage = { remove: vi.fn(), upload: vi.fn(), signedUrls: vi.fn() };
    const reclamacoes = { deleteById: vi.fn() };
    const service = makeService({ reclamacoes, fotos, storage });
    await service.remove('r1');
    expect(storage.remove).toHaveBeenCalledWith(['r1/a.jpg']);
    expect(reclamacoes.deleteById).toHaveBeenCalledWith('r1');
  });

  it('anexarFoto remove do bucket se insertMany falhar', async () => {
    const storagePath = 'r1/abc.jpg';
    const dbError = new Error('insert falhou');
    const fotos = {
      listByReclamacaoId: vi.fn().mockResolvedValue([]),
      insertMany: vi.fn().mockRejectedValue(dbError),
    };
    const storage = {
      upload: vi.fn().mockResolvedValue(storagePath),
      remove: vi.fn().mockResolvedValue(undefined),
      signedUrls: vi.fn(),
    };
    const service = makeService({ fotos, storage });
    await expect(service.anexarFoto('r1', new Uint8Array([1]))).rejects.toThrow(
      'insert falhou',
    );
    expect(storage.upload).toHaveBeenCalledWith('r1', new Uint8Array([1]));
    expect(storage.remove).toHaveBeenCalledWith([storagePath]);
  });

  it('anexarFoto recusa a 11ª', async () => {
    const fotos = {
      listByReclamacaoId: vi.fn().mockResolvedValue(
        Array.from({ length: 10 }, (_, i) => ({
          id: `f${i}`,
          storagePath: `r1/${i}.jpg`,
          ordem: i,
        })),
      ),
      insertMany: vi.fn(),
    };
    const storage = { upload: vi.fn(), remove: vi.fn(), signedUrls: vi.fn() };
    const service = makeService({ fotos, storage });
    await expect(service.anexarFoto('r1', new Uint8Array([1]))).rejects.toThrow(
      'No máximo 10 fotos.',
    );
    expect(storage.upload).not.toHaveBeenCalled();
  });
});
