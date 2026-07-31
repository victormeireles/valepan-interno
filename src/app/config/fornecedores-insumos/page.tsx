import { Suspense } from 'react';
import { listarFornecedoresIgnorados } from '@/app/actions/insumo-fornecedor-ignorado-actions';
import FornecedoresIgnoradosClient from './FornecedoresIgnoradosClient';

export const dynamic = 'force-dynamic';

export default async function FornecedoresIgnoradosPage() {
  const fornecedores = await listarFornecedoresIgnorados();

  return (
    <Suspense fallback={<div className="p-8 text-stone-500">Carregando…</div>}>
      <FornecedoresIgnoradosClient initialFornecedores={fornecedores} />
    </Suspense>
  );
}
