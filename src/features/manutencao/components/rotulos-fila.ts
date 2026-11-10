import { OrdemNumero } from '@/domain/manutencao/ordem-numero';

const ROTULO_URGENCIA: Record<string, string> = {
  maquina_parou: 'Máquina parou',
  oferecendo_risco: 'Oferecendo risco',
  trabalhando_com_problema: 'Trabalhando com problema',
};

const ROTULO_PROBLEMA: Record<string, string> = {
  eletrico: 'Elétrico',
  mecanico: 'Mecânico',
  ajuste_parametro: 'Ajuste de parâmetro',
};

const ROTULO_STATUS: Record<string, string> = {
  aberta: 'Aberta',
  recebida: 'Recebida',
};

export class RotulosFila {
  private readonly numeros = new OrdemNumero();

  numero(valor: number): string {
    return this.numeros.formatar(valor);
  }

  urgencia(valor: string | null): string {
    if (!valor) return '—';
    return ROTULO_URGENCIA[valor] ?? valor;
  }

  classeUrgencia(valor: string | null): string {
    if (valor === 'maquina_parou') return 'text-red-700';
    if (valor === 'oferecendo_risco') return 'text-amber-800';
    return 'text-stone-700';
  }

  problema(valor: string | null): string {
    if (!valor) return '—';
    return ROTULO_PROBLEMA[valor] ?? valor;
  }

  status(valor: string): string {
    return ROTULO_STATUS[valor] ?? valor;
  }
}
