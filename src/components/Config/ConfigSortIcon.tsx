type Props = {
  active: boolean;
  dir: 'asc' | 'desc';
};

export default function ConfigSortIcon({ active, dir }: Props) {
  if (!active) {
    return (
      <span className="material-icons text-base text-stone-400" aria-hidden="true">
        unfold_more
      </span>
    );
  }

  return (
    <span className="material-icons text-base text-amber-700" aria-hidden="true">
      {dir === 'asc' ? 'arrow_upward' : 'arrow_downward'}
    </span>
  );
}
