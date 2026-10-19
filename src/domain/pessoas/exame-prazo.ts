export type ExameAlerta = 'ok' | 'proximo' | 'vencido' | 'sem_exame';

export type ExameSituacao = {
  ultimo: string | null;
  proximo: string | null;
  alerta: ExameAlerta;
  dias: number | null;
};

export class ExamePrazo {
  static readonly ANTECEDENCIA_DIAS = 30;

  calcular(ultimo: string | null, hoje: string): ExameSituacao {
    if (!ultimo) return { ultimo: null, proximo: null, alerta: 'sem_exame', dias: null };
    const proximo = this.somarAno(ultimo);
    const dias = this.diasAte(hoje, proximo);
    const alerta: ExameAlerta = dias < 0 ? 'vencido' : dias <= ExamePrazo.ANTECEDENCIA_DIAS ? 'proximo' : 'ok';
    return { ultimo, proximo, alerta, dias };
  }

  validar(data: string, hoje: string): string {
    const iso = data.trim();
    if (!this.dataReal(iso)) throw new Error('Informe a data do exame.');
    if (iso > hoje) throw new Error('A data do exame não pode ser futura.');
    return iso;
  }

  exibir(iso: string): string {
    const [ano, mes, dia] = iso.split('-');
    return `${dia}/${mes}/${ano}`;
  }

  legenda(situacao: ExameSituacao): string {
    if (situacao.alerta === 'sem_exame') return 'Nenhum exame registrado';
    if (situacao.alerta === 'vencido') {
      const dias = Math.abs(situacao.dias ?? 0);
      return dias === 1 ? 'Vencido há 1 dia' : `Vencido há ${dias} dias`;
    }
    if (situacao.alerta === 'proximo') {
      if (situacao.dias === 0) return 'Vence hoje';
      if (situacao.dias === 1) return 'Vence em 1 dia';
      return `Vence em ${situacao.dias} dias`;
    }
    return 'Em dia';
  }

  ultimos(registros: { codigo: string; data: string }[]): Map<string, string> {
    const mapa = new Map<string, string>();
    for (const registro of registros) {
      const data = registro.data.slice(0, 10);
      if (!registro.codigo || !this.dataReal(data)) continue;
      const atual = mapa.get(registro.codigo);
      if (!atual || data > atual) mapa.set(registro.codigo, data);
    }
    return mapa;
  }

  private somarAno(iso: string): string {
    const [ano, mes, dia] = iso.split('-').map(Number);
    const ultimoDia = new Date(Date.UTC(ano + 1, mes, 0)).getUTCDate();
    const diaAjustado = Math.min(dia, ultimoDia);
    return `${ano + 1}-${String(mes).padStart(2, '0')}-${String(diaAjustado).padStart(2, '0')}`;
  }

  private diasAte(de: string, ate: string): number {
    return Math.round((this.instante(ate) - this.instante(de)) / 86_400_000);
  }

  private instante(iso: string): number {
    const [ano, mes, dia] = iso.split('-').map(Number);
    return Date.UTC(ano, mes - 1, dia);
  }

  private dataReal(iso: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
    const [ano, mes, dia] = iso.split('-').map(Number);
    const conferida = new Date(Date.UTC(ano, mes - 1, dia));
    return conferida.getUTCFullYear() === ano && conferida.getUTCMonth() === mes - 1 && conferida.getUTCDate() === dia;
  }
}
