import Link from 'next/link';
import type { HubNavItem } from '@/components/Hub/hub-nav-config';

interface HubNavCardProps {
  item: HubNavItem;
}

export function HubNavCard({ item }: HubNavCardProps) {
  return (
    <Link
      href={item.href}
      aria-label={`Acessar ${item.title}`}
      className="group flex min-h-11 flex-col gap-3.5 rounded-xl border border-border-default bg-surface p-5 shadow-control transition-[box-shadow,border-color,transform] duration-[180ms] ease-out hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-md sm:p-6"
    >
      <span
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800"
        aria-hidden="true"
      >
        <span className="material-icons text-[26px]">{item.icon}</span>
      </span>

      <div className="flex flex-1 flex-col gap-1">
        <h3 className="text-lg font-semibold tracking-tight text-text-strong">
          {item.title}
        </h3>
        <p className="text-sm leading-relaxed text-text-muted">{item.description}</p>
      </div>

      <span className="inline-flex items-center gap-1 text-sm font-semibold text-text-muted transition-colors duration-[180ms] group-hover:text-accent">
        Acessar
        <span className="material-icons text-lg" aria-hidden="true">
          arrow_forward
        </span>
      </span>
    </Link>
  );
}
