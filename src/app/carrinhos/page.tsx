import { getCarrinhos } from '@/app/actions/carrinhos-actions';
import CarrinhosClient from './CarrinhosClient';

export const dynamic = 'force-dynamic';

export default async function CarrinhosPage() {
  const result = await getCarrinhos();

  if (!result.ok) {
    return <CarrinhosClient initialList={[]} loadError={result.message} />;
  }

  return <CarrinhosClient initialList={result.list} />;
}
