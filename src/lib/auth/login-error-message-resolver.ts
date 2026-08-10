/**
 * Mapeia códigos de erro do Auth.js / callbacks para mensagem operacional.
 */
export class LoginErrorMessageResolver {
  resolve(errorCode: string | null | undefined): string | null {
    if (errorCode === 'SemPermissao') {
      return 'Sem permissão para o Sistema de Produção. Solicite acesso ao administrador.';
    }
    if (errorCode === 'UserNotFound') {
      return 'Usuário não encontrado. Solicite acesso ao administrador.';
    }
    if (errorCode === 'UserInactive') {
      return 'Conta desativada. Entre em contato com o administrador.';
    }
    if (errorCode === 'DatabaseError') {
      return 'Erro ao conectar. Tente novamente.';
    }
    if (errorCode === 'Configuration') {
      return 'Login temporariamente indisponível. Tente mais tarde.';
    }
    if (
      errorCode === 'CredentialsSignin' ||
      errorCode === 'AccessDenied'
    ) {
      return 'Código incorreto ou expirado. Tente novamente.';
    }
    return null;
  }
}
