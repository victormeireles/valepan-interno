import type {
  CargaColaborador,
  CargaPrevia,
  CargaSetor,
  CargaTurno,
} from './carga-pessoas-tipos';

export type CargaPessoasEntrada = {
  setores: CargaSetor[];
  turnos: CargaTurno[];
  colaboradores: CargaColaborador[];
  codigosJaGravados: string[];
};

type PreviewAcumulador = {
  inserir: string[];
  atualizar: string[];
  erros: { codigo: string; motivo: string }[];
  vistos: Set<string>;
  gravados: Set<string>;
  setoresValidos: Set<string>;
  turnosValidos: Set<string>;
};

export class CargaPessoasPreview {
  prever(entrada: CargaPessoasEntrada): CargaPrevia {
    const acc: PreviewAcumulador = {
      inserir: [],
      atualizar: [],
      erros: [],
      vistos: new Set(),
      gravados: new Set(entrada.codigosJaGravados),
      setoresValidos: new Set(),
      turnosValidos: new Set(),
    };
    for (const setor of entrada.setores) this.processarSetor(setor, acc);
    for (const turno of entrada.turnos) this.processarTurno(turno, acc);
    for (const colab of entrada.colaboradores) this.processarColaborador(colab, acc);
    return { inserir: acc.inserir, atualizar: acc.atualizar, erros: acc.erros };
  }

  private processarSetor(setor: CargaSetor, acc: PreviewAcumulador): void {
    if (!this.aceitarCodigo(setor.codigo, acc)) return;
    this.registrarCodigo(setor.codigo, acc);
    acc.setoresValidos.add(setor.codigo);
  }

  private processarTurno(turno: CargaTurno, acc: PreviewAcumulador): void {
    if (!this.aceitarCodigo(turno.codigo, acc)) return;
    if (!acc.setoresValidos.has(turno.setorCodigo)) {
      acc.erros.push({ codigo: turno.codigo, motivo: 'setor desconhecido' });
      return;
    }
    this.registrarCodigo(turno.codigo, acc);
    acc.turnosValidos.add(turno.codigo);
  }

  private processarColaborador(colab: CargaColaborador, acc: PreviewAcumulador): void {
    if (!this.aceitarCodigo(colab.codigo, acc)) return;
    if (colab.setorCodigo !== null && !acc.setoresValidos.has(colab.setorCodigo)) {
      acc.erros.push({ codigo: colab.codigo, motivo: 'setor desconhecido' });
      return;
    }
    if (colab.turnoCodigo !== null && !acc.turnosValidos.has(colab.turnoCodigo)) {
      acc.erros.push({ codigo: colab.codigo, motivo: 'turno desconhecido' });
      return;
    }
    this.registrarCodigo(colab.codigo, acc);
  }

  private aceitarCodigo(codigo: string, acc: PreviewAcumulador): boolean {
    if (!codigo || acc.vistos.has(codigo)) {
      acc.erros.push({ codigo, motivo: 'código repetido na carga' });
      return false;
    }
    acc.vistos.add(codigo);
    return true;
  }

  private registrarCodigo(codigo: string, acc: PreviewAcumulador): void {
    if (acc.gravados.has(codigo)) acc.atualizar.push(codigo);
    else acc.inserir.push(codigo);
  }
}
