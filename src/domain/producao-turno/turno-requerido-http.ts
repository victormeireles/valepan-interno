export function isTurnoRequeridoHttp(
  status: number,
  body: unknown,
): boolean {
  if (status !== 409 || body == null || typeof body !== 'object') return false;
  return (body as { code?: unknown }).code === 'turno_requerido';
}
