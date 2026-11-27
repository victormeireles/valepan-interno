'use client';

import { useState } from 'react';
import { enviarFotoFinalizacao } from '@/app/actions/manutencao-ordem-foto-actions';
import type { FotoOrdemValor } from '@/domain/manutencao/foto-ordem';

export type FotoSalva = { url: string; id: string } | null;

type Resolvida = { ok: true; foto: FotoOrdemValor | null } | { ok: false; mensagem: string };

export function useFotoFinalizacao(inicial: FotoSalva) {
  const estado = useEstadoFoto(inicial);
  return {
    ...estado,
    resolver: (numero: number) => resolverFoto(numero, estado.arquivo, estado.salva),
  };
}

function useEstadoFoto(inicial: FotoSalva) {
  const haviaFoto = Boolean(inicial?.url && inicial.id);
  const [arquivo, definirArquivo] = useState<File | null>(null);
  const [salva, definirSalva] = useState<FotoSalva>(inicial);
  const [removida, definirRemovida] = useState(false);

  function selecionar(file: File) {
    definirArquivo(file);
    definirRemovida(false);
  }

  function removerNova() {
    definirArquivo(null);
    if (haviaFoto && salva === null) definirRemovida(true);
  }

  function removerSalva() {
    definirSalva(null);
    definirArquivo(null);
    definirRemovida(true);
  }

  return {
    salva,
    removida,
    mostrarSalva: Boolean(salva?.url) && arquivo === null,
    selecionar,
    removerNova,
    removerSalva,
    arquivo,
  };
}

async function resolverFoto(
  numero: number,
  arquivo: File | null,
  salva: FotoSalva,
): Promise<Resolvida> {
  if (!arquivo) return { ok: true, foto: salva };
  const form = new FormData();
  form.append('photo', arquivo);
  const enviada = await enviarFotoFinalizacao(numero, form);
  if (!enviada.ok) return enviada;
  return { ok: true, foto: { url: enviada.url, id: enviada.id } };
}
