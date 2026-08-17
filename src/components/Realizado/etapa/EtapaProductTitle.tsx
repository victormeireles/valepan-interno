'use client';

import { resolveTipoEstoqueMarca } from '@/lib/utils/cliente-display';
import AssadeiraNomeBadge from './AssadeiraNomeBadge';
import DataEtiquetaBadge from './DataEtiquetaBadge';
import TipoEstoqueMarcaBadge from './TipoEstoqueMarcaBadge';

type ProductBadgesProps = {
  congelado?: boolean;
  hasPhoto?: boolean;
  onProductPhotoClick?: () => void;
};

function ProductBadges({ congelado, hasPhoto, onProductPhotoClick }: ProductBadgesProps) {
  return (
    <>
      {congelado ? (
        <span
          className="material-icons shrink-0 text-base text-sky-500"
          title="Congelado"
          aria-label="Congelado"
        >
          ac_unit
        </span>
      ) : null}
      {hasPhoto ? (
        onProductPhotoClick ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onProductPhotoClick();
            }}
            className="material-icons shrink-0 text-base text-amber-600"
            title="Ver foto"
            aria-label="Ver foto do produto"
          >
            photo_camera
          </button>
        ) : (
          <span
            className="material-icons shrink-0 text-base text-amber-600"
            title="Tem foto"
            aria-hidden="true"
          >
            photo_camera
          </span>
        )
      ) : null}
    </>
  );
}

export type EtapaProductTitleProps = {
  produto: string;
  assadeira?: string;
  tipoEstoqueCliente?: string;
  showTipoEstoqueMarcaBadge?: boolean;
  dataEtiqueta?: string;
  congelado?: boolean;
  hasPhoto?: boolean;
  onProductPhotoClick?: () => void;
};

export default function EtapaProductTitle({
  produto,
  assadeira,
  tipoEstoqueCliente,
  showTipoEstoqueMarcaBadge = false,
  dataEtiqueta,
  congelado,
  hasPhoto,
  onProductPhotoClick,
}: EtapaProductTitleProps) {
  const marca =
    showTipoEstoqueMarcaBadge && tipoEstoqueCliente
      ? resolveTipoEstoqueMarca(tipoEstoqueCliente)
      : null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {assadeira ? <AssadeiraNomeBadge nome={assadeira} /> : null}
      <span className="text-base font-semibold leading-snug tracking-[-0.004em] text-text-strong">
        {produto}
      </span>
      {marca ? <TipoEstoqueMarcaBadge marca={marca} /> : null}
      <ProductBadges
        congelado={congelado}
        hasPhoto={hasPhoto}
        onProductPhotoClick={onProductPhotoClick}
      />
      {dataEtiqueta ? <DataEtiquetaBadge data={dataEtiqueta} /> : null}
    </div>
  );
}
