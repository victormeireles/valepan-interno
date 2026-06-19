'use client';

export default function ConfigShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[calc(100dvh-3.5rem)] text-text-strong [color-scheme:light]">
      {children}
    </div>
  );
}
