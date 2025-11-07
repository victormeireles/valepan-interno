import { NextResponse } from 'next/server';
import { readSheetValues, updateCell } from '@/lib/googleSheets';
import { PEDIDOS_EMBALAGEM_CONFIG } from '@/config/embalagem';
import fs from 'fs';
import path from 'path';

interface GerarEtiquetaRequest {
  produto: string;
  dataFabricacao: string; // YYYY-MM-DD
  diasValidade: number;
  congelado: boolean;
  lote: number;
  rowId?: number;
  nomeEtiqueta?: string;
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr + 'T00:00:00');
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatPesoLiquido(peso: number): string {
  // Arredondar para número inteiro (sem casas decimais)
  const pesoInteiro = Math.round(peso);
  
  // Formatar com separador de milhar usando ponto
  return pesoInteiro.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

async function getProdutoData(nomeProduto: string) {
  const spreadsheetId = process.env.NEXT_PUBLIC_PRODUTOS_SHEET_ID;
  if (!spreadsheetId) {
    throw new Error('ID da planilha de produtos não configurado');
  }

  const tabName = 'Produtos';
  // Ler todas as colunas possíveis (até Z pelo menos)
  const values = await readSheetValues(spreadsheetId, `${tabName}!A:Z`);

  if (values.length < 3) {
    throw new Error('Planilha de produtos vazia ou sem dados');
  }

  // Cabeçalhos estão na linha 2 (índice 1)
  const headers = values[1] || [];

  // Buscar índices das colunas pelos nomes dos cabeçalhos
  const findColumnIndex = (searchTerms: string[]): number => {
    return headers.findIndex((h: string) => {
      if (!h) return false;
      const headerLower = h.toString().trim().toLowerCase();
      return searchTerms.some(term => headerLower === term.toLowerCase() || headerLower.includes(term.toLowerCase()));
    });
  };

  const produtoColIdx = findColumnIndex(['Produto']);
  const codigoBarrasColIdx = findColumnIndex(['Código de Barras', 'Codigo de Barras']);
  const unCaixaColIdx = findColumnIndex(['UN Caixa', 'UN Caixa']);
  const unPacoteColIdx = findColumnIndex(['UN Pacote', 'UN Pacote']);
  const pesoLiquidoColIdx = findColumnIndex(['Peso Líquido', 'Peso Liquido']);

  if (produtoColIdx < 0) {
    throw new Error('Coluna "Produto" não encontrada na planilha');
  }

  // Buscar linha do produto
  const produtoRow = values.slice(2).find(row => {
    const produto = row[produtoColIdx]?.toString().trim();
    return produto && produto.toLowerCase() === nomeProduto.toLowerCase();
  });

  if (!produtoRow) {
    throw new Error('Produto não encontrado na planilha');
  }

  // Função helper para parse seguro
  const parseSafe = (val: string | undefined | null): number => {
    if (!val) return 0;
    const str = val.toString().trim().replace(',', '.');
    const parsed = parseFloat(str);
    return isNaN(parsed) ? 0 : parsed;
  };

  const result = {
    nome: produtoRow[produtoColIdx]?.toString().trim() || '',
    unidade: produtoRow[1]?.toString().trim() || '', // Manter unidade da coluna B se existir
    codigoBarras: codigoBarrasColIdx >= 0 ? (produtoRow[codigoBarrasColIdx]?.toString().trim() || '') : '',
    unPorCaixa: unCaixaColIdx >= 0 ? parseSafe(produtoRow[unCaixaColIdx]) : 0,
    unPorPacote: unPacoteColIdx >= 0 ? parseSafe(produtoRow[unPacoteColIdx]) : 0,
    pesoLiquido: pesoLiquidoColIdx >= 0 ? parseSafe(produtoRow[pesoLiquidoColIdx]) : 0,
  };
  
  return result;
}

async function generateBarcodeBase64(code: string): Promise<string> {
  try {
    // Importação dinâmica para funcionar na Vercel
    const { createCanvas } = await import('canvas');
    const JsBarcode = (await import('jsbarcode')).default;
    
    const canvas = createCanvas(4, 1);
    // displayValue: false para evitar problemas de fonte em produção
    // O número será renderizado manualmente no HTML
    JsBarcode(canvas, code, {
      format: code.length === 13 ? 'EAN13' : 'CODE128',
      width: 4,
      height: 140,
      displayValue: false, // Desabilitado - número renderizado manualmente
      margin: 18,
    });
    return canvas.toDataURL();
  } catch {
    return '';
  }
}

function getLogoSVG(): string {
  try {
    // Tentar ler o arquivo SVG da pasta public
    const svgPath = path.join(process.cwd(), 'public', 'logo-full-light.svg');
    let svgContent = fs.readFileSync(svgPath, 'utf-8');
    
    // Extrair width e height originais ANTES de removê-los
    const widthMatch = svgContent.match(/width\s*=\s*["'](\d+(?:\.\d+)?)/i);
    const heightMatch = svgContent.match(/height\s*=\s*["'](\d+(?:\.\d+)?)/i);
    
    const originalWidth = widthMatch ? widthMatch[1] : '422';
    const originalHeight = heightMatch ? heightMatch[1] : '301';
    
    // Adicionar viewBox se não existir (necessário para scaling correto)
    if (!svgContent.includes('viewBox')) {
      svgContent = svgContent.replace(
        /<svg([^>]*)>/i,
        `<svg$1 viewBox="0 0 ${originalWidth} ${originalHeight}">`
      );
    }
    
    // Remover width e height fixos para permitir redimensionamento via CSS
    svgContent = svgContent.replace(/(<svg[^>]*)\s+width\s*=\s*["'][^"']*["']/gi, '$1');
    svgContent = svgContent.replace(/(<svg[^>]*)\s+height\s*=\s*["'][^"']*["']/gi, '$1');
    
    // Adicionar preserveAspectRatio se não existir (garante que não corte)
    if (!svgContent.includes('preserveAspectRatio')) {
      svgContent = svgContent.replace(
        /<svg([^>]*)>/i,
        '<svg$1 preserveAspectRatio="xMidYMid meet">'
      );
    }
    
    return svgContent;
  } catch {
    // Fallback: retornar SVG vazio ou texto
    return '';
  }
}

function generateEtiquetaHTML(data: {
  nomeEtiqueta: string;
  congelado: boolean;
  dataFabricacao: string;
  dataValidade: string;
  lote: number;
  codigoBarras: string;
  barcodeImage: string;
  pesoLiquido: number;
  unPorCaixa: number;
  pacotesPorCaixa: number;
}): string {
  const logoSVG = getLogoSVG();
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Etiqueta - ${data.nomeEtiqueta}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Arial', sans-serif;
      background: white;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      padding: 20px;
    }
    
    .etiqueta {
      width: 900px;
      height: 600px;
      border: 1px solid #000;
      background: white;
      padding: 20px;
      display: flex;
      flex-direction: column;
      color: #000;
    }
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 35px;
    }
    
    .logo-section {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
    }
    
    .logo-container {
      width: 220px;
      height: 160px;
      display: flex;
      align-items: center;
      justify-content: flex-start;
      overflow: visible;
      position: relative;
    }
    
    .logo-container svg {
      width: 100%;
      height: 100%;
      max-width: 220px;
      max-height: 160px;
      filter: brightness(0);
      display: block;
    }
    
    .logo-container svg path {
      fill: #000 !important;
      stroke: #000 !important;
    }
    
    .brand-name {
      font-size: 18px;
      font-weight: bold;
      color: #000;
      text-transform: uppercase;
    }
    
    .produto-section {
      flex: 1;
      text-align: right;
    }
    
    .produto-nome {
      font-size: 30px;
      font-weight: bold;
      color: #000;
      line-height: 1.3;
      margin-bottom: 10px;
      text-transform: uppercase;
    }
    
    .congelado-text {
      font-size: 20px;
      color: #000;
      margin-top: 10px;
    }
    
    .produto-desc {
      font-size: 14px;
      color: #000;
      margin-top: 3px;
      font-style: italic;
    }
    
    .info-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 25px;
      margin: 30px 0;
    }
    
    .info-item {
      padding: 8px;
      background: white;
    }
    
    .info-label {
      font-size: 17px;
      color: #000;
      font-weight: 600;
      margin-bottom: 12px;
      text-transform: uppercase;
    }
    
    .info-value {
      font-size: 48px;
      color: #000;
      font-weight: bold;
    }
    
    .bottom-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin: 35px 0;
      gap: 40px;
    }
    
    .bottom-col-1 {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    
    .bottom-col-1 .info-item {
      display: flex;
      align-items: baseline;
      gap: 10px;
      padding: 0;
    }
    
    .bottom-col-1 .info-label {
      margin-bottom: 0;
      white-space: nowrap;
      font-size: 17px;
    }
    
    .bottom-col-1 .info-value {
      font-size: 32px;
    }
    
    .bottom-col-2 {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
    }
    
    .barcode-image {
      max-width: 100%;
      height: 120px;
      display: block;
      margin: 0 auto;
    }
    
    .barcode-number {
      font-size: 28px;
      color: #000;
      margin-top: 15px;
      letter-spacing: 2px;
      font-weight: bold;
    }
    
    @page {
      size: 900px 600px;
      margin: 0;
    }
    
    @media print {
      * {
        margin: 0;
        padding: 0;
      }
      
      html, body {
        width: 900px;
        height: 600px;
        margin: 0;
        padding: 0;
        overflow: hidden;
        background: white;
        display: flex;
        justify-content: center;
        align-items: center;
      }
      
      .etiqueta {
        width: 900px;
        height: 600px;
        border: 1px solid #000;
        margin: 0;
        padding: 20px;
        page-break-after: always;
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="etiqueta">
    <div class="header">
      <div class="logo-section">
        ${logoSVG ? `<div class="logo-container">${logoSVG}</div>` : '<div class="brand-name">VALEPAN</div>'}
      </div>
      <div class="produto-section">
        <div class="produto-nome">${data.nomeEtiqueta}</div>
        ${data.congelado ? '<div class="congelado-text">Congelado</div>' : ''}
      </div>
    </div>
    
    <div class="info-row">
      <div class="info-item">
        <div class="info-label">FAB:</div>
        <div class="info-value">${data.dataFabricacao}</div>
      </div>
      <div class="info-item">
        <div class="info-label">VAL:</div>
        <div class="info-value">${data.dataValidade}</div>
      </div>
      <div class="info-item">
        <div class="info-label">LOTE</div>
        <div class="info-value">${data.lote}</div>
      </div>
    </div>
    
    <div class="bottom-row">
      <div class="bottom-col-1">
        <div class="info-item">
          <div class="info-label">Peso Líquido:</div>
          <div class="info-value">${formatPesoLiquido(data.pesoLiquido)} kg</div>
        </div>
        <div class="info-item">
          <div class="info-label">Pães por Caixa</div>
          <div class="info-value">${data.unPorCaixa}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Pacotes por Caixa</div>
          <div class="info-value">${data.pacotesPorCaixa > 0 ? data.pacotesPorCaixa.toFixed(0) : '0'}</div>
        </div>
      </div>
      ${data.barcodeImage ? `
      <div class="bottom-col-2">
        <img src="${data.barcodeImage}" alt="Código de Barras" class="barcode-image">
        <div class="barcode-number">${data.codigoBarras}</div>
      </div>
      ` : ''}
    </div>
  </div>
</body>
</html>`;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as GerarEtiquetaRequest;
    
    if (!body.produto || !body.dataFabricacao || !body.lote) {
      return NextResponse.json(
        { error: 'Dados obrigatórios ausentes' },
        { status: 400 }
      );
    }

    // Buscar dados do produto
    const produtoData = await getProdutoData(body.produto);

    const nomeEtiqueta = body.nomeEtiqueta?.trim() || body.produto;

    // Calcular valores
    const dataValidade = addDays(body.dataFabricacao, body.diasValidade);
    
    const pesoLiquidoTotal = produtoData.unPorCaixa * produtoData.pesoLiquido;
    
    const pacotesPorCaixa = produtoData.unPorPacote > 0 
      ? produtoData.unPorCaixa / produtoData.unPorPacote 
      : 0;

    // Gerar código de barras
    const barcodeImage = produtoData.codigoBarras 
      ? await generateBarcodeBase64(produtoData.codigoBarras)
      : '';

    // Gerar HTML da etiqueta
    const html = generateEtiquetaHTML({
      nomeEtiqueta,
      congelado: body.congelado,
      dataFabricacao: formatDate(body.dataFabricacao),
      dataValidade: formatDate(dataValidade),
      lote: body.lote,
      codigoBarras: produtoData.codigoBarras,
      barcodeImage,
      pesoLiquido: pesoLiquidoTotal,
      unPorCaixa: produtoData.unPorCaixa,
      pacotesPorCaixa,
    });

    // Marcar etiqueta como gerada na planilha
    if (body.rowId) {
      const { spreadsheetId, tabName } = PEDIDOS_EMBALAGEM_CONFIG.destinoPedidos;
      await updateCell(spreadsheetId, tabName, body.rowId, 'AB', 'Sim'); // Coluna AB = Etiqueta Gerada
    }

    return NextResponse.json({ html });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
