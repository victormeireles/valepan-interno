import type { SugestaoCpfConsulta } from '@/domain/sugestoes/sugestao-cpf-consulta';
import type { SugestaoIdentificacaoToken } from '@/domain/sugestoes/sugestao-identificacao-token';
import { SUGESTAO_MENSAGENS } from '@/domain/sugestoes/sugestao-mensagens';
import type { SugestaoPublicaRateLimit } from '@/domain/sugestoes/sugestao-publica-rate-limit';

export type SugestaoHttp = { status: number; body: Record<string, string> };

export class SugestaoIdentificarAcao {
  constructor(
    private readonly limite: Pick<SugestaoPublicaRateLimit, 'consumir'>,
    private readonly consulta: Pick<SugestaoCpfConsulta, 'classificar'>,
    private readonly token: Pick<SugestaoIdentificacaoToken, 'assinar'>,
  ) {}

  async executar(cpf: string, ip: string | null): Promise<SugestaoHttp> {
    try {
      if (await this.limite.consumir(ip, 'identificar') === 'limite') {
        return { status: 429, body: { mensagem: SUGESTAO_MENSAGENS.muitasTentativas } };
      }
      return await this.responder(cpf);
    } catch {
      return { status: 500, body: { mensagem: SUGESTAO_MENSAGENS.falhaConsulta } };
    }
  }

  private async responder(cpf: string): Promise<SugestaoHttp> {
    const resultado = await this.consulta.classificar(cpf);
    if (resultado.tipo === 'invalido') {
      return { status: 400, body: { mensagem: SUGESTAO_MENSAGENS.cpfInvalido } };
    }
    if (resultado.tipo === 'rh') {
      return { status: 200, body: { mensagem: SUGESTAO_MENSAGENS.procureRh } };
    }
    return {
      status: 200,
      body: {
        nome: resultado.colaborador.nome,
        token: this.token.assinar(resultado.colaborador.id),
      },
    };
  }
}
