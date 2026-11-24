'use client';

import { useState } from 'react';
import { exportarColaboradoresExcel } from '@/app/actions/pessoas-planilha-actions';
import { Button } from '@/components/ui/Button';

type Props = {
  onErro: (texto: string) => void;
};

export function BaixarColaboradoresExcel({ onErro }: Props) {
  const [baixando, setBaixando] = useState(false);

  async function baixar() {
    setBaixando(true);
    try {
      baixarArquivo(await exportarColaboradoresExcel());
    } catch {
      onErro('Erro ao baixar Excel.');
    } finally {
      setBaixando(false);
    }
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size="lg"
      icon="download"
      fullWidth
      className="sm:w-auto"
      disabled={baixando}
      onClick={() => void baixar()}
    >
      {baixando ? 'Baixando...' : 'Baixar Excel'}
    </Button>
  );
}

function baixarArquivo(base64: string): void {
  const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  const url = URL.createObjectURL(
    new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = 'colaboradores.xlsx';
  link.click();
  URL.revokeObjectURL(url);
}
