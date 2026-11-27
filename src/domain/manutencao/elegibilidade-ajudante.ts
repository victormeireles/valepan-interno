import { nivelAtende, type NivelModulo } from '@/lib/auth/interno-modulos-catalog';

const MODULO_OFICINA = 'interno_manutencao';

export type ModuloDoPerfil = { modulo: string; nivel: string };

export type PerfilAjudante = {
  ativo: boolean;
  sistema: boolean;
  modulos: ModuloDoPerfil[];
};

export class ElegibilidadeAjudante {
  aceita(perfil: PerfilAjudante | null): boolean {
    if (!perfil || perfil.ativo !== true || perfil.sistema) return false;
    return perfil.modulos.some((modulo) => this.podeAjudar(modulo));
  }

  private podeAjudar(modulo: ModuloDoPerfil): boolean {
    if (modulo.modulo !== MODULO_OFICINA || !this.nivelConhecido(modulo.nivel)) return false;
    return nivelAtende(modulo.nivel, 'editar');
  }

  private nivelConhecido(nivel: string): nivel is NivelModulo {
    return nivel === 'ler' || nivel === 'editar' || nivel === 'administrar';
  }
}
