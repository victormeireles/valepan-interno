import type { SugestaoFotoEntrada } from '@/domain/sugestoes/sugestao-foto-regra';
import { SugestaoFotoRegra } from '@/domain/sugestoes/sugestao-foto-regra';
import type { SugestaoIdentificacaoToken } from '@/domain/sugestoes/sugestao-identificacao-token';
import { SUGESTAO_MENSAGENS } from '@/domain/sugestoes/sugestao-mensagens';
import type { SugestaoPublicaRateLimit } from '@/domain/sugestoes/sugestao-publica-rate-limit';
import { SugestaoTemaCatalogo } from '@/domain/sugestoes/sugestao-tema-catalogo';
import { SugestaoTextoRegra } from '@/domain/sugestoes/sugestao-texto-regra';
import type { SugestaoRegistro } from '@/lib/services/sugestao-registro';
import type { SugestaoHttp } from '@/lib/services/sugestao-identificar-acao';

export type SugestaoEnvioEntrada = {
  token: string;
  tema: string;
  texto: string;
  foto: SugestaoFotoEntrada | null;
  ip: string | null;
};

export class SugestaoEnviarAcao {
  constructor(
    private readonly limite: Pick<SugestaoPublicaRateLimit, 'consumir'>,
    private readonly token: Pick<SugestaoIdentificacaoToken, 'conferir'>,
    private readonly temas: SugestaoTemaCatalogo,
    private readonly textos: SugestaoTextoRegra,
    private readonly fotos: SugestaoFotoRegra,
    private readonly registro: Pick<SugestaoRegistro, 'gravar'>,
  ) {}

  async executar(entrada: SugestaoEnvioEntrada): Promise<SugestaoHttp> {
    try {
      return await this.validar(entrada);
    } catch {
      return { status: 500, body: { mensagem: SUGESTAO_MENSAGENS.falhaEnvio } };
    }
  }

  private async validar(entrada: SugestaoEnvioEntrada): Promise<SugestaoHttp> {
    if (await this.limite.consumir(entrada.ip, 'enviar') === 'limite') {
      return { status: 429, body: { mensagem: SUGESTAO_MENSAGENS.muitasTentativas } };
    }
    const dono = this.token.conferir(entrada.token);
    if (!dono) return { status: 401, body: { mensagem: SUGESTAO_MENSAGENS.identificacaoExpirou } };
    if (!this.temas.aceita(entrada.tema)) {
      return { status: 400, body: { mensagem: SUGESTAO_MENSAGENS.escolhaTema } };
    }
    const texto = this.textos.avaliar(entrada.texto);
    if (!texto.ok) return { status: 400, body: { mensagem: texto.mensagem } };
    const foto = this.fotos.avaliar(entrada.foto);
    if (!foto.ok) return { status: 400, body: { mensagem: foto.mensagem } };
    await this.registro.gravar({
      colaboradorId: dono.colaboradorId,
      tema: entrada.tema,
      texto: texto.texto,
      foto: foto.arquivo,
    });
    return { status: 200, body: { mensagem: SUGESTAO_MENSAGENS.enviada } };
  }
}
