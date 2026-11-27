-- Foto opcional da finalização. As duas colunas andam juntas.

ALTER TABLE public.manutencao_ordens
  ADD COLUMN foto_url text,
  ADD COLUMN foto_id text,
  ADD CONSTRAINT manutencao_ordens_foto CHECK (
    (foto_url IS NULL AND foto_id IS NULL)
    OR (
      foto_url IS NOT NULL
      AND foto_id IS NOT NULL
      AND btrim(foto_url) <> ''
      AND btrim(foto_id) <> ''
    )
  );

GRANT SELECT (foto_url, foto_id) ON public.manutencao_ordens TO authenticated;
