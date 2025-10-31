import { google } from 'googleapis';

// Erro específico para quando não há acesso à planilha
export class AccessDeniedError extends Error {
  public readonly email: string;
  public readonly sheetUrl?: string;

  constructor(message: string, email: string, sheetUrl?: string) {
    super(message);
    this.name = 'AccessDeniedError';
    this.email = email;
    this.sheetUrl = sheetUrl;
  }
}

// Função para autenticar com Google Sheets usando Service Account
export async function getGoogleSheetsClient() {
  const clientEmail = process.env.GOOGLE_SA_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_SA_PRIVATE_KEY;
  
  if (!clientEmail || !privateKey) {
    throw new Error('Credenciais da Service Account não configuradas');
  }

  const authClient = new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey.replace(/\\n/g, '\n'),
    },
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets.readonly',
      'https://www.googleapis.com/auth/spreadsheets'
    ],
  });

  return google.sheets({ version: 'v4', auth: authClient });
}

// Função para ler valores de uma planilha
export async function readSheetValues(
  spreadsheetId: string, 
  range: string
): Promise<string[][]> {
  const sheets = await getGoogleSheetsClient();
  
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    return response.data.values || [];
  } catch (error) {
    const getMessage = (e: unknown): string => (e instanceof Error ? (e.message ?? '') : '');
    const msg = getMessage(error).toLowerCase();

    // Falta de permissão à planilha
    const isPermissionError =
      msg.includes('permission') ||
      msg.includes('insufficient permissions') ||
      msg.includes('permission_denied') ||
      msg.includes('caller does not have permission') ||
      msg.includes('request had insufficient authentication scopes');

    if (isPermissionError) {
      const authEmail = process.env.GOOGLE_SA_CLIENT_EMAIL || '';
      throw new AccessDeniedError(
        'Acesso à planilha necessário',
        authEmail,
        `https://docs.google.com/spreadsheets/d/${spreadsheetId}`
      );
    }

    throw error;
  }
}

// Função para adicionar uma linha no final de uma planilha
export async function appendRow(
  spreadsheetId: string,
  tabName: string,
  values: (string | number)[]
): Promise<void> {
  const sheets = await getGoogleSheetsClient();
  
  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${tabName}!A:Z`, // Range amplo para capturar todas as colunas
      // USER_ENTERED faz o Google Sheets interpretar datas e números
      // evitando que datas sejam gravadas como texto com aspa inicial
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [values]
      }
    });
  } catch (error) {
    const getMessage = (e: unknown): string => (e instanceof Error ? (e.message ?? '') : '');
    const msg = getMessage(error).toLowerCase();

    // Falta de permissão à planilha
    const isPermissionError =
      msg.includes('permission') ||
      msg.includes('insufficient permissions') ||
      msg.includes('permission_denied') ||
      msg.includes('caller does not have permission') ||
      msg.includes('request had insufficient authentication scopes');

    if (isPermissionError) {
      const authEmail = process.env.GOOGLE_SA_CLIENT_EMAIL || '';
      throw new AccessDeniedError(
        'Acesso à planilha necessário',
        authEmail,
        `https://docs.google.com/spreadsheets/d/${spreadsheetId}`
      );
    }

    throw error;
  }
}

// Função para extrair opções de uma coluna específica
export async function getColumnOptions(
  spreadsheetId: string,
  tabName: string,
  column: string,
  headerRow: number = 1
): Promise<string[]> {
  const values = await readSheetValues(spreadsheetId, `${tabName}!${column}:${column}`);
  
  // Remover cabeçalho e valores vazios, retornar valores únicos
  const options = values
    .slice(headerRow) // Remove linhas de cabeçalho (1 = linha 1, 2 = linha 2, etc.)
    .map(row => row[0]?.toString().trim())
    .filter((value): value is string => Boolean(value && value.length > 0));
  
  return [...new Set(options)]; // Remove duplicatas
}

