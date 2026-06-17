import { NextResponse } from 'next/server';
import { SupabaseProductService } from '@/lib/services/products/supabase-product-service';
import { tiposEstoqueService } from '@/lib/services/tipos-estoque-service';
import fs from 'fs';
import path from 'path';

interface GerarEtiquetaRequest {
  produto: string;
  dataFabricacao: string; // YYYY-MM-DD
  diasValidade: number;
  diasValidadeCongelado: number;
  congelado: boolean;
  mostrarTextoCongelado: boolean;
  lote: number;
  cliente?: string;
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

const productService = new SupabaseProductService();

async function getProdutoData(nomeProduto: string) {
  const product = await productService.findByName(nomeProduto);
  if (!product) {
    throw new Error('Produto não encontrado');
  }

  return {
    nome: product.nome,
    unidade: product.unidadeNomeResumido || '',
    codigoBarras: product.unitBarcode || '',
    unPorCaixa: product.boxUnits ?? 0,
    unPorPacote: product.packageUnits ?? 0,
    pesoLiquido: product.unitWeight ?? 0,
  };
}

async function generateBarcodeBase64(code: string): Promise<string> {
  if (!code || code.trim() === '') {
    return '';
  }

  try {
    // Importação dinâmica para funcionar na Vercel
    const { createCanvas } = await import('canvas');
    const JsBarcode = (await import('jsbarcode')).default;
    
    const canvas = createCanvas(4, 1);
    
    // Sempre usar CODE128 para aceitar qualquer código sem validação
    // CODE128 é mais flexível e não requer validação de checksum
    JsBarcode(canvas, code, {
      format: 'CODE128',
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
  dataFabricacao: string;
  dataValidade: string;
  mostrarTextoCongelado: boolean;
  congelado: boolean;
  diasValidade: number;
  diasValidadeCongelado: number;
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
      margin-bottom: 15px;
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
      font-weight: 600;
    }
    
    .lote-text {
      font-size: 20px;
      color: #000;
      margin-top: 5px;
      font-weight: 600;
    }
    
    .produto-desc {
      font-size: 14px;
      color: #000;
      margin-top: 3px;
      font-style: italic;
    }
    
    .info-row {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 25px;
      margin: 10px 0 10px 0;
    }
    
    .info-row-3 {
      grid-template-columns: repeat(3, 1fr);
    }
    
    .info-item {
      padding: 8px;
      background: white;
    }
    
    .info-label {
      font-size: 15px;
      color: #000;
      font-weight: 600;
      margin-bottom: 12px;
      text-transform: uppercase;
      line-height: 1.3;
      min-height: 2.6em;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
    }
    
    .info-label-line {
      line-height: 1.2;
    }
    
    .info-value {
      font-size: 48px;
      color: #000;
      font-weight: bold;
    }
    
    .info-subvalue {
      margin-top: 6px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    
    .info-subvalue-label {
      font-size: 14px;
      color: #000;
      font-weight: 600;
      line-height: 1.2;
      text-transform: uppercase;
    }
    
    .info-subvalue-days {
      font-size: 28px;
      color: #000;
      font-weight: bold;
      line-height: 1.1;
      letter-spacing: 1px;
      text-transform: uppercase;
    }
    
    .bottom-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin: 10px 0 0 0;
      gap: 30px;
    }
    
    .bottom-col-1 {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 8px;
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
      height: 110px;
      display: block;
      margin: 0 auto;
    }
    
    .barcode-number {
      font-size: 28px;
      color: #000;
      margin-top: 6px;
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
        ${data.mostrarTextoCongelado ? '<div class="congelado-text">CONGELADO</div>' : ''}
        <div class="lote-text">LOTE ${data.lote}</div>
      </div>
    </div>
    
    ${data.congelado ? `
    <div class="info-row">
      <div class="info-item">
        <div class="info-label">
          <div class="info-label-line">&nbsp;</div>
          <div class="info-label-line">FABRICAÇÃO:</div>
        </div>
        <div class="info-value">${data.dataFabricacao}</div>
      </div>
      <div class="info-item">
        <div class="info-label">
          <div class="info-label-line">VALIDADE:</div>
          <div class="info-label-line">&nbsp;</div>
        </div>
        <div class="info-value">${data.dataValidade}</div>
      </div>
    </div>
    ` : `
    <div class="info-row info-row-3">
      <div class="info-item">
        <div class="info-label">
          <div class="info-label-line">&nbsp;</div>
          <div class="info-label-line">FABRICAÇÃO:</div>
        </div>
        <div class="info-value">${data.dataFabricacao}</div>
      </div>
      <div class="info-item">
        <div class="info-label">
          <div class="info-label-line">VALIDADE</div>
          <div class="info-label-line">TEMPERATURA AMBIENTE</div>
        </div>
        <div class="info-value">${data.diasValidade} DIAS</div>
      </div>
      <div class="info-item">
        <div class="info-label">
          <div class="info-label-line">VALIDADE</div>
          <div class="info-label-line">CONGELADO</div>
        </div>
        <div class="info-value">${data.diasValidadeCongelado} DIAS</div>
        <div class="info-subvalue">
          <div class="info-subvalue-label">APÓS DESCONGELAR</div>
          <div class="info-subvalue-days">5 DIAS</div>
        </div>
      </div>
    </div>
    `}
    
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

    let congelado = Boolean(body.congelado);
    if (body.cliente?.trim()) {
      const tipo = await tiposEstoqueService.findByName(body.cliente.trim());
      if (tipo) {
        congelado = tipo.congelado;
      }
    }

    // Calcular valores
    // Se for congelado, usa diasValidadeCongelado, senão usa diasValidade
    const dataValidade = congelado
      ? addDays(body.dataFabricacao, body.diasValidadeCongelado)
      : addDays(body.dataFabricacao, body.diasValidade);
    
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
      dataFabricacao: formatDate(body.dataFabricacao),
      dataValidade: formatDate(dataValidade),
      mostrarTextoCongelado: body.mostrarTextoCongelado,
      congelado,
      diasValidade: body.diasValidade,
      diasValidadeCongelado: body.diasValidadeCongelado,
      lote: body.lote,
      codigoBarras: produtoData.codigoBarras,
      barcodeImage,
      pesoLiquido: pesoLiquidoTotal,
      unPorCaixa: produtoData.unPorCaixa,
      pacotesPorCaixa,
    });

    return NextResponse.json({ html });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
