import { PlanilhaXlsx } from '@/domain/planilha/planilha-xlsx';
import { ColaboradorPlanilha, type ColaboradorPlanilhaOrigem } from './colaborador-planilha';

const COLUNAS = ['id', 'nome', 'lider', 'setor', 'turno', 'data de admissao', 'situacao'];

export class ColaboradorPlanilhaExcel {
  constructor(
    private readonly planilha = new ColaboradorPlanilha(),
    private readonly xlsx = new PlanilhaXlsx(),
  ) {}

  gerar(origem: ColaboradorPlanilhaOrigem[], hoje: string): Uint8Array {
    const linhas = this.planilha.montar(origem, hoje).map((linha) => [
      linha.id,
      linha.nome,
      linha.lider,
      linha.setor,
      linha.turno,
      linha.dataAdmissao,
      linha.situacao,
    ]);
    return this.xlsx.gerar('Colaboradores', COLUNAS, linhas);
  }
}
