const PREFIXOS = [
  '/login',
  '/completar-email',
  '/sugestoes',
  '/painel/fermentacao',
  '/painel/forno',
  '/painel/embalagem',
];

export function navegacaoOculta(pathname: string): boolean {
  return PREFIXOS.some(
    (prefixo) => pathname === prefixo || pathname.startsWith(`${prefixo}/`),
  );
}
