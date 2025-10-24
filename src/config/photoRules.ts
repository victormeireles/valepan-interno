/**
 * Configurações e regras para validação de fotos de produção
 */

/**
 * Lista de clientes que têm regras especiais de fotos
 * Para esses clientes, apenas fotos de pacote e pallet são obrigatórias
 * (foto de etiqueta é opcional)
 */
export const SPECIAL_PHOTO_CLIENTS = ['Da Casa', 'Damiao', 'Damião'] as const;

/**
 * Verifica se um cliente tem regras especiais de fotos
 * @param clienteName Nome do cliente a verificar
 * @returns true se o cliente tem regras especiais (apenas pacote e pallet obrigatórios)
 */
export function isSpecialPhotoClient(clienteName: string): boolean {
  return SPECIAL_PHOTO_CLIENTS
    .map(c => c.toLowerCase())
    .includes(clienteName.toLowerCase());
}


