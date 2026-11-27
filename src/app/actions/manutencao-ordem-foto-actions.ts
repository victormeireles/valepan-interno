'use server';

import { requireInternoQualquerModulo } from '@/lib/auth/require-interno-modulo';
import { uploadPhotoToDrive } from '@/lib/googleDrive';

const MODULO_OFICINA = 'interno_manutencao';
const MAX_BYTES = 4 * 1024 * 1024;

type Recusa = { ok: false; mensagem: string };
type Envio = { ok: true; url: string; id: string } | Recusa;
type Arquivo = { ok: true; arquivo: File } | Recusa;

export async function enviarFotoFinalizacao(
  numero: number,
  formData: FormData,
): Promise<Envio> {
  await requireInternoQualquerModulo([MODULO_OFICINA], 'editar');
  if (!Number.isInteger(numero) || numero <= 0) {
    return { ok: false, mensagem: 'Ordem não encontrada.' };
  }
  const foto = arquivoDe(formData.get('photo'));
  if (!foto.ok) return foto;
  return subir(numero, foto.arquivo);
}

function arquivoDe(valor: FormDataEntryValue | null): Arquivo {
  if (!(valor instanceof File) || valor.size === 0) {
    return { ok: false, mensagem: 'Envie uma foto.' };
  }
  if (!valor.type.startsWith('image/')) {
    return { ok: false, mensagem: 'Apenas arquivos de imagem são permitidos.' };
  }
  if (valor.size > MAX_BYTES) {
    return { ok: false, mensagem: 'Imagem deve ter no máximo 4MB.' };
  }
  return { ok: true, arquivo: valor };
}

async function subir(numero: number, arquivo: File): Promise<Envio> {
  try {
    const buffer = Buffer.from(await arquivo.arrayBuffer());
    const upload = await uploadPhotoToDrive(buffer, arquivo.name, arquivo.type, numero, 'ordem');
    return { ok: true, url: upload.photoUrl, id: upload.photoId };
  } catch {
    return { ok: false, mensagem: 'Não foi possível enviar a foto.' };
  }
}
