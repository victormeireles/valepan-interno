import { NextResponse } from 'next/server';
import { readSheetValues, updateCell } from '@/lib/googleSheets';
import { PEDIDOS_EMBALAGEM_CONFIG } from '@/config/embalagem';
import JsBarcode from 'jsbarcode';
import { createCanvas } from 'canvas';

interface GerarEtiquetaRequest {
  produto: string;
  dataFabricacao: string; // YYYY-MM-DD
  diasValidade: number;
  congelado: boolean;
  lote: number;
  rowId?: number;
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

async function getProdutoData(nomeProduto: string) {
  const spreadsheetId = process.env.NEXT_PUBLIC_PRODUTOS_SHEET_ID;
  if (!spreadsheetId) {
    throw new Error('ID da planilha de produtos não configurado');
  }

  const tabName = 'Produtos';
  const values = await readSheetValues(spreadsheetId, `${tabName}!A:F`);

  if (values.length < 3) {
    throw new Error('Planilha de produtos vazia ou sem dados');
  }

  const produtoRow = values.slice(2).find(row => {
    const produto = row[0]?.toString().trim();
    return produto && produto.toLowerCase() === nomeProduto.toLowerCase();
  });

  if (!produtoRow) {
    throw new Error('Produto não encontrado na planilha');
  }

  return {
    nome: produtoRow[0]?.toString().trim() || '',
    unidade: produtoRow[1]?.toString().trim() || '',
    codigoBarras: produtoRow[2]?.toString().trim() || '',
    unPorCaixa: parseFloat(produtoRow[3]?.toString().trim() || '0'),
    unPorPacote: parseFloat(produtoRow[4]?.toString().trim() || '0'),
    pesoLiquido: parseFloat(produtoRow[5]?.toString().trim() || '0'),
  };
}

function generateBarcodeBase64(code: string): string {
  try {
    const canvas = createCanvas(2, 1);
    JsBarcode(canvas, code, {
      format: code.length === 13 ? 'EAN13' : 'CODE128',
      width: 2,
      height: 80,
      displayValue: true,
      fontSize: 14,
      margin: 10,
    });
    return canvas.toDataURL();
  } catch (error) {
    console.error('Erro ao gerar código de barras:', error);
    return '';
  }
}

function generateEtiquetaHTML(data: {
  produto: string;
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
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Etiqueta - ${data.produto}</title>
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
      border: 2px solid #333;
      background: white;
      padding: 30px;
      display: flex;
      flex-direction: column;
      position: relative;
    }
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 20px;
    }
    
    .logo {
      width: 250px;
      height: auto;
    }
    
    .produto-section {
      flex: 1;
      text-align: right;
    }
    
    .produto-nome {
      font-size: 42px;
      font-weight: bold;
      color: #3F0313;
      line-height: 1.2;
      margin-bottom: 5px;
    }
    
    .congelado-badge {
      display: inline-block;
      background: #2563eb;
      color: white;
      padding: 6px 16px;
      border-radius: 20px;
      font-size: 18px;
      font-weight: bold;
      margin-top: 8px;
    }
    
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin: 30px 0;
    }
    
    .info-item {
      background: #f5f5f5;
      padding: 15px 20px;
      border-radius: 8px;
      border-left: 4px solid #C6A848;
    }
    
    .info-label {
      font-size: 14px;
      color: #666;
      font-weight: 600;
      margin-bottom: 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .info-value {
      font-size: 24px;
      color: #333;
      font-weight: bold;
    }
    
    .barcode-section {
      text-align: center;
      margin: 20px 0;
      padding: 20px;
      background: white;
      border: 2px solid #eee;
      border-radius: 8px;
    }
    
    .barcode-image {
      max-width: 100%;
      height: auto;
    }
    
    .footer {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 15px;
      margin-top: auto;
    }
    
    .footer-item {
      background: #3F0313;
      color: white;
      padding: 15px;
      border-radius: 8px;
      text-align: center;
    }
    
    .footer-label {
      font-size: 12px;
      opacity: 0.9;
      margin-bottom: 4px;
    }
    
    .footer-value {
      font-size: 20px;
      font-weight: bold;
    }
    
    @media print {
      body {
        background: white;
        padding: 0;
      }
      
      .etiqueta {
        border: none;
        page-break-after: always;
      }
    }
  </style>
</head>
<body>
  <div class="etiqueta">
    <div class="header">
      <img src="/logo-full-light.svg" alt="Valepan" class="logo">
      <div class="produto-section">
        <div class="produto-nome">${data.produto}</div>
        ${data.congelado ? '<span class="congelado-badge">❄️ CONGELADO</span>' : ''}
      </div>
    </div>
    
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">Data de Fabricação</div>
        <div class="info-value">${data.dataFabricacao}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Data de Validade</div>
        <div class="info-value">${data.dataValidade}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Lote</div>
        <div class="info-value">${data.lote}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Peso Líquido</div>
        <div class="info-value">${data.pesoLiquido.toFixed(2)} kg</div>
      </div>
    </div>
    
    ${data.barcodeImage ? `
    <div class="barcode-section">
      <img src="${data.barcodeImage}" alt="Código de Barras" class="barcode-image">
    </div>
    ` : ''}
    
    <div class="footer">
      <div class="footer-item">
        <div class="footer-label">Pães por Caixa</div>
        <div class="footer-value">${data.unPorCaixa}</div>
      </div>
      ${data.pacotesPorCaixa > 0 ? `
      <div class="footer-item">
        <div class="footer-label">Pacotes por Caixa</div>
        <div class="footer-value">${data.pacotesPorCaixa.toFixed(1)}</div>
      </div>
      ` : ''}
      <div class="footer-item">
        <div class="footer-label">Código</div>
        <div class="footer-value">${data.codigoBarras}</div>
      </div>
    </div>
  </div>
  
  <script>
    // Auto-print quando a página carregar (opcional)
    // window.onload = function() { window.print(); }
  </script>
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

    // Calcular valores
    const dataValidade = addDays(body.dataFabricacao, body.diasValidade);
    const pesoLiquidoTotal = produtoData.unPorCaixa * produtoData.pesoLiquido;
    const pacotesPorCaixa = produtoData.unPorPacote > 0 
      ? produtoData.unPorCaixa / produtoData.unPorPacote 
      : 0;

    // Gerar código de barras
    const barcodeImage = produtoData.codigoBarras 
      ? generateBarcodeBase64(produtoData.codigoBarras)
      : '';

    // Gerar HTML da etiqueta
    const html = generateEtiquetaHTML({
      produto: body.produto,
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
      await updateCell(spreadsheetId, tabName, body.rowId, 'N', 'Sim');
    }

    return NextResponse.json({ html });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('Erro ao gerar etiqueta:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


