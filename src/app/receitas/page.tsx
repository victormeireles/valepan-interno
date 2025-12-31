import { getReceitas } from '@/app/actions/receitas-actions';
import ReceitasClient from './ReceitasClient';

export const dynamic = 'force-dynamic';

export default async function ReceitasPage() {
  const receitas = await getReceitas();

  return <ReceitasClient initialReceitas={receitas} />;
}











