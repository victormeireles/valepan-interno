export type ClassificacaoFalta = 'pendente' | 'justificada' | 'injustificada';

export type FaltaLinha = {
  colaboradorCodigo: string;
  data: string;
  classificacao: ClassificacaoFalta;
  justificativa: string | null;
};

export class FaltaLancamento {
  validar(falta: FaltaLinha, datasOcupadas: string[]): FaltaLinha {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(falta.data)) {
      throw new Error('Informe a data da falta.');
    }
    if (datasOcupadas.includes(falta.data)) {
      throw new Error('Já existe falta ativa nessa data.');
    }
    return falta;
  }

  periodo(inicio: string, fim: string): string[] {
    const datas: string[] = [];
    const cursor = new Date(`${inicio}T12:00:00`);
    const limite = new Date(`${fim}T12:00:00`);
    if (Number.isNaN(cursor.getTime()) || cursor > limite) {
      throw new Error('O período da falta é inválido.');
    }
    while (cursor <= limite) {
      datas.push(cursor.toISOString().slice(0, 10));
      cursor.setDate(cursor.getDate() + 1);
    }
    return datas;
  }
}
