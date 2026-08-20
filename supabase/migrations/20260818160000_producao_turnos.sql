CREATE TABLE public.config_operacao_turnos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  etapa text NOT NULL CHECK (etapa IN ('fermentacao', 'forno', 'embalagem')),
  numero smallint NOT NULL CHECK (numero IN (1, 2, 3)),
  inicio time NOT NULL,
  fim time NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT config_operacao_turnos_duracao_chk CHECK (inicio <> fim),
  CONSTRAINT config_operacao_turnos_unique UNIQUE (etapa, numero)
);

INSERT INTO public.config_operacao_turnos (etapa, numero, inicio, fim)
SELECT 'fermentacao', 1, horario_inicio_producao, horario_fim_producao FROM public.config_operacao
UNION ALL
SELECT 'forno', 1, horario_inicio_forno, horario_fim_forno FROM public.config_operacao
UNION ALL
SELECT 'embalagem', 1, horario_inicio_embalagem, horario_fim_embalagem FROM public.config_operacao;

ALTER TABLE public.config_operacao
  DROP CONSTRAINT IF EXISTS config_operacao_producao_janela_chk,
  DROP CONSTRAINT IF EXISTS config_operacao_forno_janela_chk,
  DROP CONSTRAINT IF EXISTS config_operacao_embalagem_janela_chk;

ALTER TABLE public.config_operacao
  DROP COLUMN horario_inicio_producao,
  DROP COLUMN horario_fim_producao,
  DROP COLUMN horario_inicio_forno,
  DROP COLUMN horario_fim_forno,
  DROP COLUMN horario_inicio_embalagem,
  DROP COLUMN horario_fim_embalagem;

CREATE TABLE public.producao_turno_ativo (
  etapa text PRIMARY KEY CHECK (etapa IN ('fermentacao', 'forno', 'embalagem')),
  numero smallint NOT NULL CHECK (numero IN (1, 2, 3)),
  confirmado_em timestamptz NOT NULL
);

ALTER TABLE public.fermentacao_lotes
  ADD COLUMN turno smallint NULL CHECK (turno IN (1, 2, 3));
ALTER TABLE public.forno_lotes
  ADD COLUMN turno smallint NULL CHECK (turno IN (1, 2, 3));
ALTER TABLE public.embalagem_lotes
  ADD COLUMN turno smallint NULL CHECK (turno IN (1, 2, 3));

ALTER TABLE public.config_operacao_turnos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.producao_turno_ativo ENABLE ROW LEVEL SECURITY;

CREATE POLICY config_operacao_turnos_select ON public.config_operacao_turnos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY config_operacao_turnos_write ON public.config_operacao_turnos
  FOR ALL TO authenticated USING ((SELECT is_admin())) WITH CHECK ((SELECT is_admin()));

CREATE POLICY producao_turno_ativo_select ON public.producao_turno_ativo
  FOR SELECT TO authenticated USING (true);
CREATE POLICY producao_turno_ativo_insert ON public.producao_turno_ativo
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY producao_turno_ativo_update ON public.producao_turno_ativo
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY producao_turno_ativo_delete ON public.producao_turno_ativo
  FOR DELETE TO authenticated USING ((SELECT is_admin()));
