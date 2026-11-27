import { FotoOrdem, type FotoOrdemValor } from '@/domain/manutencao/foto-ordem';
import type { ClienteOrdem } from '@/app/actions/manutencao-ordem-leitura';

type Resultado = { ok: true } | { ok: false; mensagem: string };
type Sucesso = { ok: true; mensagem: string };

const FALHA = 'Não foi possível salvar a foto.';
const AVISO = 'A foto não foi salva. Edite a finalização para enviar de novo.';

export async function anexarFotoNaOrdem(
  client: ClienteOrdem,
  ordemId: string,
  foto: FotoOrdemValor | null,
  sucesso: Sucesso,
): Promise<Sucesso | { ok: false; mensagem: string }> {
  const gravada = await persistirFotoOrdem(client, ordemId, foto);
  if (!gravada.ok) return { ok: true, mensagem: `${sucesso.mensagem} ${AVISO}` };
  return sucesso;
}

export async function persistirFotoOrdem(
  client: ClienteOrdem,
  ordemId: string,
  foto: FotoOrdemValor | null,
): Promise<Resultado> {
  const validada = new FotoOrdem().validar(foto);
  if (!validada.ok) return validada;
  const { data, error } = await client
    .from('manutencao_ordens' as never)
    .update({
      foto_url: validada.foto?.url ?? null,
      foto_id: validada.foto?.id ?? null,
      updated_at: new Date().toISOString(),
    } as never)
    .eq('id', ordemId)
    .select('id');
  if (error || !Array.isArray(data) || data.length === 0) return { ok: false, mensagem: FALHA };
  return { ok: true };
}
