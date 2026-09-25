export type ClassificacaoCarga = 'justificada' | 'injustificada';

export type FaltaCargaLinha = {
  colaboradorCodigo: string;
  data: string;
  classificacao: ClassificacaoCarga;
  observacao: string;
};

export class FaltaCargaCsv {
  ler(csv: string): { linhas: FaltaCargaLinha[]; erros: string[] } {
    const linhas = csv.replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim());
    const erros: string[] = [];
    const validas: FaltaCargaLinha[] = [];
    for (const linha of linhas.slice(1)) {
      const [codigo, , , data, tipo, , observacao] = linha.split(',');
      const classificacao = this.classificar(tipo?.trim() ?? '');
      if (!codigo?.trim() || !classificacao) {
        erros.push(codigo?.trim() || 'linha');
        continue;
      }
      validas.push({
        colaboradorCodigo: codigo.trim(),
        data: data.trim(),
        classificacao,
        observacao: observacao?.trim() ?? '',
      });
    }
    return { linhas: validas, erros };
  }

  private classificar(tipo: string): ClassificacaoCarga | null {
    if (tipo === 'Justificada') return 'justificada';
    if (tipo === 'Injustificada') return 'injustificada';
    return null;
  }
}
