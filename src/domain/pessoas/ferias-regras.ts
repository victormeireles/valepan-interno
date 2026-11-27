import type { Regime } from './regime-cadastro';
import { RegimeTroca } from './regime-troca';
import { FeriasFalta } from './ferias-falta';
import { FeriasPeriodo, type PeriodoFerias } from './ferias-periodo';

export type ContextoFerias = {
  situacao: string;
  avisoAtivo: boolean;
  regime: Regime;
  dataDesligamento: string | null;
  outrosPeriodos: PeriodoFerias[];
  faltasAtivas: string[];
};

export type DatasFerias = { inicio: string; volta: string };

const ISO_DATA = /^(\d{4})-(\d{2})-(\d{2})$/;
const periodo = new FeriasPeriodo();
const faltas = new FeriasFalta();
const regime = new RegimeTroca();

export class FeriasRegras {
  lancar(inicio: string, volta: string, hoje: string, contexto: ContextoFerias): DatasFerias {
    const datas = this.datas(inicio, volta, hoje, false);
    this.pessoa(contexto);
    this.cruzamento(datas, contexto.outrosPeriodos);
    this.faltas(contexto.faltasAtivas);
    return datas;
  }

  alterar(atual: PeriodoFerias, inicio: string, volta: string, hoje: string, contexto: ContextoFerias): DatasFerias {
    if (!periodo.aberto(atual, hoje)) throw new Error('Não há férias em aberto.');
    const emGozo = periodo.estado(atual, hoje) === 'em_gozo';
    if (emGozo && inicio.trim() !== atual.inicio) throw new Error('O início das férias em gozo não pode mudar.');
    const datas = this.datas(emGozo ? atual.inicio : inicio, volta, hoje, emGozo);
    this.pessoa(contexto);
    this.cruzamento(datas, contexto.outrosPeriodos);
    this.faltas(contexto.faltasAtivas);
    return datas;
  }

  cancelar(atual: PeriodoFerias | null, hoje: string): { cancela: true } {
    if (!atual || !periodo.aberto(atual, hoje)) throw new Error('Não há férias em aberto.');
    return { cancela: true };
  }

  private datas(inicio: string, volta: string, hoje: string, emGozo: boolean): DatasFerias {
    const datas = { inicio: inicio.trim(), volta: volta.trim() };
    if (!this.calendario(datas.inicio) || !this.calendario(datas.volta)) throw new Error('Informe o início e a volta.');
    if (datas.volta <= datas.inicio) throw new Error('A volta precisa ser depois do início.');
    if (!emGozo && datas.inicio < hoje) throw new Error('O início não pode ser anterior a hoje.');
    return datas;
  }

  private pessoa(contexto: ContextoFerias): void {
    if (contexto.avisoAtivo) throw new Error('Cancele o aviso antes de lançar férias.');
    if (regime.saidaPrevista(contexto.regime, contexto.situacao, contexto.dataDesligamento)) {
      throw new Error('Cancele a saída prevista antes de lançar férias.');
    }
    if (contexto.situacao !== 'ativo') throw new Error('Só um colaborador ativo pode entrar de férias.');
  }

  private cruzamento(datas: DatasFerias, outros: PeriodoFerias[]): void {
    const cruza = outros.some((item) => datas.inicio < item.volta && item.inicio < datas.volta && !item.canceladaEm);
    if (cruza) throw new Error('Já existe férias nesse período.');
  }

  private faltas(datas: string[]): void {
    if (datas.length > 0) throw new Error(faltas.mensagemFaltas(datas));
  }

  private calendario(iso: string): boolean {
    const match = ISO_DATA.exec(iso);
    if (!match) return false;
    const ano = Number(match[1]);
    const mes = Number(match[2]);
    const dia = Number(match[3]);
    const data = new Date(Date.UTC(ano, mes - 1, dia));
    return data.getUTCFullYear() === ano && data.getUTCMonth() === mes - 1 && data.getUTCDate() === dia;
  }
}
