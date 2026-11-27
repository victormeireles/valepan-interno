-- Plano e ordem podem mirar a fábrica inteira.
-- Nesse caso a máquina fica nula e o setor é quem executa.

ALTER TABLE public.manutencao_planos
  ADD COLUMN escopo text NOT NULL DEFAULT 'maquina',
  ADD COLUMN setor_id uuid NULL REFERENCES public.pessoas_setores(id);

ALTER TABLE public.manutencao_planos
  ALTER COLUMN maquina_id DROP NOT NULL;

ALTER TABLE public.manutencao_planos
  ADD CONSTRAINT manutencao_planos_escopo CHECK (escopo IN ('maquina', 'fabrica')),
  ADD CONSTRAINT manutencao_planos_alvo CHECK (
    (
      escopo = 'maquina'
      AND maquina_id IS NOT NULL
      AND setor_id IS NULL
    )
    OR (
      escopo = 'fabrica'
      AND maquina_id IS NULL
      AND setor_id IS NOT NULL
    )
  );

CREATE INDEX manutencao_planos_setor_id_idx
  ON public.manutencao_planos (setor_id);

ALTER TABLE public.manutencao_ordens
  ADD COLUMN escopo text NOT NULL DEFAULT 'maquina';

ALTER TABLE public.manutencao_ordens
  ALTER COLUMN maquina_id DROP NOT NULL;

ALTER TABLE public.manutencao_ordens
  ADD CONSTRAINT manutencao_ordens_escopo CHECK (escopo IN ('maquina', 'fabrica')),
  ADD CONSTRAINT manutencao_ordens_alvo CHECK (
    (escopo = 'maquina' AND maquina_id IS NOT NULL)
    OR (escopo = 'fabrica' AND maquina_id IS NULL)
  );

GRANT SELECT (escopo) ON public.manutencao_ordens TO authenticated;

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
      plano.escopo,
      plano.maquina_id,
      plano.descricao,
      plano.frequencia_tipo,
      plano.intervalo_dias,
      plano.dia_semana,
      plano.dia_mes,
      plano.ancora_em,
      COALESCE(maquina.setor_id, plano.setor_id) AS setor_id
    FROM public.manutencao_planos AS plano
    LEFT JOIN public.manutencao_maquinas AS maquina
      ON maquina.id = plano.maquina_id
    WHERE plano.ativo
      AND plano.proxima_em <= v_hoje
      AND (
        (plano.escopo = 'maquina' AND maquina.ativo)
        OR (
          plano.escopo = 'fabrica'
          AND EXISTS (
            SELECT 1
            FROM public.pessoas_setores AS setor
            WHERE setor.id = plano.setor_id
              AND setor.tipo = 'operacional'
              AND setor.ativo
          )
        )
      )
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
      escopo,
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
      v_plano.escopo,
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

DROP TRIGGER IF EXISTS manutencao_planos_gerar_fila ON public.manutencao_planos;

CREATE TRIGGER manutencao_planos_gerar_fila
  AFTER INSERT OR UPDATE OF proxima_em, ativo, maquina_id, escopo, setor_id
  ON public.manutencao_planos
  FOR EACH ROW
  WHEN (
    NEW.ativo
    AND NEW.proxima_em <= (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::date
  )
  EXECUTE FUNCTION public.manutencao_plano_gerar_fila();
