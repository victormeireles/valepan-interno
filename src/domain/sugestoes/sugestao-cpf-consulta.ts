import { CpfVerificador } from '@/domain/pessoas/cpf-verificador';

export type SugestaoAtivo = { id: string; nome: string };

export interface SugestaoAtivosPorCpf {
  listar(digitos: string): Promise<SugestaoAtivo[]>;
}

export type SugestaoCpfResultado =
  | { tipo: 'invalido' }
  | { tipo: 'rh' }
  | { tipo: 'identificado'; colaborador: SugestaoAtivo };

export class SugestaoCpfConsulta {
  constructor(
    private readonly verificador: CpfVerificador,
    private readonly ativos: SugestaoAtivosPorCpf,
  ) {}

  async classificar(cpf: string): Promise<SugestaoCpfResultado> {
    const digitos = cpf.replace(/\D/g, '');
    if (!this.verificador.verificar(digitos)) return { tipo: 'invalido' };
    const encontrados = await this.ativos.listar(digitos);
    if (encontrados.length !== 1) return { tipo: 'rh' };
    return { tipo: 'identificado', colaborador: encontrados[0] };
  }
}
