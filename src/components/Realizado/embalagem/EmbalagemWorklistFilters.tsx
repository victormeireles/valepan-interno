'use client';

import { Chip } from '@/components/ui/Chip';
import type { EmbalagemFilterStatus } from './embalagem-status';

type EmbalagemWorklistFiltersProps = {
  value: EmbalagemFilterStatus;
  onChange: (value: EmbalagemFilterStatus) => void;
  counts: Record<EmbalagemFilterStatus, number>;
};

const FILTERS: { id: EmbalagemFilterStatus; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'pendente', label: 'Pendentes' },
  { id: 'andamento', label: 'Em andamento' },
  { id: 'concluido', label: 'Concluídos' },
];

export default function EmbalagemWorklistFilters({
  value,
  onChange,
  counts,
}: EmbalagemWorklistFiltersProps) {
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {FILTERS.map((f) => (
        <Chip key={f.id} active={value === f.id} onClick={() => onChange(f.id)}>
          {f.label} ({counts[f.id]})
        </Chip>
      ))}
    </div>
  );
}
