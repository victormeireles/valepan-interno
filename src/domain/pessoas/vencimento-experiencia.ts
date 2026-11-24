export class VencimentoExperiencia {
  exibir(dataAdmissao: string | null, dias: number, hoje: string): string {
    const vencimento = this.dataIso(dataAdmissao, dias, hoje);
    return vencimento ? this.formatar(vencimento) : '';
  }

  dataIso(dataAdmissao: string | null, dias: number, hoje: string): string | null {
    const vencimento = this.somarDias(dataAdmissao, dias);
    if (!vencimento || !this.calendario(hoje) || vencimento < hoje) return null;
    return vencimento;
  }

  private somarDias(inicio: string | null, dias: number): string | null {
    if (!inicio || !this.calendario(inicio)) return null;
    const data = new Date(`${inicio}T00:00:00Z`);
    if (Number.isNaN(data.getTime())) return null;
    data.setUTCDate(data.getUTCDate() + dias);
    const ano = data.getUTCFullYear();
    const mes = String(data.getUTCMonth() + 1).padStart(2, '0');
    const dia = String(data.getUTCDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }

  private formatar(iso: string): string {
    const [ano, mes, dia] = iso.split('-');
    return `${dia}/${mes}/${ano}`;
  }

  private calendario(valor: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(valor);
  }
}
