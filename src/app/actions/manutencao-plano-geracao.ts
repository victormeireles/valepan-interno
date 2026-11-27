import { GeracaoImediataPreventiva } from '@/domain/manutencao/geracao-imediata-preventiva';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';

type Cliente = ReturnType<typeof supabaseClientFactory.createServiceRoleClient>;

export class GeradorPreventivaNaFila {
  constructor(private readonly regra = new GeracaoImediataPreventiva()) {}

  async aposSalvar(client: Cliente, proximaEm: string, hoje: string): Promise<string> {
    if (!this.regra.deveGerar(proximaEm, hoje)) return this.regra.salvo();
    const { error } = await client.rpc('manutencao_gerar_preventivas' as never);
    if (error) return this.regra.falha();
    return this.regra.naFila();
  }
}
