import { getInsumos } from '@/app/actions/insumos-actions';
import InsumosClient from './InsumosClient';

export const dynamic = 'force-dynamic';

export default async function InsumosPage() {
  const insumos = await getInsumos();

  return <InsumosClient initialInsumos={insumos} />;
}













