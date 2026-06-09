import ConfigNav from '@/components/Config/ConfigNav';

export default function ConfigLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-gray-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <p className="text-xs text-gray-500 mb-4 hidden lg:block">
          <span className="text-gray-400">Início</span>
          <span className="mx-2">›</span>
          <span className="font-medium text-gray-700">Configurações</span>
        </p>
        <div className="lg:flex lg:gap-8">
          <ConfigNav />
          <div className="flex-1 min-w-0">{children}</div>
        </div>
      </div>
    </div>
  );
}
