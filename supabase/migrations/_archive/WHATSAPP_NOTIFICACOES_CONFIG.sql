-- WHATSAPP_NOTIFICACOES_CONFIG.sql
-- Tabela no schema public.
-- Aplicar no SQL Editor do Supabase (projeto valepan-pedidos).

CREATE TABLE IF NOT EXISTS public.whatsapp_notificacoes_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  embalagem_habilitado boolean NOT NULL DEFAULT false,
  fermentacao_habilitado boolean NOT NULL DEFAULT false,
  forno_habilitado boolean NOT NULL DEFAULT false,
  saidas_habilitado boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_notificacoes_config ENABLE ROW LEVEL SECURITY;

-- Sem políticas para authenticated/anon: apenas service role (bypass RLS) acessa via API interna.

INSERT INTO public.whatsapp_notificacoes_config (
  embalagem_habilitado,
  fermentacao_habilitado,
  forno_habilitado,
  saidas_habilitado
)
SELECT false, false, false, false
WHERE NOT EXISTS (SELECT 1 FROM public.whatsapp_notificacoes_config LIMIT 1);
