'use client';

import { useCallback, useEffect, useState } from 'react';
import { compressImage } from '@/utils/imageCompression';
import {
  deleteFaltaAnexo,
  fetchFaltaAnexoUrl,
  postFaltaAnexo,
} from '@/features/pessoas/falta-anexo-client';

type Params = {
  faltaId?: string;
  temAnexo: boolean;
  onRemoveuRemoto?: () => void;
  onEnviouRemoto?: () => void;
};

export function useFaltaAnexoRemoto({
  faltaId,
  temAnexo,
  onRemoveuRemoto,
  onEnviouRemoto,
}: Params) {
  const [existeRemoto, setExisteRemoto] = useState(temAnexo);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    setExisteRemoto(temAnexo);
  }, [temAnexo, faltaId]);

  useEffect(() => {
    if (!faltaId || !existeRemoto) {
      setSignedUrl(null);
      return;
    }
    let cancelado = false;
    void fetchFaltaAnexoUrl(faltaId).then((url) => {
      if (!cancelado) setSignedUrl(url);
    });
    return () => {
      cancelado = true;
    };
  }, [faltaId, existeRemoto]);

  const enviar = useCallback(
    async (file: File) => {
      if (!faltaId) return;
      setOcupado(true);
      setErro(null);
      try {
        const comprimido = await compressImage(file, 4);
        const ok = await postFaltaAnexo(faltaId, comprimido);
        if (!ok) {
          setErro('Erro ao enviar anexo.');
          return;
        }
        setExisteRemoto(true);
        onEnviouRemoto?.();
      } finally {
        setOcupado(false);
      }
    },
    [faltaId, onEnviouRemoto],
  );

  const remover = useCallback(async () => {
    if (!faltaId) return;
    setOcupado(true);
    setErro(null);
    try {
      const ok = await deleteFaltaAnexo(faltaId);
      if (!ok) {
        setErro('Erro ao remover anexo.');
        return;
      }
      setExisteRemoto(false);
      setSignedUrl(null);
      onRemoveuRemoto?.();
    } finally {
      setOcupado(false);
    }
  }, [faltaId, onRemoveuRemoto]);

  return { existeRemoto, signedUrl, ocupado, erro, enviar, remover };
}
