-- pH da massa (etapa massa) — opcional
ALTER TABLE producao_etapas_log
ADD COLUMN IF NOT EXISTS ph_massa numeric(5, 2);

COMMENT ON COLUMN producao_etapas_log.ph_massa IS 'pH da massa ao sair da masseira (opcional)';
