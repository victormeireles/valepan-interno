'use client';

import GenericStageForm from '@/components/GenericStageForm';

export default function EmbalagemProducaoPage() {
  return (
    <GenericStageForm
      stage="embalagem-producao"
      stageName="Embalagem (Produção)"
      stageDescription="Registro diário de produção: caixas, pacotes, unidades e Kg"
      fields={{
        data: { type: 'date', required: true, label: 'Data' },
        turno: { type: 'turno', required: true, label: 'Turno' },
        cliente: { type: 'select', required: true, label: 'Cliente', sourceColumn: 'A' },
        produto: { type: 'select', required: true, label: 'Produto', sourceColumn: 'A' },
        caixas: { type: 'number', required: false, label: 'Caixas' },
        pacotes: { type: 'number', required: false, label: 'Pacotes' },
        unidades: { type: 'number', required: false, label: 'Unidades' },
        kg: { type: 'number', required: false, label: 'Kg' },
      }}
    />
  );
}


