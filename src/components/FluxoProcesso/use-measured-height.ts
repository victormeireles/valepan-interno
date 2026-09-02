'use client';

import { useLayoutEffect, useRef, useState } from 'react';

export function useMeasuredHeight(enabled: boolean, fallbackPx: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(fallbackPx);

  useLayoutEffect(() => {
    if (!enabled) return;
    const el = ref.current;
    if (!el) return;

    const sync = () => {
      const next = Math.floor(el.clientHeight);
      if (next <= 0) return;
      setHeight((prev) => (prev === next ? prev : next));
    };
    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    return () => observer.disconnect();
  }, [enabled]);

  return { ref, height: enabled ? height : fallbackPx };
}
