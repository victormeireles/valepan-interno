import { carregarFilaFundacao } from '@/app/actions/manutencao-fila-actions';
import { FilaVazia } from '@/features/manutencao/components/FilaVazia';

export const dynamic = 'force-dynamic';

export default async function ManutencaoFilaPage() {
  const { mensagem } = await carregarFilaFundacao();

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6">
      <FilaVazia mensagem={mensagem} />
    </div>
  );
}
