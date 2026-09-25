CREATE OR REPLACE FUNCTION public.pessoas_efetivar_desligamentos()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hoje date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_total integer;
BEGIN
  UPDATE public.pessoas_alocacoes AS alocacao
  SET fim = colaborador.data_desligamento, updated_at = now()
  FROM public.pessoas_colaboradores AS colaborador
  WHERE alocacao.colaborador_id = colaborador.id
    AND alocacao.fim IS NULL
    AND colaborador.situacao <> 'desligado'
    AND colaborador.data_desligamento IS NOT NULL
    AND colaborador.data_desligamento <= v_hoje;

  UPDATE public.pessoas_avisos AS aviso
  SET situacao = 'encerrado', updated_at = now()
  FROM public.pessoas_colaboradores AS colaborador
  WHERE aviso.colaborador_id = colaborador.id
    AND aviso.situacao = 'ativo'
    AND colaborador.situacao <> 'desligado'
    AND colaborador.data_desligamento IS NOT NULL
    AND colaborador.data_desligamento <= v_hoje;

  UPDATE public.pessoas_colaboradores
  SET situacao = 'desligado', updated_at = now()
  WHERE situacao <> 'desligado'
    AND data_desligamento IS NOT NULL
    AND data_desligamento <= v_hoje;
  GET DIAGNOSTICS v_total = ROW_COUNT;
  RETURN v_total;
END $$;

REVOKE ALL ON FUNCTION public.pessoas_efetivar_desligamentos() FROM PUBLIC, anon, authenticated;

CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'pessoas-efetivar-desligamentos') THEN
    PERFORM cron.unschedule('pessoas-efetivar-desligamentos');
  END IF;
END $$;

SELECT cron.schedule(
  'pessoas-efetivar-desligamentos',
  '5 3 * * *',
  $$SELECT public.pessoas_efetivar_desligamentos()$$
);
