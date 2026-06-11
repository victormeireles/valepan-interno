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
  await appendRows(spreadsheetId, tabName, [values]);
}

export async function appendRows(
  spreadsheetId: string,
  tabName: string,
  values: (string | number)[][],
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
        values,
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
