# Migrar cliente de empresa Omie (SP → RJ)

Pedido novo segue a Omie da empresa em `clientes.empresa_id`. O código
`clientes.erp_codigo` precisa existir **nessa mesma** Omie. Trocar só a
empresa quebra o próximo `IncluirPedido`.

## O que o sistema usa no sync

1. `clientes.empresa_id` → `empresas.app_key` / `app_secret`
2. `clientes.erp_codigo` → `codigo_cliente_omie`
3. `integracao_produtos` filtrado pela mesma `empresa_id`
4. `parcelas_empresa.erp_codigo` da parcela padrão nessa empresa

Pedidos antigos **não mudam**. `pedidos` não tem `empresa_id`; NFs e
boletos já emitidos ficam na Omie original.

## Histórico

A tabela `clientes_migracao_faturamento` (migration
`20260730160000_clientes_migracao_faturamento`) é o rastro oficial.
Dezenas de clientes SP → RJ usaram este padrão:

| Campo | Papel |
| --- | --- |
| `empresa_id_origem` / `erp_codigo_origem` | Omie de onde saiu |
| `empresa_id_destino` / `erp_codigo_destino` | Omie para onde vai |
| `status` | `ativo` depois de concluir |
| `motivo` | `cnpj_sp_impedido_nf` (cadastro novo no destino) ou `cnpj_sp_impedido_nf_ja_existia_rj` (CNPJ já existia) |

IDs atuais:

- NOVA RESENDE - RJ: `2bfe5c64-3af7-4cf1-a426-5e4e3a7ce78c`
- NOVA RESENDE - SP: `b75c003e-3b57-43ac-b688-9eab985d086d`

## Passo a passo

### 1. Snapshot

Confirme o cadastro, pedidos em aberto e se já existe migração `ativo`.

```sql
SELECT c.id, c.nome_fantasia, c.cnpj, c.erp_codigo, e.nome, e.estado
FROM clientes c
JOIN empresas e ON e.id = c.empresa_id
WHERE c.nome_fantasia ILIKE '%nome%';

SELECT status, codigo_erp, created_at
FROM pedidos
WHERE cliente_id = '<cliente_id>'
ORDER BY created_at DESC
LIMIT 20;

SELECT * FROM clientes_migracao_faturamento
WHERE cliente_id = '<cliente_id>';
```

Não migre no meio de pedido ainda não faturado na Omie antiga.

### 2. Omie de destino

Busque o CNPJ na Omie destino (`ListarClientes` / `ListarClientesResumido`
com `clientesFiltro.cnpj_cpf`).

- Se existir: use o `codigo_cliente_omie` de lá. Motivo
  `cnpj_sp_impedido_nf_ja_existia_rj`.
- Se não existir: copie o cadastro da Omie origem (`ConsultarCliente`) e
  faça `IncluirCliente` **sem** `codigo_cliente_omie`. Reuse
  `codigo_cliente_integracao` = UUID do cliente. Motivo
  `cnpj_sp_impedido_nf`.

Nunca reaproveite o `erp_codigo` da SP na RJ. Os códigos não se cruzam.

### 3. Banco (transação)

```sql
BEGIN;

UPDATE public.clientes
SET empresa_id = '<empresa_destino_id>',
    erp_codigo = '<codigo_omie_destino>',
    updated_at = now()
WHERE id = '<cliente_id>'
  AND empresa_id = '<empresa_origem_id>'
  AND erp_codigo = '<codigo_omie_origem>';

INSERT INTO public.clientes_migracao_faturamento (
  cliente_id,
  empresa_id_origem,
  erp_codigo_origem,
  parcela_padrao_id_origem,
  empresa_id_destino,
  erp_codigo_destino,
  motivo,
  status,
  migrado_em
) VALUES (
  '<cliente_id>',
  '<empresa_origem_id>',
  '<codigo_omie_origem>',
  '<parcela_padrao_id ou NULL>',
  '<empresa_destino_id>',
  '<codigo_omie_destino>',
  'cnpj_sp_impedido_nf', -- ou cnpj_sp_impedido_nf_ja_existia_rj
  'ativo',
  now()
);

COMMIT;
```

O `UPDATE` tem de afetar 1 linha. Há índice único de migração `ativo`
por `cliente_id`.

A parcela “Para 7 dias” (`f9b444d1-9130-41e4-b112-90591b72e830`) mapeia
para `A07` em SP e RJ; em geral não precisa trocar
`parcela_padrao_id`.

### 4. Conferir

```sql
SELECT c.nome_fantasia, c.erp_codigo, e.nome, m.status, m.erp_codigo_destino
FROM clientes c
JOIN empresas e ON e.id = c.empresa_id
JOIN clientes_migracao_faturamento m
  ON m.cliente_id = c.id AND m.status = 'ativo'
WHERE c.id = '<cliente_id>';
```

Crie o próximo pedido e confirme o sync na Omie **RJ**.

## Caso aplicado: Joe uzumaki delivery

Aplicado em 2026-10-08 (produção). Não reexecutar.

| Campo | Antes | Depois |
| --- | --- | --- |
| Cliente | Joe uzumaki delivery (`4f5e7599-466d-4714-85ac-64fd80d04c4e`) | mesmo |
| CNPJ | 61150277000195 | mesmo |
| Empresa | NOVA RESENDE - SP | NOVA RESENDE - RJ |
| `erp_codigo` | `8777610158` | `12418206717` |
| Motivo | — | `cnpj_sp_impedido_nf` (cadastro novo na Omie RJ) |

Pedido já faturado (`e02c5a10-1193-4b96-b097-40ff40ceb728`, Omie SP
`8785230728`) permanece na SP.

## O que não fazer

- Alterar só `empresa_id`
- Apontar `erp_codigo` da SP para a RJ
- Mexer em `empresas.app_key` / `app_secret`
- Reescrever `pedidos.codigo_erp`, NFs ou boletos antigos
- Esquecer `clientes_migracao_faturamento` (some o histórico e a reversão)
