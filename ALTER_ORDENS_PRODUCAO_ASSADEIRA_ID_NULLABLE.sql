-- Permite ordens de produção para produtos sem assadeira (meta em unidades).
-- assadeira_id NULL + assadeiras 0 conforme spec meta-embalagem sem assadeira.

ALTER TABLE ordens_producao
  ALTER COLUMN assadeira_id DROP NOT NULL;
