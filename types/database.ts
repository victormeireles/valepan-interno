export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      categorias: {
        Row: {
          aparece_por_padrao: boolean
          ativo: boolean
          created_at: string | null
          id: string
          nome: string
          updated_at: string | null
        }
        Insert: {
          aparece_por_padrao?: boolean
          ativo?: boolean
          created_at?: string | null
          id?: string
          nome: string
          updated_at?: string | null
        }
        Update: {
          aparece_por_padrao?: boolean
          ativo?: boolean
          created_at?: string | null
          id?: string
          nome?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      cliente_categorias: {
        Row: {
          categoria_id: string
          cliente_id: string
          created_at: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          categoria_id: string
          cliente_id: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          categoria_id?: string
          cliente_id?: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cliente_categorias_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cliente_categorias_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          envia_sugestao_pedido: boolean
          erp_codigo: string
          grupo_whatsapp: string | null
          id: string
          nome_fantasia: string
          razao_social: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          envia_sugestao_pedido?: boolean
          erp_codigo: string
          grupo_whatsapp?: string | null
          id?: string
          nome_fantasia: string
          razao_social: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          envia_sugestao_pedido?: boolean
          erp_codigo?: string
          grupo_whatsapp?: string | null
          id?: string
          nome_fantasia?: string
          razao_social?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      enderecos_entrega: {
        Row: {
          cep: string | null
          cidade: string | null
          cliente_id: string
          complemento: string | null
          created_at: string | null
          estado: string | null
          id: string
          is_padrao: boolean
          is_retirada_fabrica: boolean
          nome: string
          numero: string | null
          rua: string | null
          updated_at: string | null
        }
        Insert: {
          cep?: string | null
          cidade?: string | null
          cliente_id: string
          complemento?: string | null
          created_at?: string | null
          estado?: string | null
          id?: string
          is_padrao?: boolean
          is_retirada_fabrica?: boolean
          nome: string
          numero?: string | null
          rua?: string | null
          updated_at?: string | null
        }
        Update: {
          cep?: string | null
          cidade?: string | null
          cliente_id?: string
          complemento?: string | null
          created_at?: string | null
          estado?: string | null
          id?: string
          is_padrao?: boolean
          is_retirada_fabrica?: boolean
          nome?: string
          numero?: string | null
          rua?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enderecos_entrega_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      pedido_itens: {
        Row: {
          created_at: string | null
          id: string
          pedido_id: string
          produto_id: string
          quantidade: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          pedido_id: string
          produto_id: string
          quantidade: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          pedido_id?: string
          produto_id?: string
          quantidade?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pedido_itens_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos: {
        Row: {
          atualizado_por: string
          cliente_id: string
          created_at: string | null
          criado_por: string
          data_entrega: string
          endereco_entrega_id: string | null
          id: string
          observacoes: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          atualizado_por: string
          cliente_id: string
          created_at?: string | null
          criado_por: string
          data_entrega: string
          endereco_entrega_id?: string | null
          id?: string
          observacoes?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          atualizado_por?: string
          cliente_id?: string
          created_at?: string | null
          criado_por?: string
          data_entrega?: string
          endereco_entrega_id?: string | null
          id?: string
          observacoes?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_atualizado_por_fkey"
            columns: ["atualizado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_endereco_entrega_id_fkey"
            columns: ["endereco_entrega_id"]
            isOneToOne: false
            referencedRelation: "enderecos_entrega"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos: {
        Row: {
          ativo: boolean
          box_units: number | null
          categoria_id: string
          codigo: string
          created_at: string
          id: string
          nome: string
          package_units: number | null
          unidade: string
          unidade_descricao: string | null
          unit_barcode: string | null
          unit_weight: number | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          box_units?: number | null
          categoria_id: string
          codigo: string
          created_at?: string
          id?: string
          nome: string
          package_units?: number | null
          unidade: string
          unidade_descricao?: string | null
          unit_barcode?: string | null
          unit_weight?: number | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          box_units?: number | null
          categoria_id?: string
          codigo?: string
          created_at?: string
          id?: string
          nome?: string
          package_units?: number | null
          unidade?: string
          unidade_descricao?: string | null
          unit_barcode?: string | null
          unit_weight?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "produtos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
        ]
      }
      sugestoes_envio_logs: {
        Row: {
          canal: string
          cliente_id: string
          created_at: string
          data_entrega_sugerida: string
          data_envio: string
          id: string
          mensagem_id: string | null
          pedido_origem_id: string
          pedido_rascunho_id: string
          status: string
        }
        Insert: {
          canal?: string
          cliente_id: string
          created_at?: string
          data_entrega_sugerida: string
          data_envio?: string
          id?: string
          mensagem_id?: string | null
          pedido_origem_id: string
          pedido_rascunho_id: string
          status?: string
        }
        Update: {
          canal?: string
          cliente_id?: string
          created_at?: string
          data_entrega_sugerida?: string
          data_envio?: string
          id?: string
          mensagem_id?: string | null
          pedido_origem_id?: string
          pedido_rascunho_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "sugestoes_envio_logs_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sugestoes_envio_logs_pedido_origem_id_fkey"
            columns: ["pedido_origem_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sugestoes_envio_logs_pedido_rascunho_id_fkey"
            columns: ["pedido_rascunho_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      usuarios: {
        Row: {
          cliente_id: string | null
          codigo_whatsapp: string | null
          codigo_whatsapp_bloqueado_ate: string | null
          codigo_whatsapp_expires: string | null
          codigo_whatsapp_tentativas: number | null
          created_at: string | null
          email: string | null
          id: string
          nome: string
          telefone: string | null
          telefone_verificado: boolean | null
          tipo: string
          updated_at: string | null
        }
        Insert: {
          cliente_id?: string | null
          codigo_whatsapp?: string | null
          codigo_whatsapp_bloqueado_ate?: string | null
          codigo_whatsapp_expires?: string | null
          codigo_whatsapp_tentativas?: number | null
          created_at?: string | null
          email?: string | null
          id?: string
          nome: string
          telefone?: string | null
          telefone_verificado?: boolean | null
          tipo: string
          updated_at?: string | null
        }
        Update: {
          cliente_id?: string | null
          codigo_whatsapp?: string | null
          codigo_whatsapp_bloqueado_ate?: string | null
          codigo_whatsapp_expires?: string | null
          codigo_whatsapp_tentativas?: number | null
          created_at?: string | null
          email?: string | null
          id?: string
          nome?: string
          telefone?: string | null
          telefone_verificado?: boolean | null
          tipo?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "usuarios_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_tokens: {
        Row: {
          created_at: string | null
          expires: string
          identifier: string
          token: string
        }
        Insert: {
          created_at?: string | null
          expires: string
          identifier: string
          token: string
        }
        Update: {
          created_at?: string | null
          expires?: string
          identifier?: string
          token?: string
        }
        Relationships: []
      }
    }
    Views: {
      vw_sugestoes_envios_recent: {
        Row: {
          data_entrega_sugerida: string | null
          data_envio: string | null
          erp_codigo: string | null
          id: string | null
          nome_fantasia: string | null
          status_rascunho: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_user_cliente_id: { Args: { user_id: string }; Returns: string }
      get_user_tipo: { Args: { user_id: string }; Returns: string }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
