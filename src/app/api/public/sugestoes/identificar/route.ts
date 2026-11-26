import { NextResponse } from 'next/server';
import { CpfVerificador } from '@/domain/pessoas/cpf-verificador';
import { SugestaoCpfConsulta } from '@/domain/sugestoes/sugestao-cpf-consulta';
import { SugestaoIdentificacaoToken } from '@/domain/sugestoes/sugestao-identificacao-token';
import { SugestaoIpOrigem } from '@/domain/sugestoes/sugestao-ip';
import { SUGESTAO_MENSAGENS } from '@/domain/sugestoes/sugestao-mensagens';
import { SugestaoPublicaRateLimit } from '@/domain/sugestoes/sugestao-publica-rate-limit';
import { getAuthSecret } from '@/lib/auth/auth-secret';
import { createServiceRoleClient } from '@/lib/clients/supabase-client-factory';
import { SugestaoAcessoStoreSupabase } from '@/lib/services/sugestao-acesso-store';
import { SugestaoAtivosPorCpfSupabase } from '@/lib/services/sugestao-ativos-por-cpf';
import { SugestaoIdentificarAcao } from '@/lib/services/sugestao-identificar-acao';

export async function POST(request: Request) {
  let cpf = '';
  try {
    const body = await request.json() as { cpf?: unknown };
    cpf = typeof body.cpf === 'string' ? body.cpf : '';
  } catch {
    return NextResponse.json({ mensagem: SUGESTAO_MENSAGENS.cpfInvalido }, { status: 400 });
  }
  const db = createServiceRoleClient();
  const secret = getAuthSecret();
  const acao = new SugestaoIdentificarAcao(
    new SugestaoPublicaRateLimit(new SugestaoAcessoStoreSupabase(db), secret),
    new SugestaoCpfConsulta(new CpfVerificador(), new SugestaoAtivosPorCpfSupabase(db)),
    new SugestaoIdentificacaoToken(secret),
  );
  const resposta = await acao.executar(cpf, new SugestaoIpOrigem().extrair(request.headers));
  return NextResponse.json(resposta.body, { status: resposta.status });
}
