import type { ListRowColumn } from '@/components/ui/ListRow';

export type ListColumnHeaderItem = Pick<ListRowColumn, 'width' | 'align'> & {
  label: string;
};

type Props = {
  leading: string;
  columns: ListColumnHeaderItem[];
  menuWidth?: string;
};

const labelClass =
  'text-[10px] font-semibold uppercase tracking-wide text-text-muted';

export function ListColumnHeader({
  leading,
  columns,
  menuWidth = '2.75rem',
}: Props) {
  return (
    <div className="flex items-center gap-3 border-b border-border-default bg-stone-50 px-3 py-1.5">
      <span className={`min-w-0 flex-1 ${labelClass}`}>{leading}</span>
      {columns.map((column) => (
        <span
          key={column.label}
          style={{ width: column.width ?? '3.5rem' }}
          className={[
            'shrink-0',
            labelClass,
            column.align === 'left' ? 'text-left' : 'text-right',
          ].join(' ')}
        >
          {column.label}
        </span>
      ))}
      <span className="shrink-0" style={{ width: menuWidth }} aria-hidden />
    </div>
  );
}
