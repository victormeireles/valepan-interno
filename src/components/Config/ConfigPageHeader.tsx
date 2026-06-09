'use client';

type ConfigPageHeaderProps = {
  title: string;
  description?: string;
  icon: string;
};

export default function ConfigPageHeader({
  title,
  description,
  icon,
}: ConfigPageHeaderProps) {
  return (
    <header className="mb-6">
      <div className="flex items-start gap-3">
        <span
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white border border-gray-200 text-gray-700 shadow-sm"
          aria-hidden="true"
        >
          <span className="material-icons text-xl">{icon}</span>
        </span>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{title}</h1>
          {description && (
            <p className="mt-1 text-sm text-gray-600">{description}</p>
          )}
        </div>
      </div>
    </header>
  );
}
