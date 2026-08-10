-- Login QR: pedidos de autenticação TV/PC via scan (estilo WhatsApp Web)
-- Tabela já pode existir no projeto compartilhado (valepan-pedidos); migration idempotente.

CREATE TABLE IF NOT EXISTS public.login_qr_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'consumed', 'expired')),
  usuario_id uuid NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  exchange_token_hash text NULL,
  expires_at timestamptz NOT NULL,
  approved_at timestamptz NULL,
  consumed_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS login_qr_requests_status_expires_at_idx
  ON public.login_qr_requests (status, expires_at);

COMMENT ON TABLE public.login_qr_requests IS
  'Pedidos de login por QR (TV mostra; celular autenticado aprova).';

ALTER TABLE public.login_qr_requests ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.login_qr_requests FROM PUBLIC;
REVOKE ALL ON TABLE public.login_qr_requests FROM anon;
REVOKE ALL ON TABLE public.login_qr_requests FROM authenticated;

GRANT ALL ON TABLE public.login_qr_requests TO service_role;
GRANT SELECT ON TABLE public.login_qr_requests TO authenticated;

DROP POLICY IF EXISTS "login_qr_requests_service_role_all" ON public.login_qr_requests;
CREATE POLICY "login_qr_requests_service_role_all"
  ON public.login_qr_requests
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
COMMENT ON POLICY "login_qr_requests_service_role_all" ON public.login_qr_requests IS
  'APIs server-side com service_role gerenciam o ciclo de vida do pedido QR.';

DROP POLICY IF EXISTS "login_qr_requests_admin_select" ON public.login_qr_requests;
CREATE POLICY "login_qr_requests_admin_select"
  ON public.login_qr_requests
  FOR SELECT
  TO authenticated
  USING ((SELECT is_admin()));
COMMENT ON POLICY "login_qr_requests_admin_select" ON public.login_qr_requests IS
  'Admins podem inspecionar pedidos QR; mutações só via service_role.';
