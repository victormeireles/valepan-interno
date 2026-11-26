import { SUGESTAO_MENSAGENS } from './sugestao-mensagens';

export type SugestaoTextoResultado =
  | { ok: true; texto: string }
  | { ok: false; mensagem: string };

export class SugestaoTextoRegra {
  avaliar(bruto: string): SugestaoTextoResultado {
    const texto = bruto.trim();
    if (texto.length < 10) return { ok: false, mensagem: SUGESTAO_MENSAGENS.textoCurto };
    if (texto.length > 2000) return { ok: false, mensagem: SUGESTAO_MENSAGENS.textoLongo };
    return { ok: true, texto };
  }
}
