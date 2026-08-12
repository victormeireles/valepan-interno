-- Substitui todos os distribuidores de um insumo na transação da chamada RPC.
CREATE OR REPLACE FUNCTION public.replace_insumo_distribuidores(
  p_insumo_id uuid,
  p_items jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN
    RAISE EXCEPTION 'p_items deve ser um array JSON';
  END IF;

  DELETE FROM public.insumo_distribuidor
  WHERE insumo_id = p_insumo_id;

  INSERT INTO public.insumo_distribuidor (
    insumo_id,
    nome,
    preferencial,
    ordem
  )
  SELECT
    p_insumo_id,
    item.nome,
    COALESCE(item.preferencial, false),
    COALESCE(item.ordem, 0)
  FROM jsonb_to_recordset(p_items) AS item(
    nome text,
    preferencial boolean,
    ordem integer
  );
END;
$$;

REVOKE ALL ON FUNCTION public.replace_insumo_distribuidores(uuid, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.replace_insumo_distribuidores(uuid, jsonb)
  TO service_role;

DROP POLICY IF EXISTS insumo_distribuidor_delete
  ON public.insumo_distribuidor;
CREATE POLICY insumo_distribuidor_delete
  ON public.insumo_distribuidor
  FOR DELETE TO authenticated
  USING ((SELECT is_admin()));
