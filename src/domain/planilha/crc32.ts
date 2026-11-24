export class Crc32 {
  private readonly tabela = this.montar();

  calcular(dados: Uint8Array): number {
    let crc = 0xffffffff;
    for (const byte of dados) {
      crc = this.tabela[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  private montar(): Uint32Array {
    const tabela = new Uint32Array(256);
    for (let indice = 0; indice < 256; indice += 1) {
      tabela[indice] = this.valor(indice);
    }
    return tabela;
  }

  private valor(inicio: number): number {
    let atual = inicio;
    for (let bit = 0; bit < 8; bit += 1) {
      atual = (atual & 1) === 1 ? 0xedb88320 ^ (atual >>> 1) : atual >>> 1;
    }
    return atual >>> 0;
  }
}
