export type FaltaAnexoIndicavel = {
  codigo: string;
  temAnexo: boolean;
  cancelada: boolean;
};

export class FaltaAnexoIndicacao {
  existeParaPessoa(faltas: FaltaAnexoIndicavel[], codigo: string): boolean {
    return faltas.some((falta) => falta.codigo === codigo && falta.temAnexo && !falta.cancelada);
  }
}
