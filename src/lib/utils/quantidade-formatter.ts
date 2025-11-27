import { Quantidade } from '@/domain/types/inventario';

/**
 * Verifica se uma quantidade está completamente zerada
 */
export function isQuantidadeZerada(quantidade?: Quantidade | null): boolean {
  if (!quantidade) return true;
  return (
    quantidade.caixas === 0 &&
    quantidade.pacotes === 0 &&
    quantidade.unidades === 0 &&
    quantidade.kg === 0
  );
}

/**
 * Formata quantidade no formato "X cx + Y pct + Z Kg"
 * Apenas valores maiores que zero são incluídos
 */
export function formatQuantidade(quantidade?: Quantidade | null): string {
  if (!quantidade) return '—';
  
  const partes: string[] = [];
  
  if (quantidade.caixas !== 0) {
    partes.push(`${quantidade.caixas} cx`);
  }
  
  if (quantidade.pacotes !== 0) {
    partes.push(`${quantidade.pacotes} pct`);
  }

  if (quantidade.unidades !== 0) {
    partes.push(`${quantidade.unidades} un`);
  }
  
  if (quantidade.kg !== 0) {
    partes.push(`${quantidade.kg.toFixed(2)} Kg`);
  }

  if (partes.length === 0) {
    return '0 cx';
  }

  return partes.join(' + ');
}