// Função para extrair produtos com suas unidades padrão
export async function getProductsWithUnits(
  spreadsheetId: string,
  tabName: string,
  productColumn: string,
  unitColumn: string,
  headerRow: number = 1
): Promise<{ produto: string; unidade: string }[]> {
  const values = await readSheetValues(spreadsheetId, `${tabName}!${productColumn}:${unitColumn}`);
  
  // Remover cabeçalho e valores vazios
  const products = values
    .slice(headerRow) // Remove linhas de cabeçalho
    .map(row => ({
      produto: row[0]?.toString().trim() || '',
      unidade: row[1]?.toString().trim() || ''
    }))
    .filter(item => item.produto && item.unidade);
  
  // Remover duplicatas baseado no nome do produto
  const uniqueProducts = products.reduce((acc, current) => {
    const existing = acc.find(item => item.produto === current.produto);
    if (!existing) {
      acc.push(current);
    }
    return acc;
  }, [] as { produto: string; unidade: string }[]);
  
  return uniqueProducts;
}

// Função para deletar uma linha específica
export async function deleteSheetRow(
  spreadsheetId: string,
  tabName: string,
  rowNumber: number
): Promise<void> {
  const sheets = await getGoogleSheetsClient();
  
  try {
    // Primeiro, obter o ID da aba
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const sheet = spreadsheet.data.sheets?.find(s => s.properties?.title === tabName);
    
    if (!sheet?.properties?.sheetId) {
      throw new Error(`Aba "${tabName}" não encontrada`);
    }

    // Deletar a linha usando batchUpdate
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{
          deleteDimension: {
            range: {
              sheetId: sheet.properties.sheetId,
              dimension: 'ROWS',
              startIndex: rowNumber - 1, // Google Sheets usa índice baseado em 0
              endIndex: rowNumber
            }
          }
        }]
      }
    });
  } catch (error) {
    const getMessage = (e: unknown): string => (e instanceof Error ? (e.message ?? '') : '');
    const msg = getMessage(error).toLowerCase();

    // Falta de permissão à planilha
    const isPermissionError =
      msg.includes('permission') ||
      msg.includes('insufficient permissions') ||
      msg.includes('permission_denied') ||
      msg.includes('caller does not have permission') ||
      msg.includes('request had insufficient authentication scopes');

    if (isPermissionError) {
      const authEmail = process.env.GOOGLE_SA_CLIENT_EMAIL || '';
      throw new AccessDeniedError(
        'Acesso à planilha necessário',
        authEmail,
        `https://docs.google.com/spreadsheets/d/${spreadsheetId}`
      );
    }

    throw error;
  }
}

// Função para atualizar uma célula específica
export async function updateCell(
  spreadsheetId: string,
  tabName: string,
  row: number,
  column: string,
  value: string | number
): Promise<void> {
  const sheets = await getGoogleSheetsClient();
  
  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${tabName}!${column}${row}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[value]]
      }
    });
  } catch (error) {
    const getMessage = (e: unknown): string => (e instanceof Error ? (e.message ?? '') : '');
    const msg = getMessage(error).toLowerCase();

    const isPermissionError =
      msg.includes('permission') ||
      msg.includes('insufficient permissions') ||
      msg.includes('permission_denied') ||
      msg.includes('caller does not have permission') ||
      msg.includes('request had insufficient authentication scopes');

    if (isPermissionError) {
      const authEmail = process.env.GOOGLE_SA_CLIENT_EMAIL || '';
      throw new AccessDeniedError(
        'Acesso à planilha necessário',
        authEmail,
        `https://docs.google.com/spreadsheets/d/${spreadsheetId}`
      );
    }

    throw error;
  }
}

// Função para obter o último lote usado em uma planilha
export async function getLastLote(
  spreadsheetId: string,
  tabName: string,
  loteColumn: string
): Promise<number> {
  const values = await readSheetValues(spreadsheetId, `${tabName}!${loteColumn}:${loteColumn}`);
  
  // Começar da linha 2 (pular cabeçalho) e buscar o maior número
  const lotes = values
    .slice(1) // Pula cabeçalho
    .map(row => {
      const val = row[0]?.toString().trim();
      return val ? parseInt(val, 10) : 0;
    })
    .filter(num => !isNaN(num) && num > 0);
  
  // Retornar o maior lote encontrado, ou 0 se não houver nenhum
  return lotes.length > 0 ? Math.max(...lotes) : 0;
}