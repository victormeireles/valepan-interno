import type { OrdemCarregada } from '@/app/actions/manutencao-ordem-consulta';
import { ConversorSaldo } from '@/domain/manutencao/conversor-saldo';
import { PrecoCentavos } from '@/domain/manutencao/preco-centavos';
import { QuantidadeEstoque } from '@/domain/manutencao/quantidade-estoque';
import { RotulosFila } from './rotulos-fila';

class ApresentacaoOrdem {
  constructor(
    private readonly precos = new PrecoCentavos(),
    private readonly quantidades = new QuantidadeEstoque(),
    private readonly saldos = new ConversorSaldo(),
    private readonly numeros = new RotulosFila(),
  ) {}

  numero(valor: number): string {
    return this.numeros.numero(valor);
  }

  quantidade(texto: string): string {
    return this.quantidades.formatar(this.saldos.emMilesimos(texto));
  }

  reais(centavos: number): string {
    const texto = this.precos.formatar(Math.abs(centavos));
    return centavos < 0 ? `-R$ ${texto}` : `R$ ${texto}`;
  }
}

type EventoTempo = { id: string; rotulo: string; quando: string; detalhe: string | null };

class LinhaTempoOrdem {
  constructor(private readonly relogio = new RelogioSaoPaulo()) {}

  eventos(ordem: OrdemCarregada): EventoTempo[] {
    return [this.aberta(ordem), this.recebida(ordem), this.finalizada(ordem), this.cancelada(ordem)].flatMap(
      (evento) => (evento ? [evento] : []),
    );
  }

  private aberta(ordem: OrdemCarregada): EventoTempo {
    return {
      id: 'aberta',
      rotulo: 'Aberta',
      quando: this.relogio.formatar(ordem.abertaEm),
      detalhe: this.por(ordem.abertaPorNome),
    };
  }

  private recebida(ordem: OrdemCarregada): EventoTempo | null {
    if (!ordem.recebidaEm) return null;
    return {
      id: 'recebida',
      rotulo: 'Recebida',
      quando: this.relogio.formatar(ordem.recebidaEm),
      detalhe: this.por(ordem.recebidaPorNome),
    };
  }

  private finalizada(ordem: OrdemCarregada): EventoTempo | null {
    if (ordem.status !== 'finalizada') return null;
    return {
      id: 'finalizada',
      rotulo: 'Finalizada',
      quando: `${this.relogio.formatar(ordem.inicioEm)} — ${this.relogio.formatar(ordem.fimEm)}`,
      detalhe: ordem.servicos,
    };
  }

  private cancelada(ordem: OrdemCarregada): EventoTempo | null {
    if (ordem.status !== 'cancelada') return null;
    return {
      id: 'cancelada',
      rotulo: 'Cancelada',
      quando: this.relogio.formatar(ordem.canceladaEm),
      detalhe: this.textoCancelamento(ordem),
    };
  }

  private por(nome: string | null): string | null {
    const texto = nome?.trim() ?? '';
    return texto ? `por ${texto}` : null;
  }

  private textoCancelamento(ordem: OrdemCarregada): string | null {
    const motivo = ordem.cancelamentoMotivo?.trim() ?? '';
    const partes = [this.por(ordem.canceladaPorNome), motivo || null].filter(
      (parte): parte is string => Boolean(parte),
    );
    return partes.length > 0 ? partes.join(' · ') : null;
  }
}

class RelogioSaoPaulo {
  formatar(iso: string | null): string {
    if (!iso) return '—';
    const data = new Date(iso);
    if (Number.isNaN(data.getTime())) return '—';
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(data);
  }
}

export const apresentacaoOrdem = new ApresentacaoOrdem();
export const linhaTempoOrdem = new LinhaTempoOrdem();
