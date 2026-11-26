import { describe, expect, it } from 'vitest';
import { SugestaoFotoRegra } from '@/domain/sugestoes/sugestao-foto-regra';
import { SugestaoIdentificacaoToken } from '@/domain/sugestoes/sugestao-identificacao-token';
import { SUGESTAO_MENSAGENS } from '@/domain/sugestoes/sugestao-mensagens';
import { SugestaoTemaCatalogo } from '@/domain/sugestoes/sugestao-tema-catalogo';
import { SugestaoTextoRegra } from '@/domain/sugestoes/sugestao-texto-regra';
import { SugestaoEnviarAcao, type SugestaoEnvioEntrada } from './sugestao-enviar-acao';

const AGORA = 1_700_000_000_000;

function montar(limite: 'ok' | 'limite' = 'ok', falha = false) {
  const gravou: unknown[] = [];
  const registro = {
    async gravar(entrada: unknown) {
      if (falha) throw new Error('insert');
      gravou.push(entrada);
    },
  };
  const acao = new SugestaoEnviarAcao(
    { async consumir() { return limite; } },
    new SugestaoIdentificacaoToken('segredo', () => AGORA),
    new SugestaoTemaCatalogo(),
    new SugestaoTextoRegra(),
    new SugestaoFotoRegra(),
    registro,
  );
  return { acao, gravou };
}

function envio(parcial: Partial<SugestaoEnvioEntrada> = {}): SugestaoEnvioEntrada {
  const token = new SugestaoIdentificacaoToken('segredo', () => AGORA).assinar('ana-id');
  return { token, tema: 'seguranca', texto: 'melhorar o piso da área', foto: null, ip: '1.1.1.1', ...parcial };
}

describe('SugestaoEnviarAcao', () => {
  it('não grava token vencido, tema inválido, texto curto nem foto inválida', async () => {
    const vencido = new SugestaoIdentificacaoToken('segredo', () => AGORA - 11 * 60 * 1000).assinar('ana-id');
    const { acao, gravou } = montar();
    expect((await acao.executar(envio({ token: vencido }))).status).toBe(401);
    expect((await acao.executar(envio({ tema: 'outro' }))).body.mensagem).toBe(SUGESTAO_MENSAGENS.escolhaTema);
    expect((await acao.executar(envio({ texto: 'curto' }))).body.mensagem).toBe(SUGESTAO_MENSAGENS.textoCurto);
    expect((await acao.executar(envio({
      foto: { type: 'image/gif', size: 4, bytes: new Uint8Array([1]) },
    }))).body.mensagem).toBe(SUGESTAO_MENSAGENS.foto);
    expect(gravou).toEqual([]);
  });

  it('no limite não grava', async () => {
    const { acao, gravou } = montar('limite');
    expect((await acao.executar(envio())).status).toBe(429);
    expect(gravou).toEqual([]);
  });

  it('grava o texto cortado e traduz falha em 500', async () => {
    const ok = montar();
    expect((await ok.acao.executar(envio({ texto: '  melhorar o piso da área  ' }))).status).toBe(200);
    expect(ok.gravou).toEqual([{
      colaboradorId: 'ana-id', tema: 'seguranca', texto: 'melhorar o piso da área', foto: null,
    }]);
    expect((await montar('ok', true).acao.executar(envio())).status).toBe(500);
  });
});
