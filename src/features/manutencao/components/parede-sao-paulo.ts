const OFFSET_MS = 3 * 60 * 60 * 1000;
const PAREDE = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/;

export class ParedeSaoPaulo {
  deIso(iso: string): string {
    const instante = Date.parse(iso);
    if (Number.isNaN(instante)) return '';
    const parede = new Date(instante - OFFSET_MS);
    return `${this.data(parede)}T${this.hora(parede)}`;
  }

  paraIso(parede: string): string | null {
    const encontrado = PAREDE.exec(parede);
    if (!encontrado?.[1] || !encontrado[2] || !encontrado[3]) return null;
    return `${encontrado[1]}T${encontrado[2]}:${encontrado[3]}:00-03:00`;
  }

  agora(): string {
    return this.deIso(new Date().toISOString());
  }

  private data(parede: Date): string {
    const ano = parede.getUTCFullYear();
    const mes = String(parede.getUTCMonth() + 1).padStart(2, '0');
    const dia = String(parede.getUTCDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }

  private hora(parede: Date): string {
    const hora = String(parede.getUTCHours()).padStart(2, '0');
    const minuto = String(parede.getUTCMinutes()).padStart(2, '0');
    return `${hora}:${minuto}`;
  }
}
