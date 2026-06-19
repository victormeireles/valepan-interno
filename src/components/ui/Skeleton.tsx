import type { CSSProperties } from 'react';

export interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  radius?: string;
  style?: CSSProperties;
  className?: string;
}

export function Skeleton({
  width = '100%',
  height = '1rem',
  radius = '0.5rem',
  style,
  className = '',
}: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className={['block animate-vp-shimmer', className].filter(Boolean).join(' ')}
      style={{ width, height, borderRadius: radius, ...style }}
    />
  );
}

export function SkeletonRow({ style }: { style?: CSSProperties }) {
  return (
    <div
      style={style}
      className="flex items-center gap-3 border-b border-stone-100 px-3 py-3"
    >
      <Skeleton width="1.25rem" height="1.25rem" radius="0.375rem" />
      <Skeleton width="40%" height="0.875rem" />
      <Skeleton width="3rem" height="0.875rem" style={{ marginLeft: 'auto' }} />
      <Skeleton width="3rem" height="0.875rem" />
    </div>
  );
}
