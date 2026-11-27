import { FeriasPeriodo, type PeriodoFerias } from '@/domain/pessoas/ferias-periodo';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';

type ServiceClient = ReturnType<typeof supabaseClientFactory.createServiceRoleClient>;

type FeriasRow = {
  inicio: string;
  volta: string;
  pessoas_colaboradores: { codigo: string } | { codigo: string }[] | null;
};

export async function mapaFeriasAbertas(client: ServiceClient, hoje: string): Promise<Map<string, PeriodoFerias>> {
  const { data, error } = await client
    .from('pessoas_ferias' as never)
    .select('inicio, volta, pessoas_colaboradores(codigo)')
    .is('cancelada_em', null)
    .gt('volta', hoje);
  if (error) throw new Error(error.message);
  return montarMapa((data ?? []) as FeriasRow[], hoje);
}

function montarMapa(rows: FeriasRow[], hoje: string): Map<string, PeriodoFerias> {
  const periodo = new FeriasPeriodo();
  const mapa = new Map<string, PeriodoFerias>();
  for (const row of rows) {
    const codigo = codigoDe(row.pessoas_colaboradores);
    const candidato = { inicio: row.inicio, volta: row.volta };
    if (!codigo || !periodo.aberto(candidato, hoje)) continue;
    const atual = mapa.get(codigo);
    if (!atual || candidato.inicio < atual.inicio) mapa.set(codigo, candidato);
  }
  return mapa;
}

function codigoDe(valor: { codigo: string } | { codigo: string }[] | null): string {
  const pessoa = Array.isArray(valor) ? valor[0] : valor;
  return pessoa?.codigo ?? '';
}
