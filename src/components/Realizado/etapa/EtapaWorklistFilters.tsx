'use client';

import { Chip } from '@/components/ui/Chip';
import type { EtapaFilterStatus } from './types';

type EtapaWorklistFiltersProps = {
  value: EtapaFilterStatus;
  onChange: (value: EtapaFilterStatus) => void;
  counts: Record<EtapaFilterStatus, number>;
  showAndamentoFilter?: boolean;
  concluidoLabel?: string;
};

const BASE_FILTERS: { id: EtapaFilterStatus; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'pendente', label: 'Pendentes' },
  { id: 'andamento', label: 'Em andamento' },
  { id: 'concluido', label: 'Concluídos' },
];

export default function EtapaWorklistFilters({
  value,
  onChange,
  counts,
  showAndamentoFilter = true,
  concluidoLabel = 'Concluídos',
}: EtapaWorklistFiltersProps) {
  const filters = BASE_FILTERS.filter(
    (f) => showAndamentoFilter || f.id !== 'andamento',
  ).map((f) => (f.id === 'concluido' ? { ...f, label: concluidoLabel } : f));
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {filters.map((f) => (
        <Chip key={f.id} active={value === f.id} onClick={() => onChange(f.id)}>
          {f.label} ({counts[f.id]})
        </Chip>
      ))}
    </div>
  );
}
