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
      cadastro_hamburgueria_comentarios: {
        Row: {
          cliente_id: string
          comentario: string
          created_at: string
          id: string
          usuario_id: string
        }
        Insert: {
          cliente_id: string
          comentario: string
          created_at?: string
          id?: string
          usuario_id: string
        }
        Update: {
          cliente_id?: string
          comentario?: string
          created_at?: string
          id?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cadastro_hamburgueria_comentarios_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cadastro_hamburgueria_comentarios_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      caminhoes: {
        Row: {
          ativo: boolean
          capacidade_caixas: number
          created_at: string | null
          id: string
          nome: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean
          capacidade_caixas: number
          created_at?: string | null
          id?: string
          nome: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean
          capacidade_caixas?: number
          created_at?: string | null
          id?: string
          nome?: string
          updated_at?: string | null
        }
        Relationships: []
      }
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
      cliente_precos: {
        Row: {
          cliente_id: string
          created_at: string | null
          id: string
          preco: number
          produto_id: string
          updated_at: string | null
        }
        Insert: {
          cliente_id: string
          created_at?: string | null
          id?: string
          preco: number
          produto_id: string
          updated_at?: string | null
        }
        Update: {
          cliente_id?: string
          created_at?: string | null
          id?: string
          preco?: number
          produto_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cliente_precos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cliente_precos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cliente_precos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "vw_dashboard_producao"
            referencedColumns: ["produto_id"]
          },
          {
            foreignKeyName: "cliente_precos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "vw_produtos_com_receitas"
            referencedColumns: ["produto_id"]
          },
        ]
      }
      clientes: {
        Row: {
          aprovado_em: string | null
          aprovado_por: string | null
          ativo: boolean | null
          cnpj: string | null
          codigo_cenario_imposto_erp: number | null
          comissao_distribuidor_percentual: number
          created_at: string | null
          dia_semana_entrega: number | null
          dias_entrega_frequente: number[] | null
          distribuidor_id: string | null
          email: string | null
          empresa_id: string | null
          envia_sugestao_pedido: boolean
          erp_codigo: string | null
          faz_fechamento: boolean
          foto_fachada_url: string | null
          frequencia_pedido: Database["public"]["Enums"]["frequencia_pedido_enum"]
          grupo_whatsapp: string | null
          id: string
          indicador_id: string | null
          inscricao_estadual: string | null
          instagram: string | null
          is_pessoa_juridica: boolean
          marca_pao_atual: string | null
          media_paes_semana: number | null
          motivo_rejeicao: string | null
          nao_gerar_boleto: boolean
          nome_contato: string | null
          nome_fantasia: string
          notificado_distribuidor: boolean
          notificado_interno: boolean
          parcela_padrao_id: string | null
          prazo_aprovacao: string | null
          razao_social: string
          regiao: string | null
          regiao_selecionada: string | null
          rejeitado_em: string | null
          rejeitado_por: string | null
          status_cadastro:
            | Database["public"]["Enums"]["tipo_status_cadastro_enum"]
            | null
          tem_texto_indicando_congelado_na_etiqueta: boolean
          tem_validade_congelado_na_etiqueta: boolean
          tipo_cliente: Database["public"]["Enums"]["tipo_cliente_enum"]
          tipo_estoque_id: string
          tipos_paes: string | null
          updated_at: string | null
          usuario_padrao_id: string | null
          vendedor_id: string | null
          whatsapp_ddd: string | null
          whatsapp_numero: string | null
        }
        Insert: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          ativo?: boolean | null
          cnpj?: string | null
          codigo_cenario_imposto_erp?: number | null
          comissao_distribuidor_percentual?: number
          created_at?: string | null
          dia_semana_entrega?: number | null
          dias_entrega_frequente?: number[] | null
          distribuidor_id?: string | null
          email?: string | null
          empresa_id?: string | null
          envia_sugestao_pedido?: boolean
          erp_codigo?: string | null
          faz_fechamento?: boolean
          foto_fachada_url?: string | null
          frequencia_pedido?: Database["public"]["Enums"]["frequencia_pedido_enum"]
          grupo_whatsapp?: string | null
          id?: string
          indicador_id?: string | null
          inscricao_estadual?: string | null
          instagram?: string | null
          is_pessoa_juridica?: boolean
          marca_pao_atual?: string | null
          media_paes_semana?: number | null
          motivo_rejeicao?: string | null
          nao_gerar_boleto?: boolean
          nome_contato?: string | null
          nome_fantasia: string
          notificado_distribuidor?: boolean
          notificado_interno?: boolean
          parcela_padrao_id?: string | null
          prazo_aprovacao?: string | null
          razao_social: string
          regiao?: string | null
          regiao_selecionada?: string | null
          rejeitado_em?: string | null
          rejeitado_por?: string | null
          status_cadastro?:
            | Database["public"]["Enums"]["tipo_status_cadastro_enum"]
            | null
          tem_texto_indicando_congelado_na_etiqueta?: boolean
          tem_validade_congelado_na_etiqueta?: boolean
          tipo_cliente?: Database["public"]["Enums"]["tipo_cliente_enum"]
          tipo_estoque_id?: string
          tipos_paes?: string | null
          updated_at?: string | null
          usuario_padrao_id?: string | null
          vendedor_id?: string | null
          whatsapp_ddd?: string | null
          whatsapp_numero?: string | null
        }
        Update: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          ativo?: boolean | null
          cnpj?: string | null
          codigo_cenario_imposto_erp?: number | null
          comissao_distribuidor_percentual?: number
          created_at?: string | null
          dia_semana_entrega?: number | null
          dias_entrega_frequente?: number[] | null
          distribuidor_id?: string | null
          email?: string | null
          empresa_id?: string | null
          envia_sugestao_pedido?: boolean
          erp_codigo?: string | null
          faz_fechamento?: boolean
          foto_fachada_url?: string | null
          frequencia_pedido?: Database["public"]["Enums"]["frequencia_pedido_enum"]
          grupo_whatsapp?: string | null
          id?: string
          indicador_id?: string | null
          inscricao_estadual?: string | null
          instagram?: string | null
          is_pessoa_juridica?: boolean
          marca_pao_atual?: string | null
          media_paes_semana?: number | null
          motivo_rejeicao?: string | null
          nao_gerar_boleto?: boolean
          nome_contato?: string | null
          nome_fantasia?: string
          notificado_distribuidor?: boolean
          notificado_interno?: boolean
          parcela_padrao_id?: string | null
          prazo_aprovacao?: string | null
          razao_social?: string
          regiao?: string | null
          regiao_selecionada?: string | null
          rejeitado_em?: string | null
          rejeitado_por?: string | null
          status_cadastro?:
            | Database["public"]["Enums"]["tipo_status_cadastro_enum"]
            | null
          tem_texto_indicando_congelado_na_etiqueta?: boolean
          tem_validade_congelado_na_etiqueta?: boolean
          tipo_cliente?: Database["public"]["Enums"]["tipo_cliente_enum"]
          tipo_estoque_id?: string
          tipos_paes?: string | null
          updated_at?: string | null
          usuario_padrao_id?: string | null
          vendedor_id?: string | null
          whatsapp_ddd?: string | null
          whatsapp_numero?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clientes_aprovado_por_fkey"
            columns: ["aprovado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clientes_distribuidor_id_fkey"
            columns: ["distribuidor_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clientes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clientes_indicador_id_fkey"
            columns: ["indicador_id"]
            isOneToOne: false
            referencedRelation: "parceiros_indicadores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clientes_parcela_padrao_id_fkey"
            columns: ["parcela_padrao_id"]
            isOneToOne: false
            referencedRelation: "parcelas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clientes_rejeitado_por_fkey"
            columns: ["rejeitado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clientes_tipo_estoque_id_fkey"
            columns: ["tipo_estoque_id"]
            isOneToOne: false
            referencedRelation: "tipos_estoque"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clientes_usuario_padrao_id_fkey"
            columns: ["usuario_padrao_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clientes_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "vendedores"
            referencedColumns: ["id"]
          },
        ]
      }
      clube_beneficios: {
        Row: {
          ativo: boolean
          created_at: string | null
          custo_pontos: number | null
          descricao: string
          id: string
          imagem_url: string | null
          nome: string
          produto_id: string | null
          requer_aprovacao: boolean
          tipo: Database["public"]["Enums"]["clube_beneficio_tipo"]
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string | null
          custo_pontos?: number | null
          descricao?: string
          id?: string
          imagem_url?: string | null
          nome: string
          produto_id?: string | null
          requer_aprovacao?: boolean
          tipo: Database["public"]["Enums"]["clube_beneficio_tipo"]
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string | null
          custo_pontos?: number | null
          descricao?: string
          id?: string
          imagem_url?: string | null
          nome?: string
          produto_id?: string | null
          requer_aprovacao?: boolean
          tipo?: Database["public"]["Enums"]["clube_beneficio_tipo"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clube_beneficios_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clube_beneficios_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "vw_dashboard_producao"
            referencedColumns: ["produto_id"]
          },
          {
            foreignKeyName: "clube_beneficios_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "vw_produtos_com_receitas"
            referencedColumns: ["produto_id"]
          },
        ]
      }
      clube_config: {
        Row: {
          chave: string
          created_at: string | null
          descricao: string
          id: string
          updated_at: string | null
          valor: string
        }
        Insert: {
          chave: string
          created_at?: string | null
          descricao?: string
          id?: string
          updated_at?: string | null
          valor: string
        }
        Update: {
          chave?: string
          created_at?: string | null
          descricao?: string
          id?: string
          updated_at?: string | null
          valor?: string
        }
        Relationships: []
      }
      clube_pontos_transacoes: {
        Row: {
          cliente_id: string
          created_at: string | null
          descricao: string
          expira_em: string | null
          id: string
          pedido_id: string | null
          pontos: number
          pontos_pendentes: boolean
          tipo: Database["public"]["Enums"]["clube_transacao_tipo"]
          updated_at: string | null
        }
        Insert: {
          cliente_id: string
          created_at?: string | null
          descricao?: string
          expira_em?: string | null
          id?: string
          pedido_id?: string | null
          pontos: number
          pontos_pendentes?: boolean
          tipo: Database["public"]["Enums"]["clube_transacao_tipo"]
          updated_at?: string | null
        }
        Update: {
          cliente_id?: string
          created_at?: string | null
          descricao?: string
          expira_em?: string | null
          id?: string
          pedido_id?: string | null
          pontos?: number
          pontos_pendentes?: boolean
          tipo?: Database["public"]["Enums"]["clube_transacao_tipo"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clube_pontos_transacoes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clube_pontos_transacoes_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clube_pontos_transacoes_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "relatorio_producao_pedidos_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clube_pontos_transacoes_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "vw_dashboard_producao"
            referencedColumns: ["pedido_id"]
          },
        ]
      }
      clube_resgates: {
        Row: {
          beneficio_id: string
          cliente_id: string
          created_at: string | null
          id: string
          observacoes: string | null
          pedido_bonificado_id: string | null
          pontos_gastos: number
          produto_resgatado_id: string | null
          status: Database["public"]["Enums"]["clube_resgate_status"]
          updated_at: string | null
        }
        Insert: {
          beneficio_id: string
          cliente_id: string
          created_at?: string | null
          id?: string
          observacoes?: string | null
          pedido_bonificado_id?: string | null
          pontos_gastos: number
          produto_resgatado_id?: string | null
          status?: Database["public"]["Enums"]["clube_resgate_status"]
          updated_at?: string | null
        }
        Update: {
          beneficio_id?: string
          cliente_id?: string
          created_at?: string | null
          id?: string
          observacoes?: string | null
          pedido_bonificado_id?: string | null
          pontos_gastos?: number
          produto_resgatado_id?: string | null
          status?: Database["public"]["Enums"]["clube_resgate_status"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clube_resgates_beneficio_id_fkey"
            columns: ["beneficio_id"]
            isOneToOne: false
            referencedRelation: "clube_beneficios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clube_resgates_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clube_resgates_pedido_bonificado_id_fkey"
            columns: ["pedido_bonificado_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clube_resgates_pedido_bonificado_id_fkey"
            columns: ["pedido_bonificado_id"]
            isOneToOne: false
            referencedRelation: "relatorio_producao_pedidos_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clube_resgates_pedido_bonificado_id_fkey"
            columns: ["pedido_bonificado_id"]
            isOneToOne: false
            referencedRelation: "vw_dashboard_producao"
            referencedColumns: ["pedido_id"]
          },
          {
            foreignKeyName: "clube_resgates_produto_resgatado_id_fkey"
            columns: ["produto_resgatado_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clube_resgates_produto_resgatado_id_fkey"
            columns: ["produto_resgatado_id"]
            isOneToOne: false
            referencedRelation: "vw_dashboard_producao"
            referencedColumns: ["produto_id"]
          },
          {
            foreignKeyName: "clube_resgates_produto_resgatado_id_fkey"
            columns: ["produto_resgatado_id"]
            isOneToOne: false
            referencedRelation: "vw_produtos_com_receitas"
            referencedColumns: ["produto_id"]
          },
        ]
      }
      cobranca_whatsapp_envios: {
        Row: {
          canal: string
          cliente_id: string
          created_at: string
          data_entrega_esperada: string
          data_limite: string
          erro: string | null
          id: string
          mensagem: string | null
          status: string
          tipo_disparo: string
          triggered_by: string | null
          usuario_id: string | null
          usuario_telefone: string | null
          zapi_message_id: string | null
        }
        Insert: {
          canal?: string
          cliente_id: string
          created_at?: string
          data_entrega_esperada: string
          data_limite: string
          erro?: string | null
          id?: string
          mensagem?: string | null
          status?: string
          tipo_disparo?: string
          triggered_by?: string | null
          usuario_id?: string | null
          usuario_telefone?: string | null
          zapi_message_id?: string | null
        }
        Update: {
          canal?: string
          cliente_id?: string
          created_at?: string
          data_entrega_esperada?: string
          data_limite?: string
          erro?: string | null
          id?: string
          mensagem?: string | null
          status?: string
          tipo_disparo?: string
          triggered_by?: string | null
          usuario_id?: string | null
          usuario_telefone?: string | null
          zapi_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cobranca_whatsapp_envios_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cobranca_whatsapp_envios_triggered_by_fkey"
            columns: ["triggered_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cobranca_whatsapp_envios_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      distribuidor_precos_revenda: {
        Row: {
          created_at: string
          distribuidor_id: string
          id: string
          preco_revenda: number
          produto_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          distribuidor_id: string
          id?: string
          preco_revenda: number
          produto_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          distribuidor_id?: string
          id?: string
          preco_revenda?: number
          produto_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "distribuidor_precos_revenda_distribuidor_id_fkey"
            columns: ["distribuidor_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distribuidor_precos_revenda_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distribuidor_precos_revenda_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "vw_dashboard_producao"
            referencedColumns: ["produto_id"]
          },
          {
            foreignKeyName: "distribuidor_precos_revenda_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "vw_produtos_com_receitas"
            referencedColumns: ["produto_id"]
          },
        ]
      }
      empresas: {
        Row: {
          app_key: string
          app_secret: string
          ativo: boolean
          cnpj: string | null
          codigo_conta_corrente_erp: string | null
          codigo_conta_corrente_s_boleto_erp: string | null
          created_at: string | null
          eh_cadastro_padrao: boolean
          estado: string | null
          id: string
          nome: string
          razao_social: string | null
          updated_at: string | null
        }
        Insert: {
          app_key: string
          app_secret: string
          ativo?: boolean
          cnpj?: string | null
          codigo_conta_corrente_erp?: string | null
          codigo_conta_corrente_s_boleto_erp?: string | null
          created_at?: string | null
          eh_cadastro_padrao?: boolean
          estado?: string | null
          id?: string
          nome: string
          razao_social?: string | null
          updated_at?: string | null
        }
        Update: {
          app_key?: string
          app_secret?: string
          ativo?: boolean
          cnpj?: string | null
          codigo_conta_corrente_erp?: string | null
          codigo_conta_corrente_s_boleto_erp?: string | null
          created_at?: string | null
          eh_cadastro_padrao?: boolean
          estado?: string | null
          id?: string
          nome?: string
          razao_social?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      enderecos_entrega: {
        Row: {
          bairro: string | null
          cep: string | null
          cidade: string | null
          cliente_id: string
          complemento: string | null
          created_at: string | null
          estado: string | null
          horarios_recebimento: string | null
          id: string
          is_padrao: boolean
          is_retirada_fabrica: boolean
          nome: string
          numero: string | null
          rua: string | null
          updated_at: string | null
        }
        Insert: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cliente_id: string
          complemento?: string | null
          created_at?: string | null
          estado?: string | null
          horarios_recebimento?: string | null
          id?: string
          is_padrao?: boolean
          is_retirada_fabrica?: boolean
          nome: string
          numero?: string | null
          rua?: string | null
          updated_at?: string | null
        }
        Update: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cliente_id?: string
          complemento?: string | null
          created_at?: string | null
          estado?: string | null
          horarios_recebimento?: string | null
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
      fechamentos: {
        Row: {
          cliente_id: string
          codigo_erp: number | null
          created_at: string
          criado_por: string
          data_fim: string
          data_inicio: string
          id: string
          observacoes: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          cliente_id: string
          codigo_erp?: number | null
          created_at?: string
          criado_por: string
          data_fim: string
          data_inicio: string
          id?: string
          observacoes?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          cliente_id?: string
          codigo_erp?: number | null
          created_at?: string
          criado_por?: string
          data_fim?: string
          data_inicio?: string
          id?: string
          observacoes?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fechamentos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fechamentos_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      insumos: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          custo_unitario: number
          id: string
          nome: string
          unidade_id: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          custo_unitario?: number
          id?: string
          nome: string
          unidade_id: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          custo_unitario?: number
          id?: string
          nome?: string
          unidade_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insumos_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      integracao_produtos: {
        Row: {
          codigo_produto: number | null
          codigo_produto_integracao: string | null
          created_at: string | null
          empresa_id: string
          id: string
          produto_id: string
          updated_at: string | null
        }
        Insert: {
          codigo_produto?: number | null
          codigo_produto_integracao?: string | null
          created_at?: string | null
          empresa_id: string
          id?: string
          produto_id: string
          updated_at?: string | null
        }
        Update: {
          codigo_produto?: number | null
          codigo_produto_integracao?: string | null
          created_at?: string | null
          empresa_id?: string
          id?: string
          produto_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integracao_produtos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integracao_produtos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integracao_produtos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "vw_dashboard_producao"
            referencedColumns: ["produto_id"]
          },
          {
            foreignKeyName: "integracao_produtos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "vw_produtos_com_receitas"
            referencedColumns: ["produto_id"]
          },
        ]
      }
      masseiras: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          id: string
          nome: string
          tempo_mistura_lenta_padrao: number | null
          tempo_mistura_rapida_padrao: number | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          id?: string
          nome: string
          tempo_mistura_lenta_padrao?: number | null
          tempo_mistura_rapida_padrao?: number | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          id?: string
          nome?: string
          tempo_mistura_lenta_padrao?: number | null
          tempo_mistura_rapida_padrao?: number | null
        }
        Relationships: []
      }
      ordens_producao: {
        Row: {
          created_at: string | null
          data_producao: string | null
          id: string
          lote_codigo: string
          pedido_id: string | null
          prioridade: number | null
          produto_id: string
          qtd_planejada: number
          status: string | null
        }
        Insert: {
          created_at?: string | null
          data_producao?: string | null
          id?: string
          lote_codigo: string
          pedido_id?: string | null
          prioridade?: number | null
          produto_id: string
          qtd_planejada: number
          status?: string | null
        }
        Update: {
          created_at?: string | null
          data_producao?: string | null
          id?: string
          lote_codigo?: string
          pedido_id?: string | null
          prioridade?: number | null
          produto_id?: string
          qtd_planejada?: number
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ordens_producao_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordens_producao_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "relatorio_producao_pedidos_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordens_producao_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "vw_dashboard_producao"
            referencedColumns: ["pedido_id"]
          },
          {
            foreignKeyName: "ordens_producao_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordens_producao_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "vw_dashboard_producao"
            referencedColumns: ["produto_id"]
          },
          {
            foreignKeyName: "ordens_producao_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "vw_produtos_com_receitas"
            referencedColumns: ["produto_id"]
          },
        ]
      }
      parceiros_indicadores: {
        Row: {
          ativo: boolean
          codigo: string
          comissao_percentual: number
          created_at: string | null
          id: string
          nome: string
          updated_at: string | null
          usuario_id: string | null
        }
        Insert: {
          ativo?: boolean
          codigo: string
          comissao_percentual?: number
          created_at?: string | null
          id?: string
          nome: string
          updated_at?: string | null
          usuario_id?: string | null
        }
        Update: {
          ativo?: boolean
          codigo?: string
          comissao_percentual?: number
          created_at?: string | null
          id?: string
          nome?: string
          updated_at?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parceiros_indicadores_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      parcelas: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          descricao: string | null
          id: string
          nome: string
          quantidade_parcelas: number
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome: string
          quantidade_parcelas: number
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          quantidade_parcelas?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      parcelas_empresa: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          empresa_id: string
          erp_codigo: string
          id: string
          parcela_id: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          empresa_id: string
          erp_codigo: string
          id?: string
          parcela_id: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          empresa_id?: string
          erp_codigo?: string
          id?: string
          parcela_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parcelas_empresa_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parcelas_empresa_parcela_id_fkey"
            columns: ["parcela_id"]
            isOneToOne: false
            referencedRelation: "parcelas"
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
          quantidade_confirmada: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          pedido_id: string
          produto_id: string
          quantidade: number
          quantidade_confirmada?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          pedido_id?: string
          produto_id?: string
          quantidade?: number
          quantidade_confirmada?: number
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
            foreignKeyName: "pedido_itens_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "relatorio_producao_pedidos_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_itens_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "vw_dashboard_producao"
            referencedColumns: ["pedido_id"]
          },
          {
            foreignKeyName: "pedido_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "vw_dashboard_producao"
            referencedColumns: ["produto_id"]
          },
          {
            foreignKeyName: "pedido_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "vw_produtos_com_receitas"
            referencedColumns: ["produto_id"]
          },
        ]
      }
      pedido_itens_lotes: {
        Row: {
          created_at: string
          criado_por: string
          id: string
          imagem_url: string | null
          observacao: string | null
          pedido_item_id: string
          quantidade: number
        }
        Insert: {
          created_at?: string
          criado_por: string
          id?: string
          imagem_url?: string | null
          observacao?: string | null
          pedido_item_id: string
          quantidade: number
        }
        Update: {
          created_at?: string
          criado_por?: string
          id?: string
          imagem_url?: string | null
          observacao?: string | null
          pedido_item_id?: string
          quantidade?: number
        }
        Relationships: [
          {
            foreignKeyName: "pedido_itens_lotes_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_itens_lotes_pedido_item_id_fkey"
            columns: ["pedido_item_id"]
            isOneToOne: false
            referencedRelation: "pedido_itens"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos: {
        Row: {
          atualizado_por: string
          cliente_id: string
          codigo_erp: number | null
          comissao_distribuidor_valor: number
          created_at: string | null
          criado_por: string
          data_entrega: string
          data_entrega_distribuidor: string | null
          desconto_percentual: number | null
          distribuidor_entrega_id: string | null
          endereco_entrega_id: string | null
          fechamento_id: string | null
          id: string
          is_bonificacao: boolean
          observacoes: string | null
          prazo_aprovacao: string | null
          prioridade: string
          status: string
          tipo_pedido: Database["public"]["Enums"]["tipo_pedido_enum"]
          updated_at: string | null
        }
        Insert: {
          atualizado_por: string
          cliente_id: string
          codigo_erp?: number | null
          comissao_distribuidor_valor?: number
          created_at?: string | null
          criado_por: string
          data_entrega: string
          data_entrega_distribuidor?: string | null
          desconto_percentual?: number | null
          distribuidor_entrega_id?: string | null
          endereco_entrega_id?: string | null
          fechamento_id?: string | null
          id?: string
          is_bonificacao?: boolean
          observacoes?: string | null
          prazo_aprovacao?: string | null
          prioridade?: string
          status?: string
          tipo_pedido?: Database["public"]["Enums"]["tipo_pedido_enum"]
          updated_at?: string | null
        }
        Update: {
          atualizado_por?: string
          cliente_id?: string
          codigo_erp?: number | null
          comissao_distribuidor_valor?: number
          created_at?: string | null
          criado_por?: string
          data_entrega?: string
          data_entrega_distribuidor?: string | null
          desconto_percentual?: number | null
          distribuidor_entrega_id?: string | null
          endereco_entrega_id?: string | null
          fechamento_id?: string | null
          id?: string
          is_bonificacao?: boolean
          observacoes?: string | null
          prazo_aprovacao?: string | null
          prioridade?: string
          status?: string
          tipo_pedido?: Database["public"]["Enums"]["tipo_pedido_enum"]
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
            foreignKeyName: "pedidos_distribuidor_entrega_id_fkey"
            columns: ["distribuidor_entrega_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_endereco_entrega_id_fkey"
            columns: ["endereco_entrega_id"]
            isOneToOne: false
            referencedRelation: "enderecos_entrega"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_fechamento_id_fkey"
            columns: ["fechamento_id"]
            isOneToOne: false
            referencedRelation: "fechamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      producao_etapas_log: {
        Row: {
          dados_qualidade: Json | null
          etapa: string
          fim: string | null
          fotos: string[] | null
          id: string
          inicio: string | null
          masseira_id: string | null
          ordem_producao_id: string
          perda_qtd: number | null
          qtd_entrada: number | null
          qtd_saida: number | null
          receita_id: string | null
          receitas_batidas: number | null
          temperatura_final: number | null
          tempo_lenta: number | null
          tempo_rapida: number | null
          textura: string | null
          usuario_id: string | null
        }
        Insert: {
          dados_qualidade?: Json | null
          etapa: string
          fim?: string | null
          fotos?: string[] | null
          id?: string
          inicio?: string | null
          masseira_id?: string | null
          ordem_producao_id: string
          perda_qtd?: number | null
          qtd_entrada?: number | null
          qtd_saida?: number | null
          receita_id?: string | null
          receitas_batidas?: number | null
          temperatura_final?: number | null
          tempo_lenta?: number | null
          tempo_rapida?: number | null
          textura?: string | null
          usuario_id?: string | null
        }
        Update: {
          dados_qualidade?: Json | null
          etapa?: string
          fim?: string | null
          fotos?: string[] | null
          id?: string
          inicio?: string | null
          masseira_id?: string | null
          ordem_producao_id?: string
          perda_qtd?: number | null
          qtd_entrada?: number | null
          qtd_saida?: number | null
          receita_id?: string | null
          receitas_batidas?: number | null
          temperatura_final?: number | null
          tempo_lenta?: number | null
          tempo_rapida?: number | null
          textura?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "producao_etapas_log_masseira_id_fkey"
            columns: ["masseira_id"]
            isOneToOne: false
            referencedRelation: "masseiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producao_etapas_log_ordem_producao_id_fkey"
            columns: ["ordem_producao_id"]
            isOneToOne: false
            referencedRelation: "ordens_producao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producao_etapas_log_ordem_producao_id_fkey"
            columns: ["ordem_producao_id"]
            isOneToOne: false
            referencedRelation: "vw_dashboard_producao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producao_etapas_log_receita_id_fkey"
            columns: ["receita_id"]
            isOneToOne: false
            referencedRelation: "receitas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producao_etapas_log_receita_id_fkey"
            columns: ["receita_id"]
            isOneToOne: false
            referencedRelation: "vw_produtos_com_receitas"
            referencedColumns: ["receita_id"]
          },
          {
            foreignKeyName: "producao_etapas_log_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      producao_massa_ingredientes: {
        Row: {
          created_at: string | null
          id: string
          insumo_id: string | null
          producao_etapas_log_id: string
          quantidade_padrao: number
          quantidade_usada: number
          unidade: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          insumo_id?: string | null
          producao_etapas_log_id: string
          quantidade_padrao: number
          quantidade_usada: number
          unidade: string
        }
        Update: {
          created_at?: string | null
          id?: string
          insumo_id?: string | null
          producao_etapas_log_id?: string
          quantidade_padrao?: number
          quantidade_usada?: number
          unidade?: string
        }
        Relationships: [
          {
            foreignKeyName: "producao_massa_ingredientes_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "producao_massa_ingredientes_producao_etapas_log_id_fkey"
            columns: ["producao_etapas_log_id"]
            isOneToOne: false
            referencedRelation: "producao_etapas_log"
            referencedColumns: ["id"]
          },
        ]
      }
      produto_familia_tag_associacoes: {
        Row: {
          created_at: string
          id: string
          produto_familia_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          produto_familia_id: string
          tag_id: string
        }
        Update: {
          created_at?: string
          id?: string
          produto_familia_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "produto_familia_tag_associacoes_produto_familia_id_fkey"
            columns: ["produto_familia_id"]
            isOneToOne: false
            referencedRelation: "produto_familias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produto_familia_tag_associacoes_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "produto_familia_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      produto_familia_tags: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
          ordem: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
          ordem?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
          ordem?: number
          updated_at?: string
        }
        Relationships: []
      }
      produto_familias: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          imagem_url: string | null
          nome_exibicao: string
          ordem: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          imagem_url?: string | null
          nome_exibicao: string
          ordem?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          imagem_url?: string | null
          nome_exibicao?: string
          ordem?: number
          updated_at?: string
        }
        Relationships: []
      }
      produto_receitas: {
        Row: {
          ativo: boolean
          created_at: string | null
          id: string
          produto_id: string
          quantidade_por_produto: number
          receita_id: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string | null
          id?: string
          produto_id: string
          quantidade_por_produto: number
          receita_id: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string | null
          id?: string
          produto_id?: string
          quantidade_por_produto?: number
          receita_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "produto_receitas_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produto_receitas_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "vw_dashboard_producao"
            referencedColumns: ["produto_id"]
          },
          {
            foreignKeyName: "produto_receitas_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "vw_produtos_com_receitas"
            referencedColumns: ["produto_id"]
          },
          {
            foreignKeyName: "produto_receitas_receita_id_fkey"
            columns: ["receita_id"]
            isOneToOne: false
            referencedRelation: "receitas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produto_receitas_receita_id_fkey"
            columns: ["receita_id"]
            isOneToOne: false
            referencedRelation: "vw_produtos_com_receitas"
            referencedColumns: ["receita_id"]
          },
        ]
      }
      produto_tag_associacoes: {
        Row: {
          created_at: string | null
          id: string
          produto_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          produto_id: string
          tag_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          produto_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "produto_tag_associacoes_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produto_tag_associacoes_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "vw_dashboard_producao"
            referencedColumns: ["produto_id"]
          },
          {
            foreignKeyName: "produto_tag_associacoes_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "vw_produtos_com_receitas"
            referencedColumns: ["produto_id"]
          },
          {
            foreignKeyName: "produto_tag_associacoes_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "produto_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      produto_tags: {
        Row: {
          ativo: boolean
          cor_background: string
          cor_borda: string
          cor_texto: string
          created_at: string | null
          id: string
          nome: string
          ordem: number
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean
          cor_background?: string
          cor_borda?: string
          cor_texto?: string
          created_at?: string | null
          id?: string
          nome: string
          ordem?: number
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean
          cor_background?: string
          cor_borda?: string
          cor_texto?: string
          created_at?: string | null
          id?: string
          nome?: string
          ordem?: number
          updated_at?: string | null
        }
        Relationships: []
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
          ordem_na_familia: number | null
          package_units: number | null
          produto_familia_id: string | null
          unidade: string
          unidade_descricao: string | null
          unidade_padrao_id: string | null
          unidades_assadeira: number | null
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
          ordem_na_familia?: number | null
          package_units?: number | null
          produto_familia_id?: string | null
          unidade: string
          unidade_descricao?: string | null
          unidade_padrao_id?: string | null
          unidades_assadeira?: number | null
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
          ordem_na_familia?: number | null
          package_units?: number | null
          produto_familia_id?: string | null
          unidade?: string
          unidade_descricao?: string | null
          unidade_padrao_id?: string | null
          unidades_assadeira?: number | null
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
          {
            foreignKeyName: "produtos_produto_familia_id_fkey"
            columns: ["produto_familia_id"]
            isOneToOne: false
            referencedRelation: "produto_familias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produtos_unidade_padrao_id_fkey"
            columns: ["unidade_padrao_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      receita_ingredientes: {
        Row: {
          id: string
          insumo_id: string
          quantidade_padrao: number
          receita_id: string | null
        }
        Insert: {
          id?: string
          insumo_id: string
          quantidade_padrao: number
          receita_id?: string | null
        }
        Update: {
          id?: string
          insumo_id?: string
          quantidade_padrao?: number
          receita_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "receita_ingredientes_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receita_ingredientes_receita_id_fkey"
            columns: ["receita_id"]
            isOneToOne: false
            referencedRelation: "receitas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receita_ingredientes_receita_id_fkey"
            columns: ["receita_id"]
            isOneToOne: false
            referencedRelation: "vw_produtos_com_receitas"
            referencedColumns: ["receita_id"]
          },
        ]
      }
      receita_masseira_parametros: {
        Row: {
          id: string
          masseira_id: string | null
          receita_id: string | null
          tempo_mistura_lenta: number | null
          tempo_mistura_rapida: number | null
        }
        Insert: {
          id?: string
          masseira_id?: string | null
          receita_id?: string | null
          tempo_mistura_lenta?: number | null
          tempo_mistura_rapida?: number | null
        }
        Update: {
          id?: string
          masseira_id?: string | null
          receita_id?: string | null
          tempo_mistura_lenta?: number | null
          tempo_mistura_rapida?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "receita_masseira_parametros_masseira_id_fkey"
            columns: ["masseira_id"]
            isOneToOne: false
            referencedRelation: "masseiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receita_masseira_parametros_receita_id_fkey"
            columns: ["receita_id"]
            isOneToOne: false
            referencedRelation: "receitas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receita_masseira_parametros_receita_id_fkey"
            columns: ["receita_id"]
            isOneToOne: false
            referencedRelation: "vw_produtos_com_receitas"
            referencedColumns: ["receita_id"]
          },
        ]
      }
      receitas: {
        Row: {
          ativo: boolean | null
          codigo: string | null
          created_at: string | null
          id: string
          nome: string
          tipo: Database["public"]["Enums"]["tipo_receita"]
        }
        Insert: {
          ativo?: boolean | null
          codigo?: string | null
          created_at?: string | null
          id?: string
          nome: string
          tipo?: Database["public"]["Enums"]["tipo_receita"]
        }
        Update: {
          ativo?: boolean | null
          codigo?: string | null
          created_at?: string | null
          id?: string
          nome?: string
          tipo?: Database["public"]["Enums"]["tipo_receita"]
        }
        Relationships: []
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
            foreignKeyName: "sugestoes_envio_logs_pedido_origem_id_fkey"
            columns: ["pedido_origem_id"]
            isOneToOne: false
            referencedRelation: "relatorio_producao_pedidos_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sugestoes_envio_logs_pedido_origem_id_fkey"
            columns: ["pedido_origem_id"]
            isOneToOne: false
            referencedRelation: "vw_dashboard_producao"
            referencedColumns: ["pedido_id"]
          },
          {
            foreignKeyName: "sugestoes_envio_logs_pedido_rascunho_id_fkey"
            columns: ["pedido_rascunho_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sugestoes_envio_logs_pedido_rascunho_id_fkey"
            columns: ["pedido_rascunho_id"]
            isOneToOne: false
            referencedRelation: "relatorio_producao_pedidos_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sugestoes_envio_logs_pedido_rascunho_id_fkey"
            columns: ["pedido_rascunho_id"]
            isOneToOne: false
            referencedRelation: "vw_dashboard_producao"
            referencedColumns: ["pedido_id"]
          },
        ]
      }
      tipos_estoque: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          id: string
          nome: string
          possui_etiqueta: boolean
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          id?: string
          nome: string
          possui_etiqueta?: boolean
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          id?: string
          nome?: string
          possui_etiqueta?: boolean
          updated_at?: string | null
        }
        Relationships: []
      }
      unidades: {
        Row: {
          ativo: boolean
          codigo: string
          created_at: string | null
          id: string
          nome: string
          nome_resumido: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean
          codigo: string
          created_at?: string | null
          id?: string
          nome: string
          nome_resumido: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean
          codigo?: string
          created_at?: string | null
          id?: string
          nome?: string
          nome_resumido?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      usuario_clientes: {
        Row: {
          cliente_id: string
          created_at: string | null
          id: string
          updated_at: string | null
          usuario_id: string
        }
        Insert: {
          cliente_id: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          usuario_id: string
        }
        Update: {
          cliente_id?: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuario_clientes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usuario_clientes_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
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
      vendedores: {
        Row: {
          ativo: boolean
          comissao_percentual: number
          created_at: string | null
          id: string
          nome: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean
          comissao_percentual?: number
          created_at?: string | null
          id?: string
          nome: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean
          comissao_percentual?: number
          created_at?: string | null
          id?: string
          nome?: string
          updated_at?: string | null
        }
        Relationships: []
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
      whatsapp_pedido_sessao: {
        Row: {
          created_at: string | null
          id: string
          payload: Json | null
          step: string
          telefone: string
          updated_at: string | null
          usuario_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          payload?: Json | null
          step?: string
          telefone: string
          updated_at?: string | null
          usuario_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          payload?: Json | null
          step?: string
          telefone?: string
          updated_at?: string | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_pedido_sessao_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      relatorio_producao_estimativas_v: {
        Row: {
          cliente: string | null
          d14: number | null
          d21: number | null
          d7: number | null
          endereco: string | null
          id: string | null
          media_quantidade: number | null
          min_quantidade: number | null
          produto: string | null
          projecao_entrega: string | null
        }
        Relationships: []
      }
      relatorio_producao_pedidos_v: {
        Row: {
          cliente: string | null
          data_entrega: string | null
          id: string | null
          nome: string | null
          produto: string | null
          quantidade_a_produzir: number | null
          quantidade_total: number | null
          status: string | null
        }
        Relationships: []
      }
      vw_dashboard_producao: {
        Row: {
          box_units: number | null
          data_producao: string | null
          etapa_atual: string | null
          id: string | null
          lote_codigo: string | null
          op_created_at: string | null
          pedido_id: string | null
          prioridade: number | null
          produto_codigo: string | null
          produto_id: string | null
          produto_nome: string | null
          produto_unidade: string | null
          qtd_planejada: number | null
          qtd_produzida_atual: number | null
          status: string | null
          ultima_atividade_at: string | null
          unidades_assadeira: number | null
          usuario_atual: string | null
        }
        Relationships: []
      }
      vw_produtos_com_receitas: {
        Row: {
          produto_codigo: string | null
          produto_id: string | null
          produto_nome: string | null
          quantidade_por_produto: number | null
          receita_ativa: boolean | null
          receita_codigo: string | null
          receita_id: string | null
          receita_nome: string | null
          receita_vinculada_ativa: boolean | null
          tipo_receita: Database["public"]["Enums"]["tipo_receita"] | null
        }
        Relationships: []
      }
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
      get_receita_tipo: {
        Args: { receita_id: string }
        Returns: Database["public"]["Enums"]["tipo_receita"]
      }
      get_user_cliente_id: { Args: { user_id: string }; Returns: string }
      get_user_tipo: { Args: { user_id: string }; Returns: string }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      clube_beneficio_tipo:
        | "bonificacao_produto"
        | "kit_degustacao"
        | "marketing_gravacao"
        | "marketing_fotos"
        | "visita_fabrica"
      clube_resgate_status:
        | "solicitado"
        | "em_analise"
        | "aprovado"
        | "agendado"
        | "concluido"
        | "cancelado"
      clube_transacao_tipo:
        | "ganho"
        | "bonus_primeiro_pedido"
        | "bonus_missao"
        | "resgate"
        | "expiracao"
        | "ajuste_manual"
      frequencia_pedido_enum: "semanal" | "quinzenal" | "esporadico"
      tipo_cliente_enum: "distribuidor" | "hamburgueria"
      tipo_pedido_enum: "valepan" | "hamburgueria"
      tipo_receita:
        | "massa"
        | "brilho"
        | "confeito"
        | "embalagem"
        | "caixa"
        | "antimofo"
      tipo_status_cadastro_enum:
        | "pendente"
        | "aprovado"
        | "rejeitado"
        | "cadastro_realizado"
        | "em_analise_valepan"
        | "em_analise_distribuidor"
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
    Enums: {
      clube_beneficio_tipo: [
        "bonificacao_produto",
        "kit_degustacao",
        "marketing_gravacao",
        "marketing_fotos",
        "visita_fabrica",
      ],
      clube_resgate_status: [
        "solicitado",
        "em_analise",
        "aprovado",
        "agendado",
        "concluido",
        "cancelado",
      ],
      clube_transacao_tipo: [
        "ganho",
        "bonus_primeiro_pedido",
        "bonus_missao",
        "resgate",
        "expiracao",
        "ajuste_manual",
      ],
      frequencia_pedido_enum: ["semanal", "quinzenal", "esporadico"],
      tipo_cliente_enum: ["distribuidor", "hamburgueria"],
      tipo_pedido_enum: ["valepan", "hamburgueria"],
      tipo_receita: [
        "massa",
        "brilho",
        "confeito",
        "embalagem",
        "caixa",
        "antimofo",
      ],
      tipo_status_cadastro_enum: [
        "pendente",
        "aprovado",
        "rejeitado",
        "cadastro_realizado",
        "em_analise_valepan",
        "em_analise_distribuidor",
      ],
    },
  },
} as const
