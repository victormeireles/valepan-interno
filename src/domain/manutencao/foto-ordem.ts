export type FotoOrdemValor = { url: string; id: string };

type Recusa = { ok: false; mensagem: string };
type Aceita = { ok: true; foto: FotoOrdemValor | null };

const MENSAGEM = 'Foto inválida.';
const PREFIXO = 'https://drive.google.com/file/d/';

export class FotoOrdem {
  validar(foto: FotoOrdemValor | null): Aceita | Recusa {
    if (foto === null) return { ok: true, foto: null };
    const url = foto.url.trim();
    const id = foto.id.trim();
    if (!this.parValido(url, id)) return { ok: false, mensagem: MENSAGEM };
    return { ok: true, foto: { url, id } };
  }

  private parValido(url: string, id: string): boolean {
    if (!url.startsWith(PREFIXO) || url.length > 500) return false;
    if (!/^[a-zA-Z0-9_-]{10,128}$/.test(id)) return false;
    return url.includes(`/${id}/`);
  }
}
