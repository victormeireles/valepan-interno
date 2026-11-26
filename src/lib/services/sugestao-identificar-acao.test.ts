import { describe, expect, it } from 'vitest';
import { SUGESTAO_MENSAGENS } from '@/domain/sugestoes/sugestao-mensagens';
import { SugestaoIdentificacaoToken } from '@/domain/sugestoes/sugestao-identificacao-token';
import type { SugestaoCpfResultado } from '@/domain/sugestoes/sugestao-cpf-consulta';
import { SugestaoIdentificarAcao } from './sugestao-identificar-acao';

const ANA = { tipo: 'identificado' as const, colaborador: { id: 'ana-id', nome: 'Ana' } };

function acao(resultado: SugestaoCpfResultado | 'estoura', limite: 'ok' | 'limite' = 'ok') {
  const chamadas = { consulta: 0 };
  const consulta = {
    async classificar(): Promise<SugestaoCpfResultado> {
      chamadas.consulta += 1;
      if (resultado === 'estoura') throw new Error('db');
      return resultado;
    },
  };
  const limitePorta = { async consumir() { return limite; } };
  const tokens = new SugestaoIdentificacaoToken('segredo', () => 1_700_000_000_000);
  return { chamadas, acao: new SugestaoIdentificarAcao(limitePorta, consulta, tokens) };
}

describe('SugestaoIdentificarAcao', () => {
  it('responde RH igual para nenhum e para vários, sem nome', async () => {
    const nenhum = await acao({ tipo: 'rh' }).acao.executar('39053344705', '1.1.1.1');
    const varios = await acao({ tipo: 'rh' }).acao.executar('39053344705', '1.1.1.1');
    expect(nenhum).toEqual({ status: 200, body: { mensagem: SUGESTAO_MENSAGENS.procureRh } });
    expect(varios).toEqual(nenhum);
    expect(nenhum.body.nome).toBeUndefined();
  });

  it('devolve nome e token sem o id', async () => {
    const resposta = await acao(ANA).acao.executar('39053344705', null);
    expect(resposta.status).toBe(200);
    expect(resposta.body.nome).toBe('Ana');
    expect(resposta.body.id).toBeUndefined();
    expect(new SugestaoIdentificacaoToken('segredo', () => 1_700_000_000_000).conferir(resposta.body.token))
      .toEqual({ colaboradorId: 'ana-id' });
  });

  it('no limite não consulta', async () => {
    const feito = acao(ANA, 'limite');
    expect(await feito.acao.executar('39053344705', '1.1.1.1')).toEqual({
      status: 429, body: { mensagem: SUGESTAO_MENSAGENS.muitasTentativas },
    });
    expect(feito.chamadas.consulta).toBe(0);
  });

  it('CPF inválido e falha de banco', async () => {
    expect((await acao({ tipo: 'invalido' }).acao.executar('1', null)).status).toBe(400);
    expect((await acao('estoura').acao.executar('39053344705', null)).status).toBe(500);
  });
});
