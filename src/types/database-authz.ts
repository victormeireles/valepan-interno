import type { Database } from './database';

type UsuariosTable = Database['public']['Tables']['usuarios'];

export type PerfisTables = {
  perfis: {
    Row: {
      id: string;
      nome: string;
      descricao: string | null;
      ativo: boolean;
      is_sistema: boolean;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id?: string;
      nome: string;
      descricao?: string | null;
      ativo?: boolean;
      is_sistema?: boolean;
      created_at?: string;
      updated_at?: string;
    };
    Update: {
      id?: string;
      nome?: string;
      descricao?: string | null;
      ativo?: boolean;
      is_sistema?: boolean;
      created_at?: string;
      updated_at?: string;
    };
    Relationships: [];
  };
  perfil_modulos: {
    Row: {
      perfil_id: string;
      modulo: string;
      nivel: string;
    };
    Insert: {
      perfil_id: string;
      modulo: string;
      nivel: string;
    };
    Update: {
      perfil_id?: string;
      modulo?: string;
      nivel?: string;
    };
    Relationships: [
      {
        foreignKeyName: 'perfil_modulos_perfil_id_fkey';
        columns: ['perfil_id'];
        isOneToOne: false;
        referencedRelation: 'perfis';
        referencedColumns: ['id'];
      },
    ];
  };
  usuario_perfis: {
    Row: {
      usuario_id: string;
      perfil_id: string;
      created_at: string;
    };
    Insert: {
      usuario_id: string;
      perfil_id: string;
      created_at?: string;
    };
    Update: {
      usuario_id?: string;
      perfil_id?: string;
      created_at?: string;
    };
    Relationships: [
      {
        foreignKeyName: 'usuario_perfis_perfil_id_fkey';
        columns: ['perfil_id'];
        isOneToOne: false;
        referencedRelation: 'perfis';
        referencedColumns: ['id'];
      },
      {
        foreignKeyName: 'usuario_perfis_usuario_id_fkey';
        columns: ['usuario_id'];
        isOneToOne: false;
        referencedRelation: 'usuarios';
        referencedColumns: ['id'];
      },
    ];
  };
};

type UsuariosComOwner = {
  usuarios: {
    Row: UsuariosTable['Row'] & {
      is_system_owner: boolean;
    };
    Insert: UsuariosTable['Insert'] & {
      is_system_owner?: boolean;
    };
    Update: UsuariosTable['Update'] & {
      is_system_owner?: boolean;
    };
    Relationships: UsuariosTable['Relationships'];
  };
};

type AuthzTables = PerfisTables & UsuariosComOwner;

export type DatabaseComAuthz = Database & {
  public: Database['public'] & {
    Tables: Database['public']['Tables'] & AuthzTables;
  };
};

export type AuthzTablesMap = DatabaseComAuthz['public']['Tables'];
