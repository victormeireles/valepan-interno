-- Espelho de pessoas_efetivar_desligamentos: no dia da data_admissao,
-- reserva vira ocupação e situacao vira ativo (fuso America/Sao_Paulo).

CREATE OR REPLACE FUNCTION public.pessoas_efetivar_admissoes()
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
  SET papel = 'ocupacao', updated_at = now()
  FROM public.pessoas_colaboradores AS colaborador
  WHERE alocacao.colaborador_id = colaborador.id
    AND alocacao.fim IS NULL
    AND alocacao.papel = 'reserva'
    AND colaborador.situacao = 'admissao_prevista'
    AND colaborador.previsao_encerrada_em IS NULL
    AND colaborador.data_admissao IS NOT NULL
    AND colaborador.data_admissao <= v_hoje;

  UPDATE public.pessoas_colaboradores AS colaborador
  SET situacao = 'ativo', updated_at = now()
  WHERE colaborador.situacao = 'admissao_prevista'
    AND colaborador.previsao_encerrada_em IS NULL
    AND colaborador.data_admissao IS NOT NULL
    AND colaborador.data_admissao <= v_hoje
    AND EXISTS (
      SELECT 1
      FROM public.pessoas_alocacoes AS alocacao
      WHERE alocacao.colaborador_id = colaborador.id
        AND alocacao.fim IS NULL
        AND alocacao.papel = 'ocupacao'
    );
  GET DIAGNOSTICS v_total = ROW_COUNT;
  RETURN v_total;
END $$;

REVOKE ALL ON FUNCTION public.pessoas_efetivar_admissoes() FROM PUBLIC, anon, authenticated;

CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'pessoas-efetivar-admissoes') THEN
    PERFORM cron.unschedule('pessoas-efetivar-admissoes');
  END IF;
END $$;

SELECT cron.schedule(
  'pessoas-efetivar-admissoes',
  '5 3 * * *',
  $$SELECT public.pessoas_efetivar_admissoes()$$
);
