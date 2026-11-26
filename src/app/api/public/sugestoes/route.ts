import { NextResponse } from 'next/server';
import { SugestaoFotoRegra, type SugestaoFotoEntrada } from '@/domain/sugestoes/sugestao-foto-regra';
import { SugestaoIdentificacaoToken } from '@/domain/sugestoes/sugestao-identificacao-token';
import { SugestaoIpOrigem } from '@/domain/sugestoes/sugestao-ip';
import { SugestaoPublicaRateLimit } from '@/domain/sugestoes/sugestao-publica-rate-limit';
import { SugestaoTemaCatalogo } from '@/domain/sugestoes/sugestao-tema-catalogo';
import { SugestaoTextoRegra } from '@/domain/sugestoes/sugestao-texto-regra';
import { getAuthSecret } from '@/lib/auth/auth-secret';
import { createServiceRoleClient } from '@/lib/clients/supabase-client-factory';
import { SugestaoAcessoStoreSupabase } from '@/lib/services/sugestao-acesso-store';
import { SugestaoEnviarAcao } from '@/lib/services/sugestao-enviar-acao';
import { SugestaoFotoStorage } from '@/lib/services/sugestao-foto-storage';
import { SugestaoInsertSupabase } from '@/lib/services/sugestao-insert-supabase';
import { SugestaoRegistro } from '@/lib/services/sugestao-registro';

async function lerFoto(form: FormData): Promise<SugestaoFotoEntrada | null> {
  const arquivo = form.get('foto');
  if (!(arquivo instanceof File) || arquivo.size === 0) return null;
  return { type: arquivo.type, size: arquivo.size, bytes: new Uint8Array(await arquivo.arrayBuffer()) };
}

export async function POST(request: Request) {
  const form = await request.formData();
  const db = createServiceRoleClient();
  const secret = getAuthSecret();
  const acao = new SugestaoEnviarAcao(
    new SugestaoPublicaRateLimit(new SugestaoAcessoStoreSupabase(db), secret),
    new SugestaoIdentificacaoToken(secret),
    new SugestaoTemaCatalogo(),
    new SugestaoTextoRegra(),
    new SugestaoFotoRegra(),
    new SugestaoRegistro(new SugestaoInsertSupabase(db), new SugestaoFotoStorage(db)),
  );
  const resposta = await acao.executar({
    token: String(form.get('token') ?? ''),
    tema: String(form.get('tema') ?? ''),
    texto: String(form.get('texto') ?? ''),
    foto: await lerFoto(form),
    ip: new SugestaoIpOrigem().extrair(request.headers),
  });
  return NextResponse.json(resposta.body, { status: resposta.status });
}
