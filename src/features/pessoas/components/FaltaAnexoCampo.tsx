'use client';

import { useEffect, useState } from 'react';
import { IconButton } from '@/components/ui/IconButton';
import { ReclamacaoFotoLightbox } from '@/features/reclamacoes/components/ReclamacaoFotoLightbox';
import { useFaltaAnexoRemoto } from './useFaltaAnexoRemoto';

type Props = {
  faltaId?: string;
  temAnexo: boolean;
  arquivoLocal: File | null;
  onArquivo: (file: File | null) => void;
  onRemoveuRemoto?: () => void;
  /** Chamado após upload imediato bem-sucedido (modo edição). */
  onEnviouRemoto?: () => void;
};

const BOTAO_CLASSE =
  'inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-[9px] border border-border-default bg-surface px-3.5 text-sm font-medium text-stone-700 shadow-control focus-within:ring-2 focus-within:ring-amber-500 aria-disabled:cursor-not-allowed aria-disabled:opacity-50';

function legendaAnexo(ocupado: boolean, temMiniatura: boolean, src: string | null): string {
  if (ocupado) return 'Enviando…';
  if (temMiniatura && !src) return 'Carregando anexo…';
  if (temMiniatura) return 'Imagem anexada. Toque para ampliar.';
  return 'Opcional. Uma imagem por falta.';
}

type EscolhaProps = {
  icone: string;
  rotulo: string;
  capture?: 'environment';
  desabilitado: boolean;
  onFile: (file: File) => void;
};

function MiniaturaAnexo({
  src,
  ocupado,
  onAbrir,
  onRemover,
}: {
  src: string | null;
  ocupado: boolean;
  onAbrir: () => void;
  onRemover: () => void;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-stone-200 bg-stone-50">
      <button
        type="button"
        className="flex min-h-24 w-full cursor-pointer items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        onClick={() => src && onAbrir()}
        aria-label="Ver anexo"
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" className="max-h-56 w-full object-contain" />
        ) : (
          <span className="material-icons text-3xl text-stone-300" aria-hidden="true">
            photo
          </span>
        )}
      </button>
      <div className="absolute right-2 top-2">
        <IconButton
          icon="close"
          label="Remover anexo"
          size="lg"
          variant="solid"
          disabled={ocupado}
          onClick={onRemover}
        />
      </div>
    </div>
  );
}

function EscolhaArquivo({ icone, rotulo, capture, desabilitado, onFile }: EscolhaProps) {
  return (
    <label className={BOTAO_CLASSE} aria-disabled={desabilitado}>
      <span className="material-icons text-[17px]" aria-hidden="true">
        {icone}
      </span>
      {rotulo}
      <input
        type="file"
        accept="image/*"
        capture={capture}
        className="sr-only"
        disabled={desabilitado}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file && file.type.startsWith('image/')) onFile(file);
          event.target.value = '';
        }}
      />
    </label>
  );
}

export default function FaltaAnexoCampo({
  faltaId,
  temAnexo,
  arquivoLocal,
  onArquivo,
  onRemoveuRemoto,
  onEnviouRemoto,
}: Props) {
  const [ampliada, setAmpliada] = useState(false);
  const remoto = useFaltaAnexoRemoto({
    faltaId,
    temAnexo,
    onRemoveuRemoto,
    onEnviouRemoto,
  });

  const [localUrl, setLocalUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!arquivoLocal) {
      setLocalUrl(null);
      return;
    }
    const url = URL.createObjectURL(arquivoLocal);
    setLocalUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [arquivoLocal]);

  const modoEdicao = Boolean(faltaId);
  const src = localUrl ?? (modoEdicao && remoto.existeRemoto ? remoto.signedUrl : null);
  const temMiniatura = Boolean(localUrl) || (modoEdicao && remoto.existeRemoto);

  const handleFile = (file: File) => {
    if (modoEdicao) void remoto.enviar(file);
    else onArquivo(file);
  };

  const handleRemover = () => {
    if (arquivoLocal) onArquivo(null);
    else if (modoEdicao) void remoto.remover();
  };

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium tracking-[-0.004em] text-stone-700">Anexo</p>
      <div className="flex flex-wrap gap-2">
        <EscolhaArquivo
          icone="add_photo_alternate"
          rotulo="Galeria"
          desabilitado={remoto.ocupado}
          onFile={handleFile}
        />
        <EscolhaArquivo
          icone="photo_camera"
          rotulo="Câmera"
          capture="environment"
          desabilitado={remoto.ocupado}
          onFile={handleFile}
        />
      </div>
      {temMiniatura ? (
        <MiniaturaAnexo
          src={src}
          ocupado={remoto.ocupado}
          onAbrir={() => setAmpliada(true)}
          onRemover={handleRemover}
        />
      ) : null}
      <p className="text-xs text-text-muted">{legendaAnexo(remoto.ocupado, temMiniatura, src)}</p>
      {remoto.erro ? (
        <p role="alert" className="text-xs font-medium text-red-700">
          {remoto.erro}
        </p>
      ) : null}

      {ampliada && src ? (
        <ReclamacaoFotoLightbox srcs={[src]} inicial={0} onClose={() => setAmpliada(false)} />
      ) : null}
    </div>
  );
}
