import { z } from "zod";

/**
 * WhatsApp Validators
 * Validações para telefone brasileiro
 */

/**
 * Formata telefone para padrão brasileiro com DDI
 * Remove caracteres especiais e adiciona +55 se necessário
 * 
 * @example
 * formatPhoneNumber("(11) 99999-9999") // "+5511999999999"
 * formatPhoneNumber("11999999999") // "+5511999999999"
 * formatPhoneNumber("+5511999999999") // "+5511999999999"
 */
export function formatPhoneNumber(phone: string): string {
  // Remove todos os caracteres que não sejam números ou +
  let cleaned = phone.replace(/[^\d+]/g, "");
  
  // Remove + do início se existir
  cleaned = cleaned.replace(/^\+/, "");
  
  // Se já começa com 55, apenas adiciona o +
  if (cleaned.startsWith("55")) {
    return `+${cleaned}`;
  }
  
  // Se não começa com 55, adiciona +55
  return `+55${cleaned}`;
}

/**
 * Valida formato de telefone brasileiro
 * Aceita formatos: (11) 99999-9999, 11999999999, +5511999999999
 * 
 * @param phone - Número de telefone a validar
 * @returns true se válido, false caso contrário
 */
export function isValidBrazilianPhone(phone: string): boolean {
  // Remove caracteres especiais
  const cleaned = phone.replace(/[^\d]/g, "");
  
  // Verifica se tem 10 ou 11 dígitos (com DDD)
  // ou 12-13 dígitos (com DDI 55)
  if (cleaned.length === 10 || cleaned.length === 11) {
    return true;
  }
  
  if ((cleaned.length === 12 || cleaned.length === 13) && cleaned.startsWith("55")) {
    return true;
  }
  
  return false;
}

/**
 * Schema Zod para validar telefone
 */
export const whatsappPhoneSchema = z.string()
  .min(10, "Telefone inválido. Use o formato: (11) 99999-9999")
  .max(20, "Telefone muito longo")
  .refine(isValidBrazilianPhone, {
    message: "Telefone inválido. Use o formato: (11) 99999-9999",
  });

