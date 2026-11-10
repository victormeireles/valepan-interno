-- Planos preventivos. O job abre uma ordem quando a data chega e empurra
-- a próxima para o encaixe estritamente depois de hoje em São Paulo.
-- Dia da semana 1=segunda … 7=domingo, o mesmo de ProximaDataPreventiva.

CREATE TABLE public.manutencao_planos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  maquina_id uuid NOT NULL REFERENCES public.manutencao_maquinas(id),
  descricao text NOT NULL CHECK (btrim(descricao) <> ''),
  ativo boolean NOT NULL DEFAULT true,
  frequencia_tipo text NOT NULL CHECK (
    frequencia_tipo IN ('a_cada_n_dias', 'semanal', 'mensal')
  ),
  intervalo_dias integer NULL CHECK (intervalo_dias IS NULL OR intervalo_dias >= 1),
  dia_semana integer NULL CHECK (dia_semana IS NULL OR dia_semana BETWEEN 1 AND 7),
  dia_mes integer NULL CHECK (dia_mes IS NULL OR dia_mes BETWEEN 1 AND 28),
  ancora_em date NULL,
  proxima_em date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT manutencao_planos_frequencia CHECK (
    (
      frequencia_tipo = 'a_cada_n_dias'
      AND intervalo_dias IS NOT NULL
      AND ancora_em IS NOT NULL
      AND dia_semana IS NULL
      AND dia_mes IS NULL
    )
    OR (
      frequencia_tipo = 'semanal'
      AND dia_semana IS NOT NULL
      AND intervalo_dias IS NULL
      AND dia_mes IS NULL
      AND ancora_em IS NULL
    )
    OR (
      frequencia_tipo = 'mensal'
      AND dia_mes IS NOT NULL
      AND intervalo_dias IS NULL
      AND dia_semana IS NULL
      AND ancora_em IS NULL
    )
  )
);

CREATE INDEX manutencao_planos_maquina_id_idx
  ON public.manutencao_planos (maquina_id);

ALTER TABLE public.manutencao_ordens
  ADD CONSTRAINT manutencao_ordens_plano_id_fkey
  FOREIGN KEY (plano_id) REFERENCES public.manutencao_planos(id);

ALTER TABLE public.manutencao_planos ENABLE ROW LEVEL SECURITY;

CREATE POLICY manutencao_planos_select ON public.manutencao_planos
  FOR SELECT TO authenticated
  USING (
    (SELECT auth_tem_modulo('interno_manutencao', 'ler'))
    OR (SELECT is_admin())
  );

CREATE POLICY manutencao_planos_insert ON public.manutencao_planos
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT auth_tem_modulo('interno_manutencao', 'editar'))
    OR (SELECT is_admin())
  );

CREATE POLICY manutencao_planos_update ON public.manutencao_planos
  FOR UPDATE TO authenticated
  USING (
    (SELECT auth_tem_modulo('interno_manutencao', 'editar'))
    OR (SELECT is_admin())
  )
  WITH CHECK (
    (SELECT auth_tem_modulo('interno_manutencao', 'editar'))
    OR (SELECT is_admin())
  );

CREATE OR REPLACE FUNCTION public.manutencao_gerar_preventivas()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hoje date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_criadas integer := 0;
  v_plano record;
  v_proxima date;
  v_salto integer;
  v_decorridos integer;
BEGIN
  FOR v_plano IN
    SELECT
      plano.id,
      plano.maquina_id,
      plano.descricao,
      plano.frequencia_tipo,
      plano.intervalo_dias,
      plano.dia_semana,
      plano.dia_mes,
      plano.ancora_em,
      maquina.setor_id
    FROM public.manutencao_planos AS plano
    INNER JOIN public.manutencao_maquinas AS maquina
      ON maquina.id = plano.maquina_id
    WHERE plano.ativo
      AND maquina.ativo
      AND plano.proxima_em <= v_hoje
    ORDER BY plano.id
    FOR UPDATE OF plano
  LOOP
    IF EXISTS (
      SELECT 1
      FROM public.manutencao_ordens AS ordem
      WHERE ordem.plano_id = v_plano.id
        AND ordem.status IN ('aberta', 'recebida')
    ) THEN
      CONTINUE;
    END IF;

    INSERT INTO public.manutencao_ordens (
      numero,
      tipo,
      plano_id,
      maquina_id,
      setor_id,
      urgencia,
      tipo_problema,
      descricao,
      status,
      aberta_por
    ) VALUES (
      nextval('public.manutencao_ordens_numero_seq'),
      'preventiva',
      v_plano.id,
      v_plano.maquina_id,
      v_plano.setor_id,
      NULL,
      NULL,
      v_plano.descricao,
      'aberta',
      NULL
    );

    IF v_plano.frequencia_tipo = 'a_cada_n_dias' THEN
      IF v_hoje < v_plano.ancora_em THEN
        v_proxima := v_plano.ancora_em;
      ELSE
        v_decorridos := v_hoje - v_plano.ancora_em;
        v_proxima := v_plano.ancora_em
          + ((v_decorridos / v_plano.intervalo_dias) + 1) * v_plano.intervalo_dias;
      END IF;
    ELSIF v_plano.frequencia_tipo = 'semanal' THEN
      v_salto := v_plano.dia_semana - EXTRACT(ISODOW FROM v_hoje)::integer;
      IF v_salto <= 0 THEN
        v_salto := v_salto + 7;
      END IF;
      v_proxima := v_hoje + v_salto;
    ELSE
      IF EXTRACT(DAY FROM v_hoje)::integer < v_plano.dia_mes THEN
        v_proxima := make_date(
          EXTRACT(YEAR FROM v_hoje)::integer,
          EXTRACT(MONTH FROM v_hoje)::integer,
          v_plano.dia_mes
        );
      ELSIF EXTRACT(MONTH FROM v_hoje)::integer = 12 THEN
        v_proxima := make_date(EXTRACT(YEAR FROM v_hoje)::integer + 1, 1, v_plano.dia_mes);
      ELSE
        v_proxima := make_date(
          EXTRACT(YEAR FROM v_hoje)::integer,
          EXTRACT(MONTH FROM v_hoje)::integer + 1,
          v_plano.dia_mes
        );
      END IF;
    END IF;

    UPDATE public.manutencao_planos
    SET proxima_em = v_proxima,
        updated_at = now()
    WHERE id = v_plano.id;

    v_criadas := v_criadas + 1;
  END LOOP;

  RETURN v_criadas;
END;
$$;

REVOKE ALL ON FUNCTION public.manutencao_gerar_preventivas() FROM PUBLIC, anon, authenticated;

CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'manutencao-gerar-preventivas') THEN
    PERFORM cron.unschedule('manutencao-gerar-preventivas');
  END IF;
END $$;

SELECT cron.schedule(
  'manutencao-gerar-preventivas',
  '10 3 * * *',
  $$SELECT public.manutencao_gerar_preventivas()$$
);
