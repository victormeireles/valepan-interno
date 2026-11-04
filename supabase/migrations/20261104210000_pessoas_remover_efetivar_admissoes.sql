-- Volta a efetivação de admissão para o fluxo manual (Contratar).
-- Remove o cron e a função automática.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'pessoas-efetivar-admissoes') THEN
    PERFORM cron.unschedule('pessoas-efetivar-admissoes');
  END IF;
END $$;

DROP FUNCTION IF EXISTS public.pessoas_efetivar_admissoes();
