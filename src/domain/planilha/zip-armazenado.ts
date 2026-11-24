import { Crc32 } from './crc32';

type ArquivoZip = { nome: string; conteudo: Uint8Array };

export class ZipArmazenado {
  constructor(private readonly crc = new Crc32()) {}

  gerar(arquivos: ArquivoZip[]): Uint8Array {
    const partes: Uint8Array[] = [];
    const centrais: Uint8Array[] = [];
    let offset = 0;
    for (const arquivo of arquivos) {
      const local = this.local(arquivo);
      partes.push(local, arquivo.conteudo);
      centrais.push(this.central(arquivo, offset));
      offset += local.length + arquivo.conteudo.length;
    }
    const diretorio = juntar(centrais);
    return juntar([...partes, diretorio, this.fim(arquivos.length, diretorio.length, offset)]);
  }

  private local(arquivo: ArquivoZip): Uint8Array {
    return this.cabecalho(0x04034b50, arquivo, 0, 30);
  }

  private central(arquivo: ArquivoZip, offset: number): Uint8Array {
    return this.cabecalho(0x02014b50, arquivo, offset, 46);
  }

  private cabecalho(assinatura: number, arquivo: ArquivoZip, offset: number, tamanho: number): Uint8Array {
    const nome = new TextEncoder().encode(arquivo.nome);
    const buffer = new Uint8Array(tamanho + nome.length);
    const view = new DataView(buffer.buffer);
    const crc = this.crc.calcular(arquivo.conteudo);
    view.setUint32(0, assinatura, true);
    this.versoes(view, assinatura);
    view.setUint32(tamanho === 30 ? 14 : 16, crc, true);
    view.setUint32(tamanho === 30 ? 18 : 20, arquivo.conteudo.length, true);
    view.setUint32(tamanho === 30 ? 22 : 24, arquivo.conteudo.length, true);
    view.setUint16(tamanho === 30 ? 26 : 28, nome.length, true);
    if (tamanho === 46) view.setUint32(42, offset, true);
    buffer.set(nome, tamanho);
    return buffer;
  }

  private versoes(view: DataView, assinatura: number): void {
    if (assinatura === 0x02014b50) view.setUint16(4, 20, true);
    view.setUint16(assinatura === 0x02014b50 ? 6 : 4, 20, true);
  }

  private fim(quantidade: number, tamanho: number, offset: number): Uint8Array {
    const buffer = new Uint8Array(22);
    const view = new DataView(buffer.buffer);
    view.setUint32(0, 0x06054b50, true);
    view.setUint16(8, quantidade, true);
    view.setUint16(10, quantidade, true);
    view.setUint32(12, tamanho, true);
    view.setUint32(16, offset, true);
    return buffer;
  }
}

function juntar(partes: Uint8Array[]): Uint8Array {
  const total = partes.reduce((soma, parte) => soma + parte.length, 0);
  const saida = new Uint8Array(total);
  let cursor = 0;
  for (const parte of partes) {
    saida.set(parte, cursor);
    cursor += parte.length;
  }
  return saida;
}
