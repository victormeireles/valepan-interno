ALTER TABLE public.pessoas_faltas
  ADD COLUMN IF NOT EXISTS medida text NULL,
  ADD COLUMN IF NOT EXISTS anexo_storage_path text NULL;

ALTER TABLE public.pessoas_faltas
  DROP CONSTRAINT IF EXISTS pessoas_faltas_medida_check;

ALTER TABLE public.pessoas_faltas
  ADD CONSTRAINT pessoas_faltas_medida_check
  CHECK (medida IS NULL OR medida IN ('advertencia', 'suspensao', 'justa_causa'));

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('pessoas-faltas', 'pessoas-faltas', false, 4194304, ARRAY['image/jpeg']::text[])
ON CONFLICT (id) DO NOTHING;
