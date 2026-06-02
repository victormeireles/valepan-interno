-- Migração one-off: mover whatsapp_notificacoes_config de public → interno
-- (já aplicada em produção via Supabase migration whatsapp_notificacoes_config_move_to_interno)

CREATE TABLE IF NOT EXISTS interno.whatsapp_notificacoes_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  embalagem_habilitado boolean NOT NULL DEFAULT false,
  fermentacao_habilitado boolean NOT NULL DEFAULT false,
  forno_habilitado boolean NOT NULL DEFAULT false,
  saidas_habilitado boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE interno.whatsapp_notificacoes_config ENABLE ROW LEVEL SECURITY;

INSERT INTO interno.whatsapp_notificacoes_config (
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
FROM public.whatsapp_notificacoes_config
WHERE EXISTS (SELECT 1 FROM public.whatsapp_notificacoes_config LIMIT 1)
  AND NOT EXISTS (SELECT 1 FROM interno.whatsapp_notificacoes_config LIMIT 1);

INSERT INTO interno.whatsapp_notificacoes_config (
  embalagem_habilitado,
  fermentacao_habilitado,
  forno_habilitado,
  saidas_habilitado
)
SELECT false, false, false, false
WHERE NOT EXISTS (SELECT 1 FROM interno.whatsapp_notificacoes_config LIMIT 1);

DROP TABLE IF EXISTS public.whatsapp_notificacoes_config;
