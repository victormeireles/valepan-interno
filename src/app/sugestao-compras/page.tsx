import { getInsumoCompraSugestaoPageData } from '@/app/actions/insumo-compra-sugestao-actions';
import InsumoCompraSugestaoClient from '@/features/insumo-compra-sugestao/InsumoCompraSugestaoClient';

export const dynamic = 'force-dynamic';

type Props = {
  searchParams: Promise<{
    dataReferencia?: string;
  }>;
};

export default async function SugestaoComprasPage({ searchParams }: Props) {
  const { dataReferencia } = await searchParams;
  const data = await getInsumoCompraSugestaoPageData(dataReferencia);

  return <InsumoCompraSugestaoClient initialData={data} />;
}
