CREATE TABLE public.sugestoes_melhoria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id uuid NOT NULL REFERENCES public.pessoas_colaboradores(id) ON DELETE RESTRICT,
  tema text NOT NULL CHECK (tema IN (
    'seguranca', 'qualidade', 'organizacao', 'processos',
    'eficiencia', 'seguranca_alimentos', 'inovacao'
  )),
  texto text NOT NULL,
  foto_path text NULL,
  criado_em timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sugestoes_melhoria_texto_chk CHECK (
    char_length(texto) BETWEEN 10 AND 2000 AND texto = btrim(texto)
  )
);

CREATE INDEX sugestoes_melhoria_criado_em_idx ON public.sugestoes_melhoria (criado_em DESC);
CREATE INDEX sugestoes_melhoria_tema_idx ON public.sugestoes_melhoria (tema);

CREATE TABLE public.sugestoes_publica_acessos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_hash text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('identificar', 'enviar')),
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX sugestoes_publica_acessos_janela_idx
  ON public.sugestoes_publica_acessos (ip_hash, tipo, criado_em DESC);

ALTER TABLE public.sugestoes_melhoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sugestoes_publica_acessos ENABLE ROW LEVEL SECURITY;

CREATE POLICY sugestoes_melhoria_select ON public.sugestoes_melhoria
  FOR SELECT TO authenticated USING (true);
CREATE POLICY sugestoes_melhoria_update ON public.sugestoes_melhoria
  FOR UPDATE TO authenticated
  USING ((SELECT is_admin())) WITH CHECK ((SELECT is_admin()));
CREATE POLICY sugestoes_melhoria_delete ON public.sugestoes_melhoria
  FOR DELETE TO authenticated USING ((SELECT is_admin()));

CREATE FUNCTION public.sugestoes_ativos_por_cpf(digitos text)
RETURNS TABLE (id uuid, nome text)
LANGUAGE sql STABLE
AS $$
  SELECT c.id, c.nome FROM public.pessoas_colaboradores c
  WHERE c.situacao = 'ativo'
    AND regexp_replace(coalesce(c.cpf, ''), '\D', '', 'g') = digitos;
$$;

REVOKE ALL ON FUNCTION public.sugestoes_ativos_por_cpf(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sugestoes_ativos_por_cpf(text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sugestoes_ativos_por_cpf(text) TO service_role;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'sugestoes-melhoria', 'sugestoes-melhoria', false, 5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO NOTHING;
