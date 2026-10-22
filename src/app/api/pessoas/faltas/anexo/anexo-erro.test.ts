import { describe, expect, it } from 'vitest';
import { FaltaAnexoNaoEncontradaError } from '@/lib/services/falta-anexo-service';
import { respostaErroAnexo } from './anexo-erro';

describe('respostaErroAnexo', () => {
  it('mapeia FaltaAnexoNaoEncontradaError para 404', async () => {
    const resposta = respostaErroAnexo(new FaltaAnexoNaoEncontradaError(), 'x');
    expect(resposta.status).toBe(404);
    expect(await resposta.json()).toEqual({ error: 'Falta não encontrada.' });
  });

  it('mapeia Error genérico para 500 com a mensagem', async () => {
    const resposta = respostaErroAnexo(new Error('falha'), 'padrão');
    expect(resposta.status).toBe(500);
    expect(await resposta.json()).toEqual({ error: 'falha' });
  });

  it('usa a mensagem padrão para valores não-Error', async () => {
    const resposta = respostaErroAnexo('boom', 'padrão');
    expect(resposta.status).toBe(500);
    expect(await resposta.json()).toEqual({ error: 'padrão' });
  });
});
