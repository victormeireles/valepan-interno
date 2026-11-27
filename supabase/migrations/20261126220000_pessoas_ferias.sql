CREATE TABLE public.pessoas_ferias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  colaborador_id uuid NOT NULL REFERENCES public.pessoas_colaboradores(id),
  inicio date NOT NULL,
  volta date NOT NULL,
  cancelada_em timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pessoas_ferias_volta_posterior CHECK (volta > inicio)
);

CREATE INDEX pessoas_ferias_abertas_idx
  ON public.pessoas_ferias (colaborador_id)
  WHERE cancelada_em IS NULL;

CREATE OR REPLACE FUNCTION public.pessoas_ferias_sem_cruzamento()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.cancelada_em IS NOT NULL THEN
    RETURN NEW;
  END IF;
  IF EXISTS (
    SELECT 1
    FROM public.pessoas_ferias
    WHERE colaborador_id = NEW.colaborador_id
      AND cancelada_em IS NULL
      AND id IS DISTINCT FROM NEW.id
      AND daterange(inicio, volta, '[)') && daterange(NEW.inicio, NEW.volta, '[)')
  ) THEN
    RAISE EXCEPTION 'Já existe férias nesse período.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER pessoas_ferias_sem_cruzamento
  BEFORE INSERT OR UPDATE ON public.pessoas_ferias
  FOR EACH ROW
  EXECUTE FUNCTION public.pessoas_ferias_sem_cruzamento();

ALTER TABLE public.pessoas_ferias ENABLE ROW LEVEL SECURITY;

CREATE POLICY pessoas_ferias_select ON public.pessoas_ferias
  FOR SELECT TO authenticated
  USING ((SELECT auth_tem_modulo('interno_pessoas', 'ler')));

CREATE POLICY pessoas_ferias_insert ON public.pessoas_ferias
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth_tem_modulo('interno_pessoas', 'editar')));

CREATE POLICY pessoas_ferias_update ON public.pessoas_ferias
  FOR UPDATE TO authenticated
  USING ((SELECT auth_tem_modulo('interno_pessoas', 'editar')))
  WITH CHECK ((SELECT auth_tem_modulo('interno_pessoas', 'editar')));
