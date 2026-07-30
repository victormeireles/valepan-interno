import { Badge } from '@/components/ui/Badge';

export default function CoberturaLegend() {
  return (
    <ul
      className="flex flex-wrap items-center gap-1.5"
      aria-label="Legenda de cobertura de estoque"
    >
      <li>
        <Badge tone="danger" numeric pill={false}>
          ≤7 d
        </Badge>
      </li>
      <li>
        <Badge tone="warning" numeric pill={false}>
          8–21 d
        </Badge>
      </li>
      <li>
        <Badge tone="neutral" numeric pill={false}>
          22–60 d
        </Badge>
      </li>
      <li>
        <Badge tone="success" numeric pill={false}>
          &gt;60 d
        </Badge>
      </li>
    </ul>
  );
}
