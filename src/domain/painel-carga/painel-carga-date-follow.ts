type PainelCargaDateFollowInput = {
  userPickedDate: boolean;
  ultimaDataComDados: string | null | undefined;
  selectedDate: string;
};

/**
 * Segue a última data com dados enquanto o operador não escolheu data à mão.
 * Painéis de TV ficam abertos o dia todo; sem isso a data trava no primeiro load.
 */
export class PainelCargaDateFollow {
  static nextDate(input: PainelCargaDateFollowInput): string | null {
    if (input.userPickedDate) return null;
    const ultima = input.ultimaDataComDados?.trim() || null;
    if (!ultima || ultima === input.selectedDate) return null;
    return ultima;
  }
}
