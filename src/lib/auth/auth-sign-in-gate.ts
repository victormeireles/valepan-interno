export type UsuarioSignInRow = {
  id: string;
  email: string | null;
  nome: string;
  ativo: boolean;
};

/**
 * Decide se o sign-in do Interno deve prosseguir.
 * Inativo/inexistente → URL de erro; ativo → permite (módulos checados no middleware/JWT).
 */
export class AuthSignInGate {
  decide(usuario: UsuarioSignInRow | null): true | string {
    if (!usuario) return '/login?error=UserNotFound';
    if (usuario.ativo === false) return '/login?error=UserInactive';
    return true;
  }
}
