CREATE TABLE public.reclamacao_categorias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  ordem int NOT NULL,
  ativa boolean NOT NULL DEFAULT true,
  exige_observacao boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT reclamacao_categorias_nome_chk CHECK (length(trim(nome)) > 0)
);

CREATE UNIQUE INDEX reclamacao_categorias_nome_ativa_uidx
  ON public.reclamacao_categorias (lower(trim(nome)))
  WHERE ativa;

INSERT INTO public.reclamacao_categorias (nome, ordem, exige_observacao) VALUES
  ('Mofado', 1, false),
  ('Amassado', 2, false),
  ('Cru ou branco', 3, false),
  ('Queimado', 4, false),
  ('Tamanho', 5, false),
  ('Coloração', 6, false),
  ('Base fina (corte)', 7, false),
  ('Brilho', 8, false),
  ('Confeito', 9, false),
  ('Corte irregular', 10, false),
  ('Sujeira', 11, false),
  ('Outros', 12, true);

CREATE TABLE public.reclamacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES public.clientes(id),
  produto_id uuid NOT NULL REFERENCES public.produtos(id),
  categoria_id uuid NOT NULL REFERENCES public.reclamacao_categorias(id),
  observacao text NULL,
  data_fabricacao date NOT NULL,
  data_problema date NOT NULL,
  quantidade int NOT NULL CHECK (quantidade >= 1),
  unidade text NOT NULL CHECK (unidade IN ('pacotes', 'caixas')),
  criado_por uuid NULL REFERENCES public.usuarios(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX reclamacoes_data_problema_idx ON public.reclamacoes (data_problema DESC);
CREATE INDEX reclamacoes_cliente_id_idx ON public.reclamacoes (cliente_id);
CREATE INDEX reclamacoes_produto_id_idx ON public.reclamacoes (produto_id);
CREATE INDEX reclamacoes_categoria_id_idx ON public.reclamacoes (categoria_id);
CREATE INDEX reclamacoes_criado_por_idx ON public.reclamacoes (criado_por);

CREATE TABLE public.reclamacao_fotos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reclamacao_id uuid NOT NULL REFERENCES public.reclamacoes(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  ordem int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX reclamacao_fotos_reclamacao_id_idx
  ON public.reclamacao_fotos (reclamacao_id);

ALTER TABLE public.reclamacao_categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reclamacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reclamacao_fotos ENABLE ROW LEVEL SECURITY;

CREATE POLICY reclamacao_categorias_select ON public.reclamacao_categorias
  FOR SELECT TO authenticated USING (true);
CREATE POLICY reclamacao_categorias_write ON public.reclamacao_categorias
  FOR ALL TO authenticated USING ((SELECT is_admin())) WITH CHECK ((SELECT is_admin()));

CREATE POLICY reclamacoes_select ON public.reclamacoes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY reclamacoes_insert ON public.reclamacoes
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY reclamacoes_update ON public.reclamacoes
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY reclamacoes_delete ON public.reclamacoes
  FOR DELETE TO authenticated USING ((SELECT is_admin()));

CREATE POLICY reclamacao_fotos_select ON public.reclamacao_fotos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY reclamacao_fotos_insert ON public.reclamacao_fotos
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY reclamacao_fotos_update ON public.reclamacao_fotos
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY reclamacao_fotos_delete ON public.reclamacao_fotos
  FOR DELETE TO authenticated USING ((SELECT is_admin()));

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('reclamacoes', 'reclamacoes', false, 4194304, ARRAY['image/jpeg']::text[])
ON CONFLICT (id) DO NOTHING;
