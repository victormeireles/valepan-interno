import { describe, expect, it, vi } from 'vitest';
import { ERRO_SALVAR_RECLAMACAO } from '@/domain/reclamacoes/reclamacao-mensagens';
import {
  salvarReclamacaoComFotos,
  type ReclamacaoSaveDeps,
  type ReclamacaoSavePayload,
} from './reclamacao-save-flow';

const payload: ReclamacaoSavePayload = {
  clienteId: 'c1',
  produtoId: 'p1',
  categoriaId: 'k1',
  exigeObservacao: false,
  observacao: null,
  dataFabricacao: '2026-08-12',
  dataProblema: '2026-08-25',
  quantidade: 10,
  unidade: 'caixas',
};

const file = new File([new Uint8Array([1])], 'a.jpg', { type: 'image/jpeg' });

function deps(overrides: Partial<ReclamacaoSaveDeps> = {}): ReclamacaoSaveDeps {
  return {
    create: vi.fn().mockResolvedValue({ success: true, data: { id: 'r1' } }),
    update: vi.fn().mockResolvedValue({ success: true, data: { id: 'r1' } }),
    remove: vi.fn().mockResolvedValue({ success: true, data: null }),
    postFoto: vi.fn().mockResolvedValue(true),
    compress: vi.fn(async (f: File) => f),
    ...overrides,
  };
}

describe('salvarReclamacaoComFotos', () => {
  it('no create, se a foto falhar, exclui a reclamação', async () => {
    const d = deps({ postFoto: vi.fn().mockResolvedValue(false) });
    const result = await salvarReclamacaoComFotos(d, {
      mode: 'create',
      payload,
      fotoIdsRemovidos: [],
      arquivosNovos: [file],
    });
    expect(d.create).toHaveBeenCalledWith(payload);
    expect(d.remove).toHaveBeenCalledWith('r1');
    expect(result).toEqual({ ok: false, error: ERRO_SALVAR_RECLAMACAO });
  });

  it('no create, se compress lançar, exclui a reclamação', async () => {
    const d = deps({
      compress: vi.fn().mockRejectedValue(new Error('compress fail')),
    });
    const result = await salvarReclamacaoComFotos(d, {
      mode: 'create',
      payload,
      fotoIdsRemovidos: [],
      arquivosNovos: [file],
    });
    expect(d.remove).toHaveBeenCalledWith('r1');
    expect(result).toEqual({ ok: false, error: ERRO_SALVAR_RECLAMACAO });
  });

  it('no create, se postFoto lançar, exclui a reclamação', async () => {
    const d = deps({
      postFoto: vi.fn().mockRejectedValue(new Error('network')),
    });
    const result = await salvarReclamacaoComFotos(d, {
      mode: 'create',
      payload,
      fotoIdsRemovidos: [],
      arquivosNovos: [file],
    });
    expect(d.remove).toHaveBeenCalledWith('r1');
    expect(result).toEqual({ ok: false, error: ERRO_SALVAR_RECLAMACAO });
  });

  it('no update, envia ids removidos e depois as fotos novas', async () => {
    const d = deps();
    const result = await salvarReclamacaoComFotos(d, {
      mode: 'update',
      id: 'r1',
      payload,
      fotoIdsRemovidos: ['f-old'],
      arquivosNovos: [file],
    });
    expect(d.update).toHaveBeenCalledWith('r1', {
      ...payload,
      fotoIdsRemovidos: ['f-old'],
    });
    expect(d.compress).toHaveBeenCalledWith(file);
    expect(d.postFoto).toHaveBeenCalledWith('r1', file);
    expect(d.remove).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: true });
  });
});
