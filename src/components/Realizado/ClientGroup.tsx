'use client';

import { ReactNode } from 'react';

interface ClientGroupProps {
  cliente?: string;
  dataFabricacao?: string;
  observacao?: string;
  selectedDate: string;
  children: ReactNode;
}

export default function ClientGroup({
  cliente,
  dataFabricacao,
  observacao,
  selectedDate,
  children,
}: ClientGroupProps) {
  const dataDiferente = dataFabricacao && dataFabricacao !== selectedDate;

  // Helper para formatar data curta (DD/MM)
  const formatDateShort = (dateString: string): string => {
    const parts = dateString.split('-');
    if (parts.length === 3) {
      const [, month, day] = parts;
      return `${day}/${month}`;
    }
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}`;
  };

  return (
    <div className="bg-gray-800/20 border border-gray-600/30 rounded-lg p-3 space-y-2">
      {/* Cabeçalho do Grupo - Tudo em uma linha */}
      <div className="border-b border-gray-600/30 pb-2">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Título do Cliente */}
          {cliente && (
            <h3 className="text-base font-bold text-white">{cliente}</h3>
          )}
          
          {/* Etiqueta (se diferente da data selecionada) */}
          {dataDiferente && (
            <div className="text-yellow-300">
              <span className="font-medium">Etiqueta:</span>{' '}
              {formatDateShort(dataFabricacao)}
            </div>
          )}
          
          {/* Observações */}
          {observacao && (
            <div className="text-gray-300">
              <span className="font-medium">Obs:</span> {observacao}
            </div>
          )}
        </div>
      </div>

      {/* Cards de Produtos (empilhados verticalmente) */}
      <div className="space-y-1.5">
        {children}
      </div>
    </div>
  );
}

