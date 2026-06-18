-- DROP_INTERNO_MOVE_WHATSAPP_TO_PUBLIC.sql
-- Move whatsapp_notificacoes_config para public e remove schema interno abandonado.

CREATE TABLE IF NOT EXISTS public.whatsapp_notificacoes_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  embalagem_habilitado boolean NOT NULL DEFAULT false,
  fermentacao_habilitado boolean NOT NULL DEFAULT false,
  forno_habilitado boolean NOT NULL DEFAULT false,
  saidas_habilitado boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_notificacoes_config ENABLE ROW LEVEL SECURITY;

INSERT INTO public.whatsapp_notificacoes_config (
  id,
  embalagem_habilitado,
  fermentacao_habilitado,
  forno_habilitado,
  saidas_habilitado,
  updated_at
)
SELECT
  id,
  embalagem_habilitado,
  fermentacao_habilitado,
  forno_habilitado,
  saidas_habilitado,
  updated_at
FROM interno.whatsapp_notificacoes_config
WHERE NOT EXISTS (SELECT 1 FROM public.whatsapp_notificacoes_config LIMIT 1);

INSERT INTO public.whatsapp_notificacoes_config (
  embalagem_habilitado,
  fermentacao_habilitado,
  forno_habilitado,
  saidas_habilitado
)
SELECT false, false, false, false
WHERE NOT EXISTS (SELECT 1 FROM public.whatsapp_notificacoes_config LIMIT 1);

DROP SCHEMA IF EXISTS interno CASCADE;
