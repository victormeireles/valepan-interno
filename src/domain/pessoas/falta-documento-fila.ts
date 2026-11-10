import { extractCalendarDate } from '@/lib/utils/date-utils';
import { CalendarioDiaUtil } from './calendario-dia-util';

export type FaltaDocumentoEntrada = {
  id: string;
  codigo: string;
  nome: string;
  data: string;
  classificacao: string;
  cancelada: boolean;
  temAnexo: boolean;
  situacao: 'ativo' | 'admissao_prevista' | 'desligado' | 'afastado';
};

export type SituacaoDocumento = 'atrasado' | 'enviar_hoje' | 'ainda_ausente';

export type FaltaDocumentoPeriodo = {
  codigo: string;
  nome: string;
  inicio: string;
  fim: string;
  dias: number;
  situacao: SituacaoDocumento;
  diasUteis: number;
  faltaIds: string[];
};

type DiaFalta = {
  data: string;
  codigo: string;
  nome: string;
  injustificada: boolean;
  anexo: boolean;
  ids: string[];
};

const PESO: Record<SituacaoDocumento, number> = {
  atrasado: 0,
  enviar_hoje: 1,
  ainda_ausente: 2,
};

export class FaltaDocumentoFila {
  constructor(private readonly calendario = new CalendarioDiaUtil()) {}

  montar(faltas: FaltaDocumentoEntrada[], hoje: string): FaltaDocumentoPeriodo[] {
    const pessoas = this.agrupar(faltas);
    const periodos = [...pessoas.values()].flatMap((dias) => this.periodos(dias, hoje));
    return this.ordenar(periodos);
  }

  selo(periodos: FaltaDocumentoPeriodo[], codigo: string): SituacaoDocumento | null {
    const ordem: SituacaoDocumento[] = ['atrasado', 'enviar_hoje', 'ainda_ausente'];
    const das = periodos.filter((periodo) => periodo.codigo === codigo);
    return ordem.find((situacao) => das.some((periodo) => periodo.situacao === situacao)) ?? null;
  }

  private agrupar(faltas: FaltaDocumentoEntrada[]): Map<string, DiaFalta[]> {
    const pessoas = new Map<string, Map<string, DiaFalta>>();
    for (const falta of faltas) {
      const data = extractCalendarDate(falta.data);
      if (falta.cancelada || falta.situacao !== 'ativo' || !falta.codigo || !data) continue;
      const dias = pessoas.get(falta.codigo) ?? new Map<string, DiaFalta>();
      this.incluir(dias, falta, data);
      pessoas.set(falta.codigo, dias);
    }
    return new Map([...pessoas].map(([codigo, dias]) => [codigo, [...dias.values()]]));
  }

  private incluir(dias: Map<string, DiaFalta>, falta: FaltaDocumentoEntrada, data: string): void {
    const injusta = falta.classificacao === 'injustificada';
    const atual = dias.get(data);
    if (!atual) {
      dias.set(data, {
        data,
        codigo: falta.codigo,
        nome: falta.nome,
        injustificada: injusta,
        anexo: injusta && falta.temAnexo,
        ids: injusta ? [falta.id] : [],
      });
      return;
    }
    if (falta.nome) atual.nome = falta.nome;
    if (!injusta) return;
    atual.injustificada = true;
    atual.anexo = atual.anexo || falta.temAnexo;
    atual.ids.push(falta.id);
  }

  private periodos(dias: DiaFalta[], hoje: string): FaltaDocumentoPeriodo[] {
    return this.sequencias(dias).flatMap((sequencia) => this.descrever(sequencia, hoje));
  }

  private sequencias(dias: DiaFalta[]): DiaFalta[][] {
    const grupos: DiaFalta[][] = [];
    for (const dia of [...dias].sort((a, b) => a.data.localeCompare(b.data))) {
      const atual = grupos[grupos.length - 1];
      const ultimo = atual?.[atual.length - 1];
      if (!atual || !ultimo || !this.continua(ultimo.data, dia.data)) {
        grupos.push([dia]);
        continue;
      }
      atual.push(dia);
    }
    return grupos;
  }

  private continua(anterior: string, proximo: string): boolean {
    return this.calendario.proximoUtil(anterior) >= proximo;
  }

  private descrever(sequencia: DiaFalta[], hoje: string): FaltaDocumentoPeriodo[] {
    const injustos = sequencia.filter((dia) => dia.injustificada);
    if (injustos.length === 0 || injustos.some((dia) => dia.anexo)) return [];
    const estado = this.situacao(sequencia[sequencia.length - 1].data, hoje);
    const primeiro = injustos[0];
    const ultimo = injustos[injustos.length - 1];
    return [{
      codigo: primeiro.codigo,
      nome: ultimo.nome || primeiro.nome,
      inicio: primeiro.data,
      fim: ultimo.data,
      dias: injustos.length,
      situacao: estado.situacao,
      diasUteis: estado.diasUteis,
      faltaIds: injustos.flatMap((dia) => dia.ids),
    }];
  }

  private situacao(fim: string, hoje: string): { situacao: SituacaoDocumento; diasUteis: number } {
    const devido = this.calendario.proximoUtil(fim);
    if (devido > hoje) return { situacao: 'ainda_ausente', diasUteis: 0 };
    if (devido === hoje) return { situacao: 'enviar_hoje', diasUteis: 0 };
    return { situacao: 'atrasado', diasUteis: this.calendario.contarUteis(devido, hoje) };
  }

  private ordenar(periodos: FaltaDocumentoPeriodo[]): FaltaDocumentoPeriodo[] {
    return [...periodos].sort((a, b) =>
      PESO[a.situacao] - PESO[b.situacao]
      || b.diasUteis - a.diasUteis
      || a.inicio.localeCompare(b.inicio)
      || a.nome.localeCompare(b.nome, 'pt-BR'),
    );
  }
}
