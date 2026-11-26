import { SUGESTAO_MENSAGENS } from './sugestao-mensagens';

export const SUGESTAO_FOTO_MAX_BYTES = 5_242_880;
const MIMES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export type SugestaoFotoEntrada = { type: string; size: number; bytes: Uint8Array };

export type SugestaoFotoResultado =
  | { ok: true; arquivo: SugestaoFotoEntrada | null }
  | { ok: false; mensagem: string };

export class SugestaoFotoRegra {
  avaliar(arquivo: SugestaoFotoEntrada | null): SugestaoFotoResultado {
    if (!arquivo || arquivo.size <= 0) return { ok: true, arquivo: null };
    const aceita = MIMES.has(arquivo.type) && arquivo.size <= SUGESTAO_FOTO_MAX_BYTES;
    if (!aceita) return { ok: false, mensagem: SUGESTAO_MENSAGENS.foto };
    return { ok: true, arquivo };
  }
}
