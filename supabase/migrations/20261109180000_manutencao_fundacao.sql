CREATE OR REPLACE FUNCTION public.manutencao_setor_vale(p_setor uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pessoas_setores
    WHERE id = p_setor AND tipo = 'operacional' AND ativo
  );
$$;

DO $$
DECLARE
  v_ordem int;
BEGIN
  SELECT COALESCE(MAX(grupo_ordem), 0) + 1 INTO v_ordem
  FROM public.modulos WHERE aplicativo = 'interno';

  INSERT INTO public.modulos (
    id, aplicativo, grupo, grupo_rotulo, grupo_descricao, grupo_ordem,
    rotulo, rotulo_curto, ajuda
  ) VALUES
  (
    'interno_manutencao', 'interno', 'manutencao', 'Manutenção',
    'Máquinas, peças, ordens de serviço e indicadores da fábrica.',
    v_ordem, 'Manutenção · Operação', 'Manutenção',
    'Ler vê máquinas e a fila de todos os setores. Editar abre corretiva em qualquer setor. Administrar cadastra máquina e marca os setores do solicitante. Administrar vale como ler e editar.'
  ),
  (
    'interno_manutencao_solicitacao', 'interno', 'manutencao', 'Manutenção',
    'Máquinas, peças, ordens de serviço e indicadores da fábrica.',
    v_ordem, 'Manutenção · Solicitação', 'Solicitação',
    'Ler acompanha a fila dos setores marcados. Editar abre corretiva nesses setores. Administrar vale como ler e editar.'
  );
END $$;

CREATE TABLE public.manutencao_maquinas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL,
  nome text NOT NULL,
  setor_id uuid NOT NULL REFERENCES public.pessoas_setores(id),
  observacao text NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX manutencao_maquinas_codigo_uidx
  ON public.manutencao_maquinas (lower(btrim(codigo)));

CREATE TABLE public.manutencao_usuario_setores (
  usuario_id uuid NOT NULL REFERENCES public.usuarios(id),
  setor_id uuid NOT NULL REFERENCES public.pessoas_setores(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (usuario_id, setor_id)
);

ALTER TABLE public.manutencao_maquinas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manutencao_usuario_setores ENABLE ROW LEVEL SECURITY;

CREATE POLICY manutencao_maquinas_select ON public.manutencao_maquinas
  FOR SELECT TO authenticated
  USING (
    (SELECT auth_tem_modulo('interno_manutencao', 'ler'))
    OR (SELECT is_admin())
    OR (
      (SELECT auth_tem_modulo('interno_manutencao_solicitacao', 'ler'))
      AND setor_id IN (
        SELECT lista.setor_id
        FROM public.manutencao_usuario_setores lista
        WHERE lista.usuario_id = (SELECT auth.uid())
          AND public.manutencao_setor_vale(lista.setor_id)
      )
    )
  );

CREATE POLICY manutencao_maquinas_insert ON public.manutencao_maquinas
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT auth_tem_modulo('interno_manutencao', 'administrar'))
    OR (SELECT is_admin())
  );

CREATE POLICY manutencao_maquinas_update ON public.manutencao_maquinas
  FOR UPDATE TO authenticated
  USING (
    (SELECT auth_tem_modulo('interno_manutencao', 'administrar'))
    OR (SELECT is_admin())
  )
  WITH CHECK (
    (SELECT auth_tem_modulo('interno_manutencao', 'administrar'))
    OR (SELECT is_admin())
  );

CREATE POLICY manutencao_usuario_setores_select ON public.manutencao_usuario_setores
  FOR SELECT TO authenticated
  USING (
    (SELECT auth_tem_modulo('interno_manutencao', 'administrar'))
    OR (SELECT is_admin())
    OR usuario_id = (SELECT auth.uid())
  );

CREATE POLICY manutencao_usuario_setores_insert ON public.manutencao_usuario_setores
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT auth_tem_modulo('interno_manutencao', 'administrar'))
    OR (SELECT is_admin())
  );

CREATE POLICY manutencao_usuario_setores_update ON public.manutencao_usuario_setores
  FOR UPDATE TO authenticated
  USING (
    (SELECT auth_tem_modulo('interno_manutencao', 'administrar'))
    OR (SELECT is_admin())
  )
  WITH CHECK (
    (SELECT auth_tem_modulo('interno_manutencao', 'administrar'))
    OR (SELECT is_admin())
  );
