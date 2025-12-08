/**
 * Alerta de erro compartilhado para telas de produção
 */

interface ProductionErrorAlertProps {
  error: string | null;
}

export default function ProductionErrorAlert({ error }: ProductionErrorAlertProps) {
  if (!error || error.trim() === '') return null;

  return (
    <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm font-medium flex items-center gap-2">
      <span className="material-icons text-base">error</span>
      <span>{error}</span>
    </div>
  );
}

