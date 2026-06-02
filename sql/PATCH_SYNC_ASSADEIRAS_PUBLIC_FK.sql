-- Espelha todas as latas de interno.assadeiras em public.assadeiras.
-- Necessário porque interno.produto_assadeiras.assadeira_id referencia public.assadeiras (legado).
-- Idempotente: pode rodar várias vezes.

INSERT INTO public.assadeiras (
  id,
  nome,
  codigo,
  ativo,
  ordem,
  numero_buracos,
  quantidade_latas,
  descricao,
  diametro_buracos_mm,
  created_at,
  updated_at
)
SELECT
  i.id,
  i.nome,
  i.codigo,
  i.ativo,
  i.ordem,
  COALESCE(i.numero_buracos, 0),
  COALESCE(i.quantidade_latas, 0),
  i.descricao,
  i.diametro_buracos_mm,
  i.created_at,
  i.updated_at
FROM interno.assadeiras i
WHERE NOT EXISTS (
  SELECT 1 FROM public.assadeiras p WHERE p.id = i.id
)
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome,
  codigo = EXCLUDED.codigo,
  ativo = EXCLUDED.ativo,
  ordem = EXCLUDED.ordem,
  numero_buracos = EXCLUDED.numero_buracos,
  quantidade_latas = EXCLUDED.quantidade_latas,
  descricao = EXCLUDED.descricao,
  diametro_buracos_mm = EXCLUDED.diametro_buracos_mm,
  updated_at = EXCLUDED.updated_at;
