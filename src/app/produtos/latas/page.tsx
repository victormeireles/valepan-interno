import { getAssadeiras } from '@/app/actions/assadeiras-actions';
import { getClientesLatas, getProdutosLatas } from '@/app/actions/latas-cadastro-actions';
import LatasCadastroClient from './LatasCadastroClient';

export const dynamic = 'force-dynamic';

export default async function LatasCadastroPage() {
  const [produtos, clientes, assadeirasRes] = await Promise.all([
    getProdutosLatas(),
    getClientesLatas(),
    getAssadeiras(),
  ]);

  const assadeiras = assadeirasRes.ok ? assadeirasRes.list : [];

  return (
    <LatasCadastroClient
      produtosInicial={produtos}
      clientesInicial={clientes}
      assadeirasInicial={assadeiras}
    />
  );
}
