CREATE OR REPLACE FUNCTION public.manutencao_setores_do_usuario()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id
  FROM public.pessoas_setores AS s
  WHERE s.tipo = 'operacional'
    AND s.ativo
    AND (
      (s.codigo = 'PRO' AND (SELECT auth_tem_modulo('interno_fermentacao', 'editar')))
      OR (s.codigo = 'FOR' AND (SELECT auth_tem_modulo('interno_forno', 'editar')))
      OR (s.codigo = 'EMB' AND (SELECT auth_tem_modulo('interno_embalagem', 'editar')))
    );
$$;

REVOKE ALL ON FUNCTION public.manutencao_setores_do_usuario() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.manutencao_setores_do_usuario() TO authenticated;

DROP POLICY IF EXISTS manutencao_maquinas_select ON public.manutencao_maquinas;
CREATE POLICY manutencao_maquinas_select ON public.manutencao_maquinas
  FOR SELECT TO authenticated
  USING (
    (SELECT auth_tem_modulo('interno_manutencao', 'ler'))
    OR (SELECT is_admin())
    OR setor_id IN (SELECT public.manutencao_setores_do_usuario())
  );

DROP POLICY IF EXISTS manutencao_ordens_select ON public.manutencao_ordens;
CREATE POLICY manutencao_ordens_select ON public.manutencao_ordens
  FOR SELECT TO authenticated
  USING (
    (SELECT auth_tem_modulo('interno_manutencao', 'ler'))
    OR (SELECT is_admin())
    OR setor_id IN (SELECT public.manutencao_setores_do_usuario())
  );

DROP POLICY IF EXISTS manutencao_usuario_setores_select ON public.manutencao_usuario_setores;
DROP POLICY IF EXISTS manutencao_usuario_setores_insert ON public.manutencao_usuario_setores;
DROP POLICY IF EXISTS manutencao_usuario_setores_update ON public.manutencao_usuario_setores;

DROP FUNCTION IF EXISTS public.manutencao_substituir_usuario_setores(uuid, uuid[]);
DROP TABLE IF EXISTS public.manutencao_usuario_setores;

DELETE FROM public.perfil_modulos WHERE modulo = 'interno_manutencao_solicitacao';
DELETE FROM public.modulos WHERE id = 'interno_manutencao_solicitacao';

UPDATE public.modulos
SET ajuda = 'Ler vê máquinas e a fila de todos os setores. Editar abre corretiva em qualquer setor e executa a oficina. Administrar cadastra máquina e peça. Administrar vale como ler e editar. Quem edita fermentação, forno ou embalagem solicita corretiva só no setor do mapa (PRO, FOR, EMB).'
WHERE id = 'interno_manutencao';

NOTIFY pgrst, 'reload schema';
