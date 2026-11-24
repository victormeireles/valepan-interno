import { XmlTexto } from './xml-texto';
import { ZipArmazenado } from './zip-armazenado';

const DECLARACAO = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';

export class PlanilhaXlsx {
  constructor(
    private readonly zip = new ZipArmazenado(),
    private readonly xml = new XmlTexto(),
  ) {}

  gerar(aba: string, colunas: string[], linhas: string[][]): Uint8Array {
    return this.zip.gerar([
      { nome: '[Content_Types].xml', conteudo: utf8(this.tipos()) },
      { nome: '_rels/.rels', conteudo: utf8(this.relsPacote()) },
      { nome: 'xl/workbook.xml', conteudo: utf8(this.workbook(aba)) },
      { nome: 'xl/_rels/workbook.xml.rels', conteudo: utf8(this.relsWorkbook()) },
      { nome: 'xl/worksheets/sheet1.xml', conteudo: utf8(this.folha(colunas, linhas)) },
    ]);
  }

  private tipos(): string {
    return `${DECLARACAO}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`;
  }

  private relsPacote(): string {
    return `${DECLARACAO}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
  }

  private workbook(aba: string): string {
    const nome = this.xml.atributo(aba);
    return `${DECLARACAO}<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${nome}" sheetId="1" r:id="rId1"/></sheets></workbook>`;
  }

  private relsWorkbook(): string {
    return `${DECLARACAO}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`;
  }

  private folha(colunas: string[], linhas: string[][]): string {
    const rows = [colunas, ...linhas].map((linha, indice) => this.linha(linha, indice + 1)).join('');
    return `${DECLARACAO}<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows}</sheetData></worksheet>`;
  }

  private linha(valores: string[], numero: number): string {
    const celulas = valores.map((valor, indice) => this.celula(valor, indice, numero)).join('');
    return `<row r="${numero}">${celulas}</row>`;
  }

  private celula(valor: string, coluna: number, linha: number): string {
    const ref = `${letra(coluna)}${linha}`;
    return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${this.xml.escapar(valor)}</t></is></c>`;
  }
}

function utf8(xml: string): Uint8Array {
  return new TextEncoder().encode(xml);
}

function letra(indice: number): string {
  let numero = indice + 1;
  let texto = '';
  while (numero > 0) {
    const resto = (numero - 1) % 26;
    texto = String.fromCharCode(65 + resto) + texto;
    numero = Math.floor((numero - 1) / 26);
  }
  return texto;
}
