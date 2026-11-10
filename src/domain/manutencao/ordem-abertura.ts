const URGENCIAS = new Set([
  'maquina_parou',
  'trabalhando_com_problema',
  'oferecendo_risco',
]);

const TIPOS_PROBLEMA = new Set(['eletrico', 'mecanico', 'ajuste_parametro']);

export type AberturaEntrada = {
  maquinaId: string;
  urgencia: 'maquina_parou' | 'trabalhando_com_problema' | 'oferecendo_risco';
  tipoProblema: 'eletrico' | 'mecanico' | 'ajuste_parametro';
  descricao: string;
};

type MaquinaAbertura = {
  id: string;
  ativo: boolean;
  setorId: string;
};

type SetoresAbertura = string[] | 'todos';

type ResultadoAbertura =
  | { ok: true; setorId: string; descricao: string }
  | { ok: false; mensagem: string };

export class OrdemAbertura {
  validar(
    entrada: AberturaEntrada,
    maquina: MaquinaAbertura | null,
    setoresPermitidos: SetoresAbertura,
  ): ResultadoAbertura {
    const bloqueioMaquina = this.bloqueioMaquina(maquina, setoresPermitidos);
    if (bloqueioMaquina) return bloqueioMaquina;

    const bloqueioEntrada = this.bloqueioEntrada(entrada);
    if (bloqueioEntrada) return bloqueioEntrada;

    return this.aceitar(entrada, maquina);
  }

  private bloqueioMaquina(
    maquina: MaquinaAbertura | null,
    setoresPermitidos: SetoresAbertura,
  ): ResultadoAbertura | null {
    if (!maquina) return this.recusar('Máquina não encontrada.');
    if (!maquina.ativo) return this.recusar('Máquina inativa.');
    if (!this.setorLiberado(maquina.setorId, setoresPermitidos)) {
      return this.recusar('Escolha uma máquina de um setor liberado.');
    }
    return null;
  }

  private bloqueioEntrada(entrada: AberturaEntrada): ResultadoAbertura | null {
    if (!URGENCIAS.has(entrada.urgencia)) return this.recusar('Informe a urgência.');
    if (!TIPOS_PROBLEMA.has(entrada.tipoProblema)) {
      return this.recusar('Informe o tipo de problema.');
    }
    if (!entrada.descricao.trim()) return this.recusar('Informe a descrição.');
    return null;
  }

  private setorLiberado(setorId: string, setores: SetoresAbertura): boolean {
    if (setores === 'todos') return true;
    return setores.includes(setorId);
  }

  private aceitar(
    entrada: AberturaEntrada,
    maquina: MaquinaAbertura | null,
  ): ResultadoAbertura {
    if (!maquina) return this.recusar('Máquina não encontrada.');
    return {
      ok: true,
      setorId: maquina.setorId,
      descricao: entrada.descricao.trim(),
    };
  }

  private recusar(mensagem: string): ResultadoAbertura {
    return { ok: false, mensagem };
  }
}
