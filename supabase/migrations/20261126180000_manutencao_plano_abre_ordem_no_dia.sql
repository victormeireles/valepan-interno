-- Plano com próxima data em hoje (ou antes) abre a ordem na hora.
-- O job das 00:10 continua abrindo as que vencem de madrugada.

CREATE OR REPLACE FUNCTION public.manutencao_plano_gerar_fila()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.manutencao_gerar_preventivas();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.manutencao_plano_gerar_fila() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.manutencao_plano_gerar_fila() TO service_role;

DROP TRIGGER IF EXISTS manutencao_planos_gerar_fila ON public.manutencao_planos;

CREATE TRIGGER manutencao_planos_gerar_fila
  AFTER INSERT OR UPDATE OF proxima_em, ativo, maquina_id
  ON public.manutencao_planos
  FOR EACH ROW
  WHEN (
    NEW.ativo
    AND NEW.proxima_em <= (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::date
  )
  EXECUTE FUNCTION public.manutencao_plano_gerar_fila();
