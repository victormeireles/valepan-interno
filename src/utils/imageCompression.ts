/**
 * Comprime uma imagem para reduzir seu tamanho mantendo qualidade aceitável
 */
export async function compressImage(file: File, maxSizeMB: number = 4): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        // Criar canvas para redimensionar
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Não foi possível criar contexto do canvas'));
          return;
        }
        
        // Calcular dimensões máximas (manter proporção)
        let width = img.width;
        let height = img.height;
        const maxDimension = 1920; // Máximo 1920px no lado maior
        
        if (width > height && width > maxDimension) {
          height = (height * maxDimension) / width;
          width = maxDimension;
        } else if (height > maxDimension) {
          width = (width * maxDimension) / height;
          height = maxDimension;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Desenhar imagem redimensionada
        ctx.drawImage(img, 0, 0, width, height);
        
        // Converter para Blob com qualidade ajustada
        let quality = 0.9;
        const tryCompress = () => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Erro ao comprimir imagem'));
                return;
              }
              
              const compressedSizeMB = blob.size / (1024 * 1024);
              
              // Se ainda está muito grande e qualidade pode ser reduzida
              if (compressedSizeMB > maxSizeMB && quality > 0.5) {
                quality -= 0.1;
                tryCompress();
                return;
              }
              
              // Criar novo File a partir do Blob
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              
              resolve(compressedFile);
            },
            'image/jpeg',
            quality
          );
        };
        
        tryCompress();
      };
      
      img.onerror = () => {
        reject(new Error('Erro ao carregar imagem'));
      };
      
      img.src = e.target?.result as string;
    };
    
    reader.onerror = () => {
      reject(new Error('Erro ao ler arquivo'));
    };
    
    reader.readAsDataURL(file);
  });
}
