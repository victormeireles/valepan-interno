-- ALTER_EMBALAGEM_LOTES_PEDIDO_FK.sql
-- Fase B.2.1: FK embalagem_lotes.pedido_embalagem_id → pedidos_embalagem
-- Aplicar após CREATE_PEDIDOS_EMBALAGEM_TABLES.sql e pedidos populados

DO $$ BEGIN
  ALTER TABLE embalagem_lotes
    ADD CONSTRAINT embalagem_lotes_pedido_embalagem_id_fkey
    FOREIGN KEY (pedido_embalagem_id) REFERENCES pedidos_embalagem(id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_embalagem_lotes_pedido_embalagem_id
  ON embalagem_lotes(pedido_embalagem_id)
  WHERE pedido_embalagem_id IS NOT NULL;
