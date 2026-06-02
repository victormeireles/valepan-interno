'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

export default function ProducaoEstoqueMostrarSemEstoqueCheckbox() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const checked =
    searchParams.get('mostrar_sem_estoque') === '1' ||
    String(searchParams.get('mostrar_sem_estoque') ?? '').toLowerCase() === 'true';

  const onChange = useCallback(
    (next: boolean) => {
      const n = new URLSearchParams(searchParams.toString());
      if (next) {
        n.set('mostrar_sem_estoque', '1');
      } else {
        n.delete('mostrar_sem_estoque');
      }
      const q = n.toString();
      router.push(q ? `${pathname}?${q}` : pathname);
    },
    [pathname, router, searchParams],
  );

  return (
    <label className="flex cursor-pointer select-none items-center gap-2 text-xs text-slate-700 sm:text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 shrink-0 rounded border-slate-300 text-violet-700 focus:ring-violet-500"
      />
      <span className="font-medium leading-snug">Mostrar produtos sem quantidade em estoque</span>
    </label>
  );
}
