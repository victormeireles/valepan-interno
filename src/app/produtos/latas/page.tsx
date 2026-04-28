import { getAssadeiras } from '@/app/actions/assadeiras-actions';
import {
  getClienteAssadeiraBloqueios,
  getClientesLatas,
  getProdutosLatas,
} from '@/app/actions/latas-cadastro-actions';
import LatasCadastroClient from './LatasCadastroClient';

export const dynamic = 'force-dynamic';

export default async function LatasCadastroPage() {
  const [produtos, clientes, assadeirasRes, bloqueios] = await Promise.all([
    getProdutosLatas(),
    getClientesLatas(),
    getAssadeiras(),
    getClienteAssadeiraBloqueios(),
  ]);

  const assadeiras = assadeirasRes.ok ? assadeirasRes.list : [];

  return (
    <LatasCadastroClient
      produtosInicial={produtos}
      clientesInicial={clientes}
      assadeirasInicial={assadeiras}
      bloqueiosInicial={bloqueios}
    />
  );
}
