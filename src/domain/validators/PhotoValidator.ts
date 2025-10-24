import { ProducaoData } from '@/domain/types';
import { isSpecialPhotoClient } from '@/config/photoRules';

export type PhotoFiles = {
  pacote: File | null;
  etiqueta: File | null;
  pallet: File | null;
};

export type ValidationResult = {
  isValid: boolean;
  missingPhotos: string[];
  errorMessage: string | null;
};

/**
 * Validador de fotos de produção
 * Responsável por verificar se todas as fotos obrigatórias foram fornecidas
 */
export class PhotoValidator {
  private readonly formData: ProducaoData;
  private readonly photoFiles: PhotoFiles;
  private readonly cliente: string;
  
  constructor(formData: ProducaoData, photoFiles: PhotoFiles, cliente: string) {
    this.formData = formData;
    this.photoFiles = photoFiles;
    this.cliente = cliente;
  }
  
  /**
   * Valida se todas as fotos obrigatórias estão presentes
   * @returns Resultado da validação com lista de fotos faltantes
   */
  validate(): ValidationResult {
    const missingPhotos: string[] = [];
    const isSpecialClient = isSpecialPhotoClient(this.cliente);
    
    // Verificar foto do pacote (obrigatória para todos)
    if (!this.hasPackagePhoto()) {
      missingPhotos.push('Foto do Pacote 📦');
    }
    
    // Verificar foto da etiqueta (apenas para clientes normais)
    if (!isSpecialClient && !this.hasLabelPhoto()) {
      missingPhotos.push('Foto da Etiqueta 🏷️');
    }
    
    // Verificar foto do pallet (obrigatória para todos)
    if (!this.hasPalletPhoto()) {
      missingPhotos.push('Foto do Pallet 🚛');
    }
    
    return {
      isValid: missingPhotos.length === 0,
      missingPhotos,
      errorMessage: this.buildErrorMessage(missingPhotos),
    };
  }
  
  /**
   * Verifica se existe foto do pacote (já salva ou nova selecionada)
   */
  private hasPackagePhoto(): boolean {
    return Boolean(this.formData.pacoteFotoUrl || this.photoFiles.pacote);
  }
  
  /**
   * Verifica se existe foto da etiqueta (já salva ou nova selecionada)
   */
  private hasLabelPhoto(): boolean {
    return Boolean(this.formData.etiquetaFotoUrl || this.photoFiles.etiqueta);
  }
  
  /**
   * Verifica se existe foto do pallet (já salva ou nova selecionada)
   */
  private hasPalletPhoto(): boolean {
    return Boolean(this.formData.palletFotoUrl || this.photoFiles.pallet);
  }
  
  /**
   * Constrói a mensagem de erro formatada
   */
  private buildErrorMessage(missingPhotos: string[]): string | null {
    if (missingPhotos.length === 0) {
      return null;
    }
    
    const photosList = missingPhotos
      .map((photo, index) => `${index + 1}. ${photo}`)
      .join('\n');
    
    return `Você não preencheu as seguintes fotos obrigatórias:\n\n${photosList}\n\nPor favor, adicione todas as fotos antes de salvar.`;
  }
}

