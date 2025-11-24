import { google } from 'googleapis';
import { Readable } from 'stream';

// Configuração do Google Drive
const GOOGLE_DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

export interface PhotoUploadResult {
  photoUrl: string;
  photoId: string;
  fileName: string;
}

export interface PhotoInfo {
  photoUrl: string;
  photoId: string;
  fileName: string;
  uploadedAt: string;
}

/**
 * Gera o nome do arquivo baseado no rowId e tipo de foto
 */
function generateFileName(
  rowId: number,
  photoType:
    | 'pacote'
    | 'etiqueta'
    | 'pallet'
    | 'forno'
    | 'fermentacao'
    | 'resfriamento'
    | 'saida',
): string {
  return `${rowId}-${photoType.toUpperCase()}.jpg`;
}

/**
 * Gera o caminho da pasta baseado na data atual
 * Formato: /Valepan-Producao-Embalagem-Fotos/YYYYMM/YYYY-MM-DD/
 */
function generateFolderPath(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  
  const yearMonth = `${year}${month}`;
  const dateStr = `${year}-${month}-${day}`;
  
  return `${yearMonth}/${dateStr}`;
}

/**
 * Cria ou obtém a pasta do dia atual
 */
async function ensureDateFolder(): Promise<string> {
  if (!GOOGLE_DRIVE_FOLDER_ID) {
    throw new Error('GOOGLE_DRIVE_FOLDER_ID não configurado no .env.local');
  }
  
  const drive = await getGoogleDriveClient();
  const folderPath = generateFolderPath();
  const pathParts = folderPath.split('/');
  
  let currentFolderId = GOOGLE_DRIVE_FOLDER_ID;
  
  // Navegar/criar cada nível da pasta
  for (const folderName of pathParts) {
    try {
      // Buscar pasta existente
      const response = await drive.files.list({
        q: `'${currentFolderId}' in parents and name='${folderName}' and mimeType='application/vnd.google-apps.folder'`,
          fields: 'files(id, name)',
          includeItemsFromAllDrives: true,
          supportsAllDrives: true,
      });
      
      if (response.data.files && response.data.files.length > 0) {
        currentFolderId = response.data.files[0].id!;
      } else {
        // Criar pasta se não existir
        const folderResponse = await drive.files.create({
          requestBody: {
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [currentFolderId],
          },
            fields: 'id',
            supportsAllDrives: true,
        });
        
        currentFolderId = folderResponse.data.id!;
      }
    } catch {
      throw new Error(`Falha ao criar estrutura de pastas: ${folderName}`);
    }
  }
  
  return currentFolderId;
}

/**
 * Obtém cliente de autenticação do Google Drive
 */
async function getGoogleDriveAuth() {
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
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/drive'
    ],
  });

  return authClient;
}

/**
 * Obtém cliente do Google Drive
 */
export async function getGoogleDriveClient() {
  const auth = await getGoogleDriveAuth();
  return google.drive({ version: 'v3', auth });
}

/**
 * Faz upload de uma foto para o Google Drive
 */
export async function uploadPhotoToDrive(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  rowId: number,
  photoType:
    | 'pacote'
    | 'etiqueta'
    | 'pallet'
    | 'forno'
    | 'fermentacao'
    | 'resfriamento'
    | 'saida',
): Promise<PhotoUploadResult> {
  try {
    const drive = await getGoogleDriveClient();
    const folderId = await ensureDateFolder();
    const finalFileName = generateFileName(rowId, photoType);
    
    // Upload do arquivo
    const response = await drive.files.create({
      requestBody: {
        name: finalFileName,
        parents: [folderId],
      },
      media: {
        mimeType,
        // O SDK do Drive espera um stream; convertemos o Buffer para stream
        body: Readable.from(fileBuffer),
      },
      fields: 'id, webViewLink',
      supportsAllDrives: true,
    });
    
    if (!response.data.id) {
      throw new Error('Falha ao obter ID do arquivo após upload');
    }
    
    // Não precisamos definir permissões públicas se a pasta pai já permite acesso
    // O arquivo herdará as permissões da pasta pai (Shared Drive)
    
    // Gerar URL no formato solicitado: https://drive.google.com/file/d/[ID_DO_ARQUIVO]/view
    const photoUrl = `https://drive.google.com/file/d/${response.data.id}/view`;
    
    return {
      photoUrl,
      photoId: response.data.id,
      fileName: finalFileName,
    };
  } catch {
    throw new Error('Falha ao fazer upload da foto para o Google Drive');
  }
}

/**
 * Deleta uma foto do Google Drive
 */
export async function deletePhotoFromDrive(photoId: string): Promise<void> {
  try {
    const drive = await getGoogleDriveClient();
    
    await drive.files.delete({
      fileId: photoId,
      supportsAllDrives: true,
    });
  } catch {
    throw new Error('Falha ao deletar foto do Google Drive');
  }
}

/**
 * Obtém informações de uma foto
 */
export async function getPhotoInfo(photoId: string): Promise<PhotoInfo | null> {
  try {
    const drive = await getGoogleDriveClient();
    
    const response = await drive.files.get({
      fileId: photoId,
      fields: 'id, name, webViewLink, createdTime',
      supportsAllDrives: true,
    });
    
    if (!response.data.id) {
      return null;
    }
    
    const photoUrl = `https://drive.google.com/file/d/${response.data.id}/view`;
    
    return {
      photoUrl,
      photoId: response.data.id,
      fileName: response.data.name || 'unknown',
      uploadedAt: response.data.createdTime || new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

/**
 * Lista fotos de um período específico (para limpeza)
 */
export async function listPhotosInPeriod(startDate: Date, endDate: Date): Promise<PhotoInfo[]> {
  try {
    if (!GOOGLE_DRIVE_FOLDER_ID) {
      throw new Error('GOOGLE_DRIVE_FOLDER_ID não configurado no .env.local');
    }
    
    const drive = await getGoogleDriveClient();
    
    // Buscar todas as pastas de data no período
    const yearMonth = `${startDate.getFullYear()}${String(startDate.getMonth() + 1).padStart(2, '0')}`;
    
    const response = await drive.files.list({
      q: `'${GOOGLE_DRIVE_FOLDER_ID}' in parents and name='${yearMonth}' and mimeType='application/vnd.google-apps.folder'`,
      fields: 'files(id, name)',
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
    });
    
    if (!response.data.files || response.data.files.length === 0) {
      return [];
    }
    
    const monthFolderId = response.data.files[0].id!;
    
    // Buscar pastas de dias no mês
    const dayFoldersResponse = await drive.files.list({
      q: `'${monthFolderId}' in parents and mimeType='application/vnd.google-apps.folder'`,
      fields: 'files(id, name)',
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
    });
    
    const photos: PhotoInfo[] = [];
    
    for (const folder of dayFoldersResponse.data.files || []) {
      const folderDate = new Date(folder.name!);
      if (folderDate >= startDate && folderDate <= endDate) {
        // Buscar fotos na pasta do dia
        const photosResponse = await drive.files.list({
          q: `'${folder.id}' in parents and mimeType contains 'image/'`,
          fields: 'files(id, name, createdTime)',
          includeItemsFromAllDrives: true,
          supportsAllDrives: true,
        });
        
        for (const photo of photosResponse.data.files || []) {
          photos.push({
            photoUrl: `https://drive.google.com/file/d/${photo.id}/view`,
            photoId: photo.id!,
            fileName: photo.name || 'unknown',
            uploadedAt: photo.createdTime || new Date().toISOString(),
          });
        }
      }
    }
    
    return photos;
  } catch {
    return [];
  }
}
