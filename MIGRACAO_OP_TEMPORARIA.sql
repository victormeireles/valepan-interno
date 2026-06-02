-- Ordens de produção marcadas como temporárias (teste): removidas após o fim do dia
-- da data em temporaria_expira_em (calendário America/Sao_Paulo), avaliado na app/cron.

ALTER TABLE interno.ordens_producao
  ADD COLUMN IF NOT EXISTS temporaria boolean NOT NULL DEFAULT false;

ALTER TABLE interno.ordens_producao
  ADD COLUMN IF NOT EXISTS temporaria_expira_em date NULL;

COMMENT ON COLUMN interno.ordens_producao.temporaria IS 'Ordem só para teste no planejamento; a aplicação remove o registo após o dia em temporaria_expira_em (fuso Brasília).';

COMMENT ON COLUMN interno.ordens_producao.temporaria_expira_em IS 'Último dia civil (BR) em que a OP temporária existe; removida quando a data atual em Brasília é posterior a este dia.';
