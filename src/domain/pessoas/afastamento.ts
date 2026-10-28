export const MOTIVOS_AFASTAMENTO = ['abandono', 'inss', 'outro'] as const;

export type MotivoAfastamento = (typeof MOTIVOS_AFASTAMENTO)[number];

const ROTULOS: Record<MotivoAfastamento, string> = {
  abandono: 'Abandono',
  inss: 'INSS',
  outro: 'Outro',
};

export class AfastamentoRotulo {
  opcoes(): { value: MotivoAfastamento; label: string }[] {
    return MOTIVOS_AFASTAMENTO.map((value) => ({ value, label: ROTULOS[value] }));
  }

  exibir(motivo: string | null | undefined): string {
    if (motivo === 'abandono' || motivo === 'inss' || motivo === 'outro') return ROTULOS[motivo];
    return 'Afastado';
  }

  ler(valor: unknown): MotivoAfastamento | null {
    if (valor === 'abandono' || valor === 'inss' || valor === 'outro') return valor;
    return null;
  }
}
