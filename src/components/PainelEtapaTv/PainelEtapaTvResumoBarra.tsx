const FILL =
  'h-full rounded-full motion-safe:transition-[width] motion-safe:duration-300 motion-safe:ease-out';

type PainelEtapaTvResumoBarraProps = {
  pct: number;
  fillClass: string;
  label: string;
  size?: 'ordem' | 'turno';
};

export default function PainelEtapaTvResumoBarra({
  pct,
  fillClass,
  label,
  size = 'ordem',
}: PainelEtapaTvResumoBarraProps) {
  const clamped = Math.min(100, Math.max(0, pct));
  const track = size === 'ordem' ? 'h-2' : 'h-1.5';

  return (
    <div
      className={`${track} overflow-hidden rounded-full bg-stone-100`}
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className={`${FILL} ${fillClass}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
