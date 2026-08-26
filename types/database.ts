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
      assadeiras: {
        Row: {
          ativo: boolean
          cor_hex: string
          created_at: string
          descricao: string | null
          diametro_buracos_mm: number | null
          id: string
          nome: string
          ordem: number
          quantidade: number
          unidades_por_assadeira: number | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cor_hex?: string
          created_at?: string
          descricao?: string | null
          diametro_buracos_mm?: number | null
          id?: string
          nome: string
          ordem?: number
          quantidade?: number
          unidades_por_assadeira?: number | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cor_hex?: string
          created_at?: string
          descricao?: string | null
          diametro_buracos_mm?: number | null
          id?: string
          nome?: string
          ordem?: number
          quantidade?: number
          unidades_por_assadeira?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      boleto_sync_manual_attempts: {
        Row: {
          attempted_at: string
          id: string
          pedido_id: string
          usuario_id: string | null
        }
        Insert: {
          attempted_at?: string
          id?: string
          pedido_id: string
          usuario_id?: string | null
        }
        Update: {
          attempted_at?: string
          id?: string
          pedido_id?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "boleto_sync_manual_attempts_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boleto_sync_manual_attempts_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "relatorio_producao_pedidos_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boleto_sync_manual_attempts_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      boleto_sync_pendencias: {
        Row: {
          cliente_id: string
          created_at: string
          empresa_id: string
          id: string
          max_tentativas: number
          next_attempt_at: string
          nota_fiscal_id: string
          pedido_id: string
          status: string
          tentativas: number
          ultimo_erro: string | null
          updated_at: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          empresa_id: string
          id?: string
          max_tentativas?: number
          next_attempt_at: string
          nota_fiscal_id: string
          pedido_id: string
          status?: string
          tentativas?: number
          ultimo_erro?: string | null
          updated_at?: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          empresa_id?: string
          id?: string
          max_tentativas?: number
          next_attempt_at?: string
          nota_fiscal_id?: string
          pedido_id?: string
          status?: string
          tentativas?: number
          ultimo_erro?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "boleto_sync_pendencias_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boleto_sync_pendencias_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "relatorio_script_consignados_v"
            referencedColumns: ["distribuidor_id"]
          },
          {
            foreignKeyName: "boleto_sync_pendencias_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boleto_sync_pendencias_nota_fiscal_id_fkey"
            columns: ["nota_fiscal_id"]
            isOneToOne: false
            referencedRelation: "notas_fiscais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boleto_sync_pendencias_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boleto_sync_pendencias_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "relatorio_producao_pedidos_v"
            referencedColumns: ["id"]
          },
        ]
      }
      boletos: {
        Row: {
          boleto_pdf_status: string
          boleto_pdf_storage_path: string | null
          boleto_pdf_tentativas: number
          boleto_pdf_ultima_tentativa_em: string | null
          boleto_pdf_ultimo_erro: string | null
          codigo_barras: string | null
          created_at: string
          data_pagamento: string | null
          data_vencimento: string | null
          empresa_id: string
          fechamento_id: string | null
          id: string
          id_integracao_bancaria: string | null
          nosso_numero: string | null
          pedido_id: string | null
          raw_json: Json | null
          seu_numero: string | null
          status_cobranca: string
          status_pagamento: string | null
          updated_at: string
          url_boleto: string | null
          valor: number | null
        }
        Insert: {
          boleto_pdf_status?: string
          boleto_pdf_storage_path?: string | null
          boleto_pdf_tentativas?: number
          boleto_pdf_ultima_tentativa_em?: string | null
          boleto_pdf_ultimo_erro?: string | null
          codigo_barras?: string | null
          created_at?: string
          data_pagamento?: string | null
          data_vencimento?: string | null
          empresa_id: string
          fechamento_id?: string | null
          id?: string
          id_integracao_bancaria?: string | null
          nosso_numero?: string | null
          pedido_id?: string | null
          raw_json?: Json | null
          seu_numero?: string | null
          status_cobranca?: string
          status_pagamento?: string | null
          updated_at?: string
          url_boleto?: string | null
          valor?: number | null
        }
        Update: {
          boleto_pdf_status?: string
          boleto_pdf_storage_path?: string | null
          boleto_pdf_tentativas?: number
          boleto_pdf_ultima_tentativa_em?: string | null
          boleto_pdf_ultimo_erro?: string | null
          codigo_barras?: string | null
          created_at?: string
          data_pagamento?: string | null
          data_vencimento?: string | null
          empresa_id?: string
          fechamento_id?: string | null
          id?: string
          id_integracao_bancaria?: string | null
          nosso_numero?: string | null
          pedido_id?: string | null
          raw_json?: Json | null
          seu_numero?: string | null
          status_cobranca?: string
          status_pagamento?: string | null
          updated_at?: string
          url_boleto?: string | null
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "boletos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boletos_fechamento_id_fkey"
            columns: ["fechamento_id"]
            isOneToOne: false
            referencedRelation: "fechamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boletos_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boletos_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "relatorio_producao_pedidos_v"
            referencedColumns: ["id"]
          },
        ]
      }
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
            foreignKeyName: "cadastro_hamburgueria_comentarios_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "relatorio_script_consignados_v"
            referencedColumns: ["distribuidor_id"]
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
      categoria_assadeira_regras: {
        Row: {
          assadeira_id: string
          ativo: boolean
          categoria_id: string
          created_at: string
          id: string
          ordem: number
          peso_g: number
          unidades_por_assadeira: number | null
          updated_at: string
        }
        Insert: {
          assadeira_id: string
          ativo?: boolean
          categoria_id: string
          created_at?: string
          id?: string
          ordem?: number
          peso_g: number
          unidades_por_assadeira?: number | null
          updated_at?: string
        }
        Update: {
          assadeira_id?: string
          ativo?: boolean
          categoria_id?: string
          created_at?: string
          id?: string
          ordem?: number
          peso_g?: number
          unidades_por_assadeira?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categoria_assadeira_regras_assadeira_id_fkey"
            columns: ["assadeira_id"]
            isOneToOne: false
            referencedRelation: "assadeiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categoria_assadeira_regras_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
        ]
      }
      categorias: {
        Row: {
          aparece_por_padrao: boolean
          ativo: boolean
          created_at: string | null
          id: string
          nome: string
          updated_at: string | null
          visivel_embalagem: boolean
        }
        Insert: {
          aparece_por_padrao?: boolean
          ativo?: boolean
          created_at?: string | null
          id?: string
          nome: string
          updated_at?: string | null
          visivel_embalagem?: boolean
        }
        Update: {
          aparece_por_padrao?: boolean
          ativo?: boolean
          created_at?: string | null
          id?: string
          nome?: string
          updated_at?: string | null
          visivel_embalagem?: boolean
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
          {
            foreignKeyName: "cliente_categorias_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "relatorio_script_consignados_v"
            referencedColumns: ["distribuidor_id"]
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
            foreignKeyName: "cliente_precos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "relatorio_script_consignados_v"
            referencedColumns: ["distribuidor_id"]
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
          codigo_conta_corrente_erp: string | null
          comissao_consignado_percentual: number
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
          grupo_comercial: string | null
          grupo_whatsapp: string | null
          id: string
          indicador_id: string | null
          inscricao_estadual: string | null
          instagram: string | null
          is_consignado: boolean
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
          pedido_cutoff_hora_brt: number | null
          pedido_lead_time_dias: number | null
          permite_auto_pedido_hamburgueria: boolean
          permite_pedido_hb_consignada: boolean
          permite_pedido_remessa: boolean
          permite_pedido_venda_normal: boolean
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
          vendedor_padrao_hamburguerias_id: string | null
          whatsapp_ddd: string | null
          whatsapp_numero: string | null
        }
        Insert: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          ativo?: boolean | null
          cnpj?: string | null
          codigo_cenario_imposto_erp?: number | null
          codigo_conta_corrente_erp?: string | null
          comissao_consignado_percentual?: number
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
          grupo_comercial?: string | null
          grupo_whatsapp?: string | null
          id?: string
          indicador_id?: string | null
          inscricao_estadual?: string | null
          instagram?: string | null
          is_consignado?: boolean
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
          pedido_cutoff_hora_brt?: number | null
          pedido_lead_time_dias?: number | null
          permite_auto_pedido_hamburgueria?: boolean
          permite_pedido_hb_consignada?: boolean
          permite_pedido_remessa?: boolean
          permite_pedido_venda_normal?: boolean
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
          vendedor_padrao_hamburguerias_id?: string | null
          whatsapp_ddd?: string | null
          whatsapp_numero?: string | null
        }
        Update: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          ativo?: boolean | null
          cnpj?: string | null
          codigo_cenario_imposto_erp?: number | null
          codigo_conta_corrente_erp?: string | null
          comissao_consignado_percentual?: number
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
          grupo_comercial?: string | null
          grupo_whatsapp?: string | null
          id?: string
          indicador_id?: string | null
          inscricao_estadual?: string | null
          instagram?: string | null
          is_consignado?: boolean
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
          pedido_cutoff_hora_brt?: number | null
          pedido_lead_time_dias?: number | null
          permite_auto_pedido_hamburgueria?: boolean
          permite_pedido_hb_consignada?: boolean
          permite_pedido_remessa?: boolean
          permite_pedido_venda_normal?: boolean
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
          vendedor_padrao_hamburguerias_id?: string | null
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
            foreignKeyName: "clientes_distribuidor_id_fkey"
            columns: ["distribuidor_id"]
            isOneToOne: false
            referencedRelation: "relatorio_script_consignados_v"
            referencedColumns: ["distribuidor_id"]
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
          {
            foreignKeyName: "clientes_vendedor_padrao_hamburguerias_id_fkey"
            columns: ["vendedor_padrao_hamburguerias_id"]
            isOneToOne: false
            referencedRelation: "vendedores"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes_migracao_faturamento: {
        Row: {
          cliente_id: string
          codigo_cenario_imposto_erp_destino: number | null
          codigo_cenario_imposto_erp_origem: number | null
          created_at: string
          empresa_id_destino: string
          empresa_id_origem: string
          erp_codigo_destino: string | null
          erp_codigo_origem: string | null
          erro_mensagem: string | null
          id: string
          migrado_em: string | null
          motivo: string
          parcela_padrao_id_origem: string | null
          revertido_em: string | null
          status: string
          updated_at: string
        }
        Insert: {
          cliente_id: string
          codigo_cenario_imposto_erp_destino?: number | null
          codigo_cenario_imposto_erp_origem?: number | null
          created_at?: string
          empresa_id_destino: string
          empresa_id_origem: string
          erp_codigo_destino?: string | null
          erp_codigo_origem?: string | null
          erro_mensagem?: string | null
          id?: string
          migrado_em?: string | null
          motivo?: string
          parcela_padrao_id_origem?: string | null
          revertido_em?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          cliente_id?: string
          codigo_cenario_imposto_erp_destino?: number | null
          codigo_cenario_imposto_erp_origem?: number | null
          created_at?: string
          empresa_id_destino?: string
          empresa_id_origem?: string
          erp_codigo_destino?: string | null
          erp_codigo_origem?: string | null
          erro_mensagem?: string | null
          id?: string
          migrado_em?: string | null
          motivo?: string
          parcela_padrao_id_origem?: string | null
          revertido_em?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clientes_migracao_faturamento_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clientes_migracao_faturamento_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "relatorio_script_consignados_v"
            referencedColumns: ["distribuidor_id"]
          },
          {
            foreignKeyName: "clientes_migracao_faturamento_empresa_id_destino_fkey"
            columns: ["empresa_id_destino"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clientes_migracao_faturamento_empresa_id_origem_fkey"
            columns: ["empresa_id_origem"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clientes_migracao_faturamento_parcela_padrao_id_origem_fkey"
            columns: ["parcela_padrao_id_origem"]
            isOneToOne: false
            referencedRelation: "parcelas"
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
            foreignKeyName: "clube_pontos_transacoes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "relatorio_script_consignados_v"
            referencedColumns: ["distribuidor_id"]
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
            foreignKeyName: "clube_resgates_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "relatorio_script_consignados_v"
            referencedColumns: ["distribuidor_id"]
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
            foreignKeyName: "cobranca_whatsapp_envios_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "relatorio_script_consignados_v"
            referencedColumns: ["distribuidor_id"]
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
      config_operacao: {
        Row: {
          id: string
          tempo_medio_fermentacao_min: number
          tempo_medio_resfriamento_min: number
          updated_at: string
        }
        Insert: {
          id?: string
          tempo_medio_fermentacao_min?: number
          tempo_medio_resfriamento_min?: number
          updated_at?: string
        }
        Update: {
          id?: string
          tempo_medio_fermentacao_min?: number
          tempo_medio_resfriamento_min?: number
          updated_at?: string
        }
        Relationships: []
      }
      config_operacao_turnos: {
        Row: {
          created_at: string
          etapa: string
          fim: string
          id: string
          inicio: string
          numero: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          etapa: string
          fim: string
          id?: string
          inicio: string
          numero: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          etapa?: string
          fim?: string
          id?: string
          inicio?: string
          numero?: number
          updated_at?: string
        }
        Relationships: []
      }
      distribuidor_parcelas_permitidas: {
        Row: {
          created_at: string
          distribuidor_id: string
          id: string
          is_default: boolean
          parcela_id: string
        }
        Insert: {
          created_at?: string
          distribuidor_id: string
          id?: string
          is_default?: boolean
          parcela_id: string
        }
        Update: {
          created_at?: string
          distribuidor_id?: string
          id?: string
          is_default?: boolean
          parcela_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "distribuidor_parcelas_permitidas_distribuidor_id_fkey"
            columns: ["distribuidor_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distribuidor_parcelas_permitidas_distribuidor_id_fkey"
            columns: ["distribuidor_id"]
            isOneToOne: false
            referencedRelation: "relatorio_script_consignados_v"
            referencedColumns: ["distribuidor_id"]
          },
          {
            foreignKeyName: "distribuidor_parcelas_permitidas_parcela_id_fkey"
            columns: ["parcela_id"]
            isOneToOne: false
            referencedRelation: "parcelas"
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
            foreignKeyName: "distribuidor_precos_revenda_distribuidor_id_fkey"
            columns: ["distribuidor_id"]
            isOneToOne: false
            referencedRelation: "relatorio_script_consignados_v"
            referencedColumns: ["distribuidor_id"]
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
            referencedRelation: "vw_produtos_com_receitas"
            referencedColumns: ["produto_id"]
          },
        ]
      }
      embalagem_lotes: {
        Row: {
          caixas: number
          congelado: string
          created_at: string
          criado_por: string | null
          data_fabricacao: string
          data_pedido: string
          etiqueta_foto_id: string | null
          etiqueta_foto_uploaded_at: string | null
          etiqueta_foto_url: string | null
          id: string
          kg: number
          lote: number | null
          modo: Database["public"]["Enums"]["embalagem_lote_modo"]
          obs_embalagem: string | null
          ordem_producao_id: string | null
          pacote_foto_id: string | null
          pacote_foto_uploaded_at: string | null
          pacote_foto_url: string | null
          pacotes: number
          pallet_foto_id: string | null
          pallet_foto_uploaded_at: string | null
          pallet_foto_url: string | null
          producao_anterior: Json | null
          produto_id: string
          produzido_em: string
          tipo_estoque_id: string
          turno: number | null
          unidades: number
        }
        Insert: {
          caixas?: number
          congelado?: string
          created_at?: string
          criado_por?: string | null
          data_fabricacao: string
          data_pedido: string
          etiqueta_foto_id?: string | null
          etiqueta_foto_uploaded_at?: string | null
          etiqueta_foto_url?: string | null
          id?: string
          kg?: number
          lote?: number | null
          modo: Database["public"]["Enums"]["embalagem_lote_modo"]
          obs_embalagem?: string | null
          ordem_producao_id?: string | null
          pacote_foto_id?: string | null
          pacote_foto_uploaded_at?: string | null
          pacote_foto_url?: string | null
          pacotes?: number
          pallet_foto_id?: string | null
          pallet_foto_uploaded_at?: string | null
          pallet_foto_url?: string | null
          producao_anterior?: Json | null
          produto_id: string
          produzido_em?: string
          tipo_estoque_id: string
          turno?: number | null
          unidades?: number
        }
        Update: {
          caixas?: number
          congelado?: string
          created_at?: string
          criado_por?: string | null
          data_fabricacao?: string
          data_pedido?: string
          etiqueta_foto_id?: string | null
          etiqueta_foto_uploaded_at?: string | null
          etiqueta_foto_url?: string | null
          id?: string
          kg?: number
          lote?: number | null
          modo?: Database["public"]["Enums"]["embalagem_lote_modo"]
          obs_embalagem?: string | null
          ordem_producao_id?: string | null
          pacote_foto_id?: string | null
          pacote_foto_uploaded_at?: string | null
          pacote_foto_url?: string | null
          pacotes?: number
          pallet_foto_id?: string | null
          pallet_foto_uploaded_at?: string | null
          pallet_foto_url?: string | null
          producao_anterior?: Json | null
          produto_id?: string
          produzido_em?: string
          tipo_estoque_id?: string
          turno?: number | null
          unidades?: number
        }
        Relationships: [
          {
            foreignKeyName: "embalagem_lotes_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "embalagem_lotes_ordem_producao_id_fkey"
            columns: ["ordem_producao_id"]
            isOneToOne: false
            referencedRelation: "ordens_producao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "embalagem_lotes_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "embalagem_lotes_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "vw_produtos_com_receitas"
            referencedColumns: ["produto_id"]
          },
          {
            foreignKeyName: "embalagem_lotes_tipo_estoque_id_fkey"
            columns: ["tipo_estoque_id"]
            isOneToOne: false
            referencedRelation: "tipos_estoque"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas: {
        Row: {
          app_key: string
          app_secret: string
          ativo: boolean
          cnpj: string | null
          codigo_cenario_imposto_remessa_consignacao_erp: number | null
          codigo_conta_corrente_erp: string | null
          codigo_conta_corrente_s_boleto_erp: string | null
          created_at: string | null
          eh_cadastro_padrao: boolean
          estado: string | null
          id: string
          nome: string
          parcelas_empresa_sem_cobranca_id: string | null
          pedido_cutoff_hora_brt: number
          pedido_lead_time_dias: number
          razao_social: string | null
          updated_at: string | null
        }
        Insert: {
          app_key: string
          app_secret: string
          ativo?: boolean
          cnpj?: string | null
          codigo_cenario_imposto_remessa_consignacao_erp?: number | null
          codigo_conta_corrente_erp?: string | null
          codigo_conta_corrente_s_boleto_erp?: string | null
          created_at?: string | null
          eh_cadastro_padrao?: boolean
          estado?: string | null
          id?: string
          nome: string
          parcelas_empresa_sem_cobranca_id?: string | null
          pedido_cutoff_hora_brt?: number
          pedido_lead_time_dias?: number
          razao_social?: string | null
          updated_at?: string | null
        }
        Update: {
          app_key?: string
          app_secret?: string
          ativo?: boolean
          cnpj?: string | null
          codigo_cenario_imposto_remessa_consignacao_erp?: number | null
          codigo_conta_corrente_erp?: string | null
          codigo_conta_corrente_s_boleto_erp?: string | null
          created_at?: string | null
          eh_cadastro_padrao?: boolean
          estado?: string | null
          id?: string
          nome?: string
          parcelas_empresa_sem_cobranca_id?: string | null
          pedido_cutoff_hora_brt?: number
          pedido_lead_time_dias?: number
          razao_social?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "empresas_parcelas_empresa_sem_cobranca_id_fkey"
            columns: ["parcelas_empresa_sem_cobranca_id"]
            isOneToOne: false
            referencedRelation: "parcelas_empresa"
            referencedColumns: ["id"]
          },
        ]
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
          latitude: number | null
          longitude: number | null
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
          latitude?: number | null
          longitude?: number | null
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
          latitude?: number | null
          longitude?: number | null
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
          {
            foreignKeyName: "enderecos_entrega_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "relatorio_script_consignados_v"
            referencedColumns: ["distribuidor_id"]
          },
        ]
      }
      estoque_consignado_movimentos: {
        Row: {
          created_at: string
          criado_por: string | null
          distribuidor_id: string
          id: string
          observacao: string | null
          pedido_id: string | null
          produto_id: string
          quantidade: number
          tipo: Database["public"]["Enums"]["estoque_consignado_tipo_mov_enum"]
        }
        Insert: {
          created_at?: string
          criado_por?: string | null
          distribuidor_id: string
          id?: string
          observacao?: string | null
          pedido_id?: string | null
          produto_id: string
          quantidade: number
          tipo: Database["public"]["Enums"]["estoque_consignado_tipo_mov_enum"]
        }
        Update: {
          created_at?: string
          criado_por?: string | null
          distribuidor_id?: string
          id?: string
          observacao?: string | null
          pedido_id?: string | null
          produto_id?: string
          quantidade?: number
          tipo?: Database["public"]["Enums"]["estoque_consignado_tipo_mov_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "estoque_consignado_movimentos_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_consignado_movimentos_distribuidor_id_fkey"
            columns: ["distribuidor_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_consignado_movimentos_distribuidor_id_fkey"
            columns: ["distribuidor_id"]
            isOneToOne: false
            referencedRelation: "relatorio_script_consignados_v"
            referencedColumns: ["distribuidor_id"]
          },
          {
            foreignKeyName: "estoque_consignado_movimentos_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_consignado_movimentos_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "relatorio_producao_pedidos_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_consignado_movimentos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_consignado_movimentos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "vw_produtos_com_receitas"
            referencedColumns: ["produto_id"]
          },
        ]
      }
      estoque_movimentos: {
        Row: {
          cliente: string | null
          created_at: string
          criado_por: string | null
          delta_caixas: number
          delta_kg: number
          delta_pacotes: number
          delta_unidades: number
          embalagem_lote_id: string | null
          id: string
          origem: Database["public"]["Enums"]["estoque_movimento_origem"]
          produto_id: string
          saldo_caixas: number
          saldo_kg: number
          saldo_pacotes: number
          saldo_unidades: number
          tipo_estoque_id: string
        }
        Insert: {
          cliente?: string | null
          created_at?: string
          criado_por?: string | null
          delta_caixas?: number
          delta_kg?: number
          delta_pacotes?: number
          delta_unidades?: number
          embalagem_lote_id?: string | null
          id?: string
          origem: Database["public"]["Enums"]["estoque_movimento_origem"]
          produto_id: string
          saldo_caixas?: number
          saldo_kg?: number
          saldo_pacotes?: number
          saldo_unidades?: number
          tipo_estoque_id: string
        }
        Update: {
          cliente?: string | null
          created_at?: string
          criado_por?: string | null
          delta_caixas?: number
          delta_kg?: number
          delta_pacotes?: number
          delta_unidades?: number
          embalagem_lote_id?: string | null
          id?: string
          origem?: Database["public"]["Enums"]["estoque_movimento_origem"]
          produto_id?: string
          saldo_caixas?: number
          saldo_kg?: number
          saldo_pacotes?: number
          saldo_unidades?: number
          tipo_estoque_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "estoque_movimentos_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_movimentos_embalagem_lote_id_fkey"
            columns: ["embalagem_lote_id"]
            isOneToOne: false
            referencedRelation: "embalagem_lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_movimentos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_movimentos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "vw_produtos_com_receitas"
            referencedColumns: ["produto_id"]
          },
          {
            foreignKeyName: "estoque_movimentos_tipo_estoque_id_fkey"
            columns: ["tipo_estoque_id"]
            isOneToOne: false
            referencedRelation: "tipos_estoque"
            referencedColumns: ["id"]
          },
        ]
      }
      estoque_saldos: {
        Row: {
          caixas: number
          id: string
          kg: number
          pacotes: number
          produto_id: string
          tipo_estoque_id: string
          unidades: number
          updated_at: string
        }
        Insert: {
          caixas?: number
          id?: string
          kg?: number
          pacotes?: number
          produto_id: string
          tipo_estoque_id: string
          unidades?: number
          updated_at?: string
        }
        Update: {
          caixas?: number
          id?: string
          kg?: number
          pacotes?: number
          produto_id?: string
          tipo_estoque_id?: string
          unidades?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "estoque_saldos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_saldos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "vw_produtos_com_receitas"
            referencedColumns: ["produto_id"]
          },
          {
            foreignKeyName: "estoque_saldos_tipo_estoque_id_fkey"
            columns: ["tipo_estoque_id"]
            isOneToOne: false
            referencedRelation: "tipos_estoque"
            referencedColumns: ["id"]
          },
        ]
      }
      etiquetas_geradas: {
        Row: {
          created_at: string
          data_fabricacao: string
          gerado_em: string
          gerado_por: string | null
          id: string
          modo: string
          ordem_producao_id: string | null
          produto_id: string
          tipo_estoque_id: string
        }
        Insert: {
          created_at?: string
          data_fabricacao: string
          gerado_em?: string
          gerado_por?: string | null
          id?: string
          modo: string
          ordem_producao_id?: string | null
          produto_id: string
          tipo_estoque_id: string
        }
        Update: {
          created_at?: string
          data_fabricacao?: string
          gerado_em?: string
          gerado_por?: string | null
          id?: string
          modo?: string
          ordem_producao_id?: string | null
          produto_id?: string
          tipo_estoque_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "etiquetas_geradas_gerado_por_fkey"
            columns: ["gerado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "etiquetas_geradas_ordem_producao_id_fkey"
            columns: ["ordem_producao_id"]
            isOneToOne: false
            referencedRelation: "ordens_producao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "etiquetas_geradas_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "etiquetas_geradas_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "vw_produtos_com_receitas"
            referencedColumns: ["produto_id"]
          },
          {
            foreignKeyName: "etiquetas_geradas_tipo_estoque_id_fkey"
            columns: ["tipo_estoque_id"]
            isOneToOne: false
            referencedRelation: "tipos_estoque"
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
            foreignKeyName: "fechamentos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "relatorio_script_consignados_v"
            referencedColumns: ["distribuidor_id"]
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
      fermentacao_lotes: {
        Row: {
          assadeiras: number
          created_at: string
          criado_por: string | null
          foto_id: string | null
          foto_uploaded_at: string | null
          foto_url: string | null
          id: string
          modo: Database["public"]["Enums"]["producao_lote_modo"]
          ordem_producao_id: string
          producao_anterior: Json | null
          produzido_em: string
          turno: number | null
          unidades: number
        }
        Insert: {
          assadeiras?: number
          created_at?: string
          criado_por?: string | null
          foto_id?: string | null
          foto_uploaded_at?: string | null
          foto_url?: string | null
          id?: string
          modo: Database["public"]["Enums"]["producao_lote_modo"]
          ordem_producao_id: string
          producao_anterior?: Json | null
          produzido_em?: string
          turno?: number | null
          unidades?: number
        }
        Update: {
          assadeiras?: number
          created_at?: string
          criado_por?: string | null
          foto_id?: string | null
          foto_uploaded_at?: string | null
          foto_url?: string | null
          id?: string
          modo?: Database["public"]["Enums"]["producao_lote_modo"]
          ordem_producao_id?: string
          producao_anterior?: Json | null
          produzido_em?: string
          turno?: number | null
          unidades?: number
        }
        Relationships: [
          {
            foreignKeyName: "fermentacao_lotes_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fermentacao_lotes_ordem_producao_id_fkey"
            columns: ["ordem_producao_id"]
            isOneToOne: false
            referencedRelation: "ordens_producao"
            referencedColumns: ["id"]
          },
        ]
      }
      forno_lotes: {
        Row: {
          assadeiras: number
          created_at: string
          criado_por: string | null
          foto_id: string | null
          foto_uploaded_at: string | null
          foto_url: string | null
          id: string
          modo: Database["public"]["Enums"]["producao_lote_modo"]
          ordem_producao_id: string
          producao_anterior: Json | null
          produzido_em: string
          turno: number | null
          unidades: number
        }
        Insert: {
          assadeiras?: number
          created_at?: string
          criado_por?: string | null
          foto_id?: string | null
          foto_uploaded_at?: string | null
          foto_url?: string | null
          id?: string
          modo: Database["public"]["Enums"]["producao_lote_modo"]
          ordem_producao_id: string
          producao_anterior?: Json | null
          produzido_em?: string
          turno?: number | null
          unidades?: number
        }
        Update: {
          assadeiras?: number
          created_at?: string
          criado_por?: string | null
          foto_id?: string | null
          foto_uploaded_at?: string | null
          foto_url?: string | null
          id?: string
          modo?: Database["public"]["Enums"]["producao_lote_modo"]
          ordem_producao_id?: string
          producao_anterior?: Json | null
          produzido_em?: string
          turno?: number | null
          unidades?: number
        }
        Relationships: [
          {
            foreignKeyName: "forno_lotes_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forno_lotes_ordem_producao_id_fkey"
            columns: ["ordem_producao_id"]
            isOneToOne: false
            referencedRelation: "ordens_producao"
            referencedColumns: ["id"]
          },
        ]
      }
      insumo_distribuidor: {
        Row: {
          created_at: string
          id: string
          insumo_id: string
          nome: string
          ordem: number
          preferencial: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          insumo_id: string
          nome: string
          ordem?: number
          preferencial?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          insumo_id?: string
          nome?: string
          ordem?: number
          preferencial?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "insumo_distribuidor_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
        ]
      }
      insumo_entrada_pendencias: {
        Row: {
          categoria_compra_codigo: string | null
          categoria_compra_descricao: string | null
          cfop_entrada: string | null
          created_at: string
          data_emissao_nf: string | null
          descricao_produto: string | null
          empresa_id: string
          fornecedor_cnpj: string | null
          fornecedor_nome: string | null
          fornecedor_razao_social: string | null
          id: string
          integracao_insumo_id: string | null
          natureza_operacao: string | null
          ncm_produto: string | null
          numero_nf: string | null
          omie_codigo_produto: string | null
          omie_id_produto: number
          omie_n_id_item: number
          omie_n_id_receb: number
          omie_webhook_evento_id: string | null
          preco_unit_nf: number | null
          quantidade_nf: number
          resolvido_em: string | null
          status: Database["public"]["Enums"]["insumo_pendencia_status"]
          unidade_nf: string | null
          valor_total_item: number
          valor_total_nf: number | null
        }
        Insert: {
          categoria_compra_codigo?: string | null
          categoria_compra_descricao?: string | null
          cfop_entrada?: string | null
          created_at?: string
          data_emissao_nf?: string | null
          descricao_produto?: string | null
          empresa_id: string
          fornecedor_cnpj?: string | null
          fornecedor_nome?: string | null
          fornecedor_razao_social?: string | null
          id?: string
          integracao_insumo_id?: string | null
          natureza_operacao?: string | null
          ncm_produto?: string | null
          numero_nf?: string | null
          omie_codigo_produto?: string | null
          omie_id_produto: number
          omie_n_id_item: number
          omie_n_id_receb: number
          omie_webhook_evento_id?: string | null
          preco_unit_nf?: number | null
          quantidade_nf: number
          resolvido_em?: string | null
          status?: Database["public"]["Enums"]["insumo_pendencia_status"]
          unidade_nf?: string | null
          valor_total_item: number
          valor_total_nf?: number | null
        }
        Update: {
          categoria_compra_codigo?: string | null
          categoria_compra_descricao?: string | null
          cfop_entrada?: string | null
          created_at?: string
          data_emissao_nf?: string | null
          descricao_produto?: string | null
          empresa_id?: string
          fornecedor_cnpj?: string | null
          fornecedor_nome?: string | null
          fornecedor_razao_social?: string | null
          id?: string
          integracao_insumo_id?: string | null
          natureza_operacao?: string | null
          ncm_produto?: string | null
          numero_nf?: string | null
          omie_codigo_produto?: string | null
          omie_id_produto?: number
          omie_n_id_item?: number
          omie_n_id_receb?: number
          omie_webhook_evento_id?: string | null
          preco_unit_nf?: number | null
          quantidade_nf?: number
          resolvido_em?: string | null
          status?: Database["public"]["Enums"]["insumo_pendencia_status"]
          unidade_nf?: string | null
          valor_total_item?: number
          valor_total_nf?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "insumo_entrada_pendencias_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insumo_entrada_pendencias_integracao_insumo_id_fkey"
            columns: ["integracao_insumo_id"]
            isOneToOne: false
            referencedRelation: "integracao_insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insumo_entrada_pendencias_omie_webhook_evento_id_fkey"
            columns: ["omie_webhook_evento_id"]
            isOneToOne: false
            referencedRelation: "omie_webhook_eventos"
            referencedColumns: ["id"]
          },
        ]
      }
      insumo_fornecedor_ignorado: {
        Row: {
          criado_em: string
          criado_por: string | null
          empresa_id: string
          fornecedor_cnpj: string
          fornecedor_nome: string | null
          fornecedor_razao_social: string | null
          id: string
        }
        Insert: {
          criado_em?: string
          criado_por?: string | null
          empresa_id: string
          fornecedor_cnpj: string
          fornecedor_nome?: string | null
          fornecedor_razao_social?: string | null
          id?: string
        }
        Update: {
          criado_em?: string
          criado_por?: string | null
          empresa_id?: string
          fornecedor_cnpj?: string
          fornecedor_nome?: string | null
          fornecedor_razao_social?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "insumo_fornecedor_ignorado_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      insumo_movimentos: {
        Row: {
          created_at: string
          custo_unitario: number
          delta_quantidade: number
          embalagem_lote_id: string | null
          empresa_id: string | null
          fermentacao_lote_id: string | null
          forno_lote_id: string | null
          id: string
          insumo_id: string
          numero_nf: string | null
          observacao: string | null
          omie_n_id_item: number | null
          omie_n_id_receb: number | null
          omie_webhook_evento_id: string | null
          origem: Database["public"]["Enums"]["insumo_movimento_origem"]
          pendencia_id: string | null
          saldo_resultante: number
        }
        Insert: {
          created_at?: string
          custo_unitario?: number
          delta_quantidade: number
          embalagem_lote_id?: string | null
          empresa_id?: string | null
          fermentacao_lote_id?: string | null
          forno_lote_id?: string | null
          id?: string
          insumo_id: string
          numero_nf?: string | null
          observacao?: string | null
          omie_n_id_item?: number | null
          omie_n_id_receb?: number | null
          omie_webhook_evento_id?: string | null
          origem: Database["public"]["Enums"]["insumo_movimento_origem"]
          pendencia_id?: string | null
          saldo_resultante: number
        }
        Update: {
          created_at?: string
          custo_unitario?: number
          delta_quantidade?: number
          embalagem_lote_id?: string | null
          empresa_id?: string | null
          fermentacao_lote_id?: string | null
          forno_lote_id?: string | null
          id?: string
          insumo_id?: string
          numero_nf?: string | null
          observacao?: string | null
          omie_n_id_item?: number | null
          omie_n_id_receb?: number | null
          omie_webhook_evento_id?: string | null
          origem?: Database["public"]["Enums"]["insumo_movimento_origem"]
          pendencia_id?: string | null
          saldo_resultante?: number
        }
        Relationships: [
          {
            foreignKeyName: "insumo_movimentos_embalagem_lote_id_fkey"
            columns: ["embalagem_lote_id"]
            isOneToOne: false
            referencedRelation: "embalagem_lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insumo_movimentos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insumo_movimentos_fermentacao_lote_id_fkey"
            columns: ["fermentacao_lote_id"]
            isOneToOne: false
            referencedRelation: "fermentacao_lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insumo_movimentos_forno_lote_id_fkey"
            columns: ["forno_lote_id"]
            isOneToOne: false
            referencedRelation: "forno_lotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insumo_movimentos_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insumo_movimentos_omie_webhook_evento_id_fkey"
            columns: ["omie_webhook_evento_id"]
            isOneToOne: false
            referencedRelation: "omie_webhook_eventos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insumo_movimentos_pendencia_id_fkey"
            columns: ["pendencia_id"]
            isOneToOne: false
            referencedRelation: "insumo_entrada_pendencias"
            referencedColumns: ["id"]
          },
        ]
      }
      insumo_regra_compra: {
        Row: {
          ativo: boolean
          created_at: string
          dias_semana: number[] | null
          insumo_id: string
          janela_tipo: string
          lead_time_dias: number
          quantidade_maxima: number | null
          quantidade_minima: number | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          dias_semana?: number[] | null
          insumo_id: string
          janela_tipo?: string
          lead_time_dias: number
          quantidade_maxima?: number | null
          quantidade_minima?: number | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          dias_semana?: number[] | null
          insumo_id?: string
          janela_tipo?: string
          lead_time_dias?: number
          quantidade_maxima?: number | null
          quantidade_minima?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "insumo_regra_compra_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: true
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
        ]
      }
      insumo_saldos: {
        Row: {
          insumo_id: string
          quantidade: number
          updated_at: string
        }
        Insert: {
          insumo_id: string
          quantidade?: number
          updated_at?: string
        }
        Update: {
          insumo_id?: string
          quantidade?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "insumo_saldos_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: true
            referencedRelation: "insumos"
            referencedColumns: ["id"]
          },
        ]
      }
      insumos: {
        Row: {
          ativo: boolean | null
          conversao_fator: number | null
          conversao_unidade_id: string | null
          created_at: string | null
          custo_unitario: number | null
          id: string
          nome: string
          unidade_id: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          conversao_fator?: number | null
          conversao_unidade_id?: string | null
          created_at?: string | null
          custo_unitario?: number | null
          id?: string
          nome: string
          unidade_id: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          conversao_fator?: number | null
          conversao_unidade_id?: string | null
          created_at?: string | null
          custo_unitario?: number | null
          id?: string
          nome?: string
          unidade_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insumos_conversao_unidade_id_fkey"
            columns: ["conversao_unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insumos_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      integracao_insumos: {
        Row: {
          ativo: boolean
          created_at: string
          descricao_omie: string | null
          empresa_id: string
          fator_conversao: number
          id: string
          insumo_id: string
          omie_codigo_produto: string | null
          omie_id_produto: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao_omie?: string | null
          empresa_id: string
          fator_conversao?: number
          id?: string
          insumo_id: string
          omie_codigo_produto?: string | null
          omie_id_produto: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao_omie?: string | null
          empresa_id?: string
          fator_conversao?: number
          id?: string
          insumo_id?: string
          omie_codigo_produto?: string | null
          omie_id_produto?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integracao_insumos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integracao_insumos_insumo_id_fkey"
            columns: ["insumo_id"]
            isOneToOne: false
            referencedRelation: "insumos"
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
            referencedRelation: "vw_produtos_com_receitas"
            referencedColumns: ["produto_id"]
          },
        ]
      }
      login_qr_requests: {
        Row: {
          approved_at: string | null
          consumed_at: string | null
          created_at: string
          exchange_token_hash: string | null
          expires_at: string
          id: string
          status: string
          usuario_id: string | null
        }
        Insert: {
          approved_at?: string | null
          consumed_at?: string | null
          created_at?: string
          exchange_token_hash?: string | null
          expires_at: string
          id?: string
          status?: string
          usuario_id?: string | null
        }
        Update: {
          approved_at?: string | null
          consumed_at?: string | null
          created_at?: string
          exchange_token_hash?: string | null
          expires_at?: string
          id?: string
          status?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "login_qr_requests_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      metas_diarias: {
        Row: {
          caixas_proprias_meta: number
          data: string
          faturamento_meta: number
          id: string
          is_feriado_nacional: boolean
          meta_mensal_id: string
          peso: number
        }
        Insert: {
          caixas_proprias_meta: number
          data: string
          faturamento_meta: number
          id?: string
          is_feriado_nacional?: boolean
          meta_mensal_id: string
          peso: number
        }
        Update: {
          caixas_proprias_meta?: number
          data?: string
          faturamento_meta?: number
          id?: string
          is_feriado_nacional?: boolean
          meta_mensal_id?: string
          peso?: number
        }
        Relationships: [
          {
            foreignKeyName: "metas_diarias_meta_mensal_id_fkey"
            columns: ["meta_mensal_id"]
            isOneToOne: false
            referencedRelation: "metas_mensais"
            referencedColumns: ["id"]
          },
        ]
      }
      metas_mensais: {
        Row: {
          ano_mes: string
          caixas_proprias: number
          caixas_terceirizadas: number
          caixas_total: number
          created_at: string
          faturamento_meta: number
          id: string
          margem_bruta_pct: number
          produtividade_assadeiras_hora_forno: number
          produtividade_assadeiras_hora_producao: number
          produtividade_caixas_hora_embalagem: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ano_mes: string
          caixas_proprias: number
          caixas_terceirizadas: number
          caixas_total: number
          created_at?: string
          faturamento_meta: number
          id?: string
          margem_bruta_pct: number
          produtividade_assadeiras_hora_forno: number
          produtividade_assadeiras_hora_producao: number
          produtividade_caixas_hora_embalagem: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ano_mes?: string
          caixas_proprias?: number
          caixas_terceirizadas?: number
          caixas_total?: number
          created_at?: string
          faturamento_meta?: number
          id?: string
          margem_bruta_pct?: number
          produtividade_assadeiras_hora_forno?: number
          produtividade_assadeiras_hora_producao?: number
          produtividade_caixas_hora_embalagem?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "metas_mensais_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      nota_fiscal_fechamento: {
        Row: {
          created_at: string
          fechamento_id: string
          id: string
          nota_fiscal_id: string
        }
        Insert: {
          created_at?: string
          fechamento_id: string
          id?: string
          nota_fiscal_id: string
        }
        Update: {
          created_at?: string
          fechamento_id?: string
          id?: string
          nota_fiscal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nota_fiscal_fechamento_fechamento_id_fkey"
            columns: ["fechamento_id"]
            isOneToOne: false
            referencedRelation: "fechamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nota_fiscal_fechamento_nota_fiscal_id_fkey"
            columns: ["nota_fiscal_id"]
            isOneToOne: false
            referencedRelation: "notas_fiscais"
            referencedColumns: ["id"]
          },
        ]
      }
      nota_fiscal_itens: {
        Row: {
          cfop: string | null
          cmv_calculado_em: string | null
          cmv_recalculado_em: string | null
          cmv_status: string
          cmv_total: number | null
          codigo_produto: string | null
          created_at: string
          custo_unitario_cmv: number | null
          descricao: string | null
          id: string
          ncm: string | null
          nota_fiscal_id: string
          omie_cod_item: number | null
          omie_cod_prod: number | null
          produto_id: string | null
          quantidade: number | null
          quantidade_unidades: number | null
          sequencia: number
          unidade: string | null
          updated_at: string
          valor_bc: number | null
          valor_cbs: number | null
          valor_cofins: number | null
          valor_ibs: number | null
          valor_icms: number | null
          valor_icms_st: number | null
          valor_ipi: number | null
          valor_iss: number | null
          valor_pis: number | null
          valor_produto: number | null
          valor_total_item: number | null
          valor_unitario: number | null
        }
        Insert: {
          cfop?: string | null
          cmv_calculado_em?: string | null
          cmv_recalculado_em?: string | null
          cmv_status?: string
          cmv_total?: number | null
          codigo_produto?: string | null
          created_at?: string
          custo_unitario_cmv?: number | null
          descricao?: string | null
          id?: string
          ncm?: string | null
          nota_fiscal_id: string
          omie_cod_item?: number | null
          omie_cod_prod?: number | null
          produto_id?: string | null
          quantidade?: number | null
          quantidade_unidades?: number | null
          sequencia: number
          unidade?: string | null
          updated_at?: string
          valor_bc?: number | null
          valor_cbs?: number | null
          valor_cofins?: number | null
          valor_ibs?: number | null
          valor_icms?: number | null
          valor_icms_st?: number | null
          valor_ipi?: number | null
          valor_iss?: number | null
          valor_pis?: number | null
          valor_produto?: number | null
          valor_total_item?: number | null
          valor_unitario?: number | null
        }
        Update: {
          cfop?: string | null
          cmv_calculado_em?: string | null
          cmv_recalculado_em?: string | null
          cmv_status?: string
          cmv_total?: number | null
          codigo_produto?: string | null
          created_at?: string
          custo_unitario_cmv?: number | null
          descricao?: string | null
          id?: string
          ncm?: string | null
          nota_fiscal_id?: string
          omie_cod_item?: number | null
          omie_cod_prod?: number | null
          produto_id?: string | null
          quantidade?: number | null
          quantidade_unidades?: number | null
          sequencia?: number
          unidade?: string | null
          updated_at?: string
          valor_bc?: number | null
          valor_cbs?: number | null
          valor_cofins?: number | null
          valor_ibs?: number | null
          valor_icms?: number | null
          valor_icms_st?: number | null
          valor_ipi?: number | null
          valor_iss?: number | null
          valor_pis?: number | null
          valor_produto?: number | null
          valor_total_item?: number | null
          valor_unitario?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "nota_fiscal_itens_nota_fiscal_id_fkey"
            columns: ["nota_fiscal_id"]
            isOneToOne: false
            referencedRelation: "notas_fiscais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nota_fiscal_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nota_fiscal_itens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "vw_produtos_com_receitas"
            referencedColumns: ["produto_id"]
          },
        ]
      }
      nota_fiscal_pedido: {
        Row: {
          created_at: string
          id: string
          nota_fiscal_id: string
          pedido_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          nota_fiscal_id: string
          pedido_id: string
        }
        Update: {
          created_at?: string
          id?: string
          nota_fiscal_id?: string
          pedido_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nota_fiscal_pedido_nota_fiscal_id_fkey"
            columns: ["nota_fiscal_id"]
            isOneToOne: false
            referencedRelation: "notas_fiscais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nota_fiscal_pedido_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nota_fiscal_pedido_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "relatorio_producao_pedidos_v"
            referencedColumns: ["id"]
          },
        ]
      }
      notas_fiscais: {
        Row: {
          chave_acesso: string | null
          consultar_nf_raw_json: Json | null
          created_at: string
          danfe_arquivo_status: string
          danfe_storage_path: string | null
          danfe_tentativas: number
          danfe_ultima_tentativa_em: string | null
          danfe_ultimo_erro: string | null
          data_emissao: string | null
          empresa_id: string
          id: string
          itens_enriquecimento_em: string | null
          itens_enriquecimento_status: string
          itens_enriquecimento_tentativas: number
          itens_enriquecimento_ultima_tentativa_em: string | null
          itens_enriquecimento_ultimo_erro: string | null
          modelo: string | null
          numero_nota: string | null
          omie_evento_id: string | null
          omie_id_nf: number | null
          omie_pedido_codigo: number | null
          raw_json: Json | null
          reconciliada: boolean
          serie: string | null
          status: string
          updated_at: string
          url_danfe: string | null
          url_xml: string | null
          valor_produtos: number | null
          valor_total: number | null
        }
        Insert: {
          chave_acesso?: string | null
          consultar_nf_raw_json?: Json | null
          created_at?: string
          danfe_arquivo_status?: string
          danfe_storage_path?: string | null
          danfe_tentativas?: number
          danfe_ultima_tentativa_em?: string | null
          danfe_ultimo_erro?: string | null
          data_emissao?: string | null
          empresa_id: string
          id?: string
          itens_enriquecimento_em?: string | null
          itens_enriquecimento_status?: string
          itens_enriquecimento_tentativas?: number
          itens_enriquecimento_ultima_tentativa_em?: string | null
          itens_enriquecimento_ultimo_erro?: string | null
          modelo?: string | null
          numero_nota?: string | null
          omie_evento_id?: string | null
          omie_id_nf?: number | null
          omie_pedido_codigo?: number | null
          raw_json?: Json | null
          reconciliada?: boolean
          serie?: string | null
          status?: string
          updated_at?: string
          url_danfe?: string | null
          url_xml?: string | null
          valor_produtos?: number | null
          valor_total?: number | null
        }
        Update: {
          chave_acesso?: string | null
          consultar_nf_raw_json?: Json | null
          created_at?: string
          danfe_arquivo_status?: string
          danfe_storage_path?: string | null
          danfe_tentativas?: number
          danfe_ultima_tentativa_em?: string | null
          danfe_ultimo_erro?: string | null
          data_emissao?: string | null
          empresa_id?: string
          id?: string
          itens_enriquecimento_em?: string | null
          itens_enriquecimento_status?: string
          itens_enriquecimento_tentativas?: number
          itens_enriquecimento_ultima_tentativa_em?: string | null
          itens_enriquecimento_ultimo_erro?: string | null
          modelo?: string | null
          numero_nota?: string | null
          omie_evento_id?: string | null
          omie_id_nf?: number | null
          omie_pedido_codigo?: number | null
          raw_json?: Json | null
          reconciliada?: boolean
          serie?: string | null
          status?: string
          updated_at?: string
          url_danfe?: string | null
          url_xml?: string | null
          valor_produtos?: number | null
          valor_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "notas_fiscais_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notas_fiscais_omie_evento_id_fkey"
            columns: ["omie_evento_id"]
            isOneToOne: false
            referencedRelation: "omie_webhook_eventos"
            referencedColumns: ["id"]
          },
        ]
      }
      omie_webhook_eventos: {
        Row: {
          app_key_recebida: string
          created_at: string
          empresa_id: string
          erro: string | null
          id: string
          message_id: string | null
          payload_json: Json
          processed_at: string | null
          received_at: string
          status_processamento: string
          topic: string
          updated_at: string
        }
        Insert: {
          app_key_recebida: string
          created_at?: string
          empresa_id: string
          erro?: string | null
          id?: string
          message_id?: string | null
          payload_json: Json
          processed_at?: string | null
          received_at?: string
          status_processamento?: string
          topic: string
          updated_at?: string
        }
        Update: {
          app_key_recebida?: string
          created_at?: string
          empresa_id?: string
          erro?: string | null
          id?: string
          message_id?: string | null
          payload_json?: Json
          processed_at?: string | null
          received_at?: string
          status_processamento?: string
          topic?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "omie_webhook_eventos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      ordens_producao: {
        Row: {
          assadeira_id: string | null
          assadeiras: number
          caixas: number
          created_at: string
          criado_por: string | null
          data_fabricacao_etiqueta: string
          data_producao: string
          embalagem_finalizada: boolean
          embalagem_finalizada_em: string | null
          embalagem_meta_confirmada: number | null
          fermentacao_finalizada: boolean
          fermentacao_finalizada_em: string | null
          fermentacao_meta_confirmada: number | null
          forno_finalizada: boolean
          forno_finalizada_em: string | null
          forno_meta_confirmada: number | null
          id: string
          kg: number
          observacao: string
          ordem_planejamento: number
          pacotes: number
          produto_id: string
          tipo_estoque_id: string
          unidades: number
          updated_at: string
        }
        Insert: {
          assadeira_id?: string | null
          assadeiras?: number
          caixas?: number
          created_at?: string
          criado_por?: string | null
          data_fabricacao_etiqueta: string
          data_producao: string
          embalagem_finalizada?: boolean
          embalagem_finalizada_em?: string | null
          embalagem_meta_confirmada?: number | null
          fermentacao_finalizada?: boolean
          fermentacao_finalizada_em?: string | null
          fermentacao_meta_confirmada?: number | null
          forno_finalizada?: boolean
          forno_finalizada_em?: string | null
          forno_meta_confirmada?: number | null
          id?: string
          kg?: number
          observacao?: string
          ordem_planejamento?: number
          pacotes?: number
          produto_id: string
          tipo_estoque_id: string
          unidades?: number
          updated_at?: string
        }
        Update: {
          assadeira_id?: string | null
          assadeiras?: number
          caixas?: number
          created_at?: string
          criado_por?: string | null
          data_fabricacao_etiqueta?: string
          data_producao?: string
          embalagem_finalizada?: boolean
          embalagem_finalizada_em?: string | null
          embalagem_meta_confirmada?: number | null
          fermentacao_finalizada?: boolean
          fermentacao_finalizada_em?: string | null
          fermentacao_meta_confirmada?: number | null
          forno_finalizada?: boolean
          forno_finalizada_em?: string | null
          forno_meta_confirmada?: number | null
          id?: string
          kg?: number
          observacao?: string
          ordem_planejamento?: number
          pacotes?: number
          produto_id?: string
          tipo_estoque_id?: string
          unidades?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ordens_producao_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordens_producao_assadeira_id_fkey1"
            columns: ["assadeira_id"]
            isOneToOne: false
            referencedRelation: "assadeiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_embalagem_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_embalagem_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "vw_produtos_com_receitas"
            referencedColumns: ["produto_id"]
          },
          {
            foreignKeyName: "pedidos_embalagem_tipo_estoque_id_fkey"
            columns: ["tipo_estoque_id"]
            isOneToOne: false
            referencedRelation: "tipos_estoque"
            referencedColumns: ["id"]
          },
        ]
      }
      ordens_producao_estimativa: {
        Row: {
          camara_fim_previsto: string
          embalagem_fim_previsto: string
          embalagem_inicio_previsto: string
          fermentacao_fim_previsto: string
          fermentacao_inicio_previsto: string
          forno_fim_previsto: string
          forno_inicio_previsto: string
          ordem_producao_id: string
          resfriamento_fim_previsto: string
          taxa_assadeiras_hora_forno: number
          taxa_assadeiras_hora_producao: number
          taxa_caixas_hora_embalagem: number
          tempo_medio_fermentacao_min: number
          tempo_medio_resfriamento_min: number
          updated_at: string
        }
        Insert: {
          camara_fim_previsto: string
          embalagem_fim_previsto: string
          embalagem_inicio_previsto: string
          fermentacao_fim_previsto: string
          fermentacao_inicio_previsto: string
          forno_fim_previsto: string
          forno_inicio_previsto: string
          ordem_producao_id: string
          resfriamento_fim_previsto: string
          taxa_assadeiras_hora_forno: number
          taxa_assadeiras_hora_producao: number
          taxa_caixas_hora_embalagem: number
          tempo_medio_fermentacao_min: number
          tempo_medio_resfriamento_min: number
          updated_at?: string
        }
        Update: {
          camara_fim_previsto?: string
          embalagem_fim_previsto?: string
          embalagem_inicio_previsto?: string
          fermentacao_fim_previsto?: string
          fermentacao_inicio_previsto?: string
          forno_fim_previsto?: string
          forno_inicio_previsto?: string
          ordem_producao_id?: string
          resfriamento_fim_previsto?: string
          taxa_assadeiras_hora_forno?: number
          taxa_assadeiras_hora_producao?: number
          taxa_caixas_hora_embalagem?: number
          tempo_medio_fermentacao_min?: number
          tempo_medio_resfriamento_min?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ordens_producao_estimativa_ordem_producao_id_fkey"
            columns: ["ordem_producao_id"]
            isOneToOne: true
            referencedRelation: "ordens_producao"
            referencedColumns: ["id"]
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
      pedido_consignado_decisoes: {
        Row: {
          created_at: string
          decidido_por: string
          id: string
          motivo: string | null
          pedido_destino_id: string | null
          pedido_id: string
          tipo_decisao: string
        }
        Insert: {
          created_at?: string
          decidido_por: string
          id?: string
          motivo?: string | null
          pedido_destino_id?: string | null
          pedido_id: string
          tipo_decisao: string
        }
        Update: {
          created_at?: string
          decidido_por?: string
          id?: string
          motivo?: string | null
          pedido_destino_id?: string | null
          pedido_id?: string
          tipo_decisao?: string
        }
        Relationships: [
          {
            foreignKeyName: "pedido_consignado_decisoes_decidido_por_fkey"
            columns: ["decidido_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_consignado_decisoes_pedido_destino_id_fkey"
            columns: ["pedido_destino_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_consignado_decisoes_pedido_destino_id_fkey"
            columns: ["pedido_destino_id"]
            isOneToOne: false
            referencedRelation: "relatorio_producao_pedidos_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_consignado_decisoes_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: true
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_consignado_decisoes_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: true
            referencedRelation: "relatorio_producao_pedidos_v"
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
          boletos_abertos_count: number
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
          is_remessa_consignacao: boolean
          motivo_bonificacao:
            | Database["public"]["Enums"]["motivo_bonificacao_enum"]
            | null
          observacoes: string | null
          prazo_aprovacao: string | null
          prioridade: string
          status: string
          status_cobranca: string
          tipo_operacao_pedido: Database["public"]["Enums"]["tipo_operacao_pedido_enum"]
          tipo_pedido: Database["public"]["Enums"]["tipo_pedido_enum"]
          updated_at: string | null
          valor_boletos_pago: number | null
          valor_boletos_total: number | null
        }
        Insert: {
          atualizado_por: string
          boletos_abertos_count?: number
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
          is_remessa_consignacao?: boolean
          motivo_bonificacao?:
            | Database["public"]["Enums"]["motivo_bonificacao_enum"]
            | null
          observacoes?: string | null
          prazo_aprovacao?: string | null
          prioridade?: string
          status?: string
          status_cobranca?: string
          tipo_operacao_pedido?: Database["public"]["Enums"]["tipo_operacao_pedido_enum"]
          tipo_pedido?: Database["public"]["Enums"]["tipo_pedido_enum"]
          updated_at?: string | null
          valor_boletos_pago?: number | null
          valor_boletos_total?: number | null
        }
        Update: {
          atualizado_por?: string
          boletos_abertos_count?: number
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
          is_remessa_consignacao?: boolean
          motivo_bonificacao?:
            | Database["public"]["Enums"]["motivo_bonificacao_enum"]
            | null
          observacoes?: string | null
          prazo_aprovacao?: string | null
          prioridade?: string
          status?: string
          status_cobranca?: string
          tipo_operacao_pedido?: Database["public"]["Enums"]["tipo_operacao_pedido_enum"]
          tipo_pedido?: Database["public"]["Enums"]["tipo_pedido_enum"]
          updated_at?: string | null
          valor_boletos_pago?: number | null
          valor_boletos_total?: number | null
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
            foreignKeyName: "pedidos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "relatorio_script_consignados_v"
            referencedColumns: ["distribuidor_id"]
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
            foreignKeyName: "pedidos_distribuidor_entrega_id_fkey"
            columns: ["distribuidor_entrega_id"]
            isOneToOne: false
            referencedRelation: "relatorio_script_consignados_v"
            referencedColumns: ["distribuidor_id"]
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
      perfil_modulos: {
        Row: {
          modulo: string
          nivel: string
          perfil_id: string
        }
        Insert: {
          modulo: string
          nivel: string
          perfil_id: string
        }
        Update: {
          modulo?: string
          nivel?: string
          perfil_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "perfil_modulos_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
        ]
      }
      perfis: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          id: string
          is_sistema: boolean
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          is_sistema?: boolean
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          is_sistema?: boolean
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      producao_turno_ativo: {
        Row: {
          confirmado_em: string
          etapa: string
          numero: number
        }
        Insert: {
          confirmado_em: string
          etapa: string
          numero: number
        }
        Update: {
          confirmado_em?: string
          etapa?: string
          numero?: number
        }
        Relationships: []
      }
      produto_assadeiras: {
        Row: {
          assadeira_id: string
          created_at: string
          id: string
          ordem: number
          produto_id: string
          unidades_por_assadeira: number | null
          updated_at: string
        }
        Insert: {
          assadeira_id: string
          created_at?: string
          id?: string
          ordem?: number
          produto_id: string
          unidades_por_assadeira?: number | null
          updated_at?: string
        }
        Update: {
          assadeira_id?: string
          created_at?: string
          id?: string
          ordem?: number
          produto_id?: string
          unidades_por_assadeira?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "produto_assadeiras_assadeira_id_fkey"
            columns: ["assadeira_id"]
            isOneToOne: false
            referencedRelation: "assadeiras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produto_assadeiras_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produto_assadeiras_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "vw_produtos_com_receitas"
            referencedColumns: ["produto_id"]
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
          dias_validade_ambiente: number
          dias_validade_congelado: number
          id: string
          nome: string
          nome_etiqueta: string | null
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
          dias_validade_ambiente?: number
          dias_validade_congelado?: number
          id?: string
          nome: string
          nome_etiqueta?: string | null
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
          dias_validade_ambiente?: number
          dias_validade_congelado?: number
          id?: string
          nome?: string
          nome_etiqueta?: string | null
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
      receita_gramaturas: {
        Row: {
          created_at: string | null
          id: string
          peso_g: number
          quantidade_padrao: number
          receita_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          peso_g: number
          quantidade_padrao: number
          receita_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          peso_g?: number
          quantidade_padrao?: number
          receita_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "receita_gramaturas_receita_id_fkey"
            columns: ["receita_id"]
            isOneToOne: false
            referencedRelation: "receitas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receita_gramaturas_receita_id_fkey"
            columns: ["receita_id"]
            isOneToOne: false
            referencedRelation: "vw_produtos_com_receitas"
            referencedColumns: ["receita_id"]
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
      receitas: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          id: string
          nome: string
          tipo: Database["public"]["Enums"]["tipo_receita"]
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          id?: string
          nome: string
          tipo?: Database["public"]["Enums"]["tipo_receita"]
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          id?: string
          nome?: string
          tipo?: Database["public"]["Enums"]["tipo_receita"]
        }
        Relationships: []
      }
      roteiro_paradas: {
        Row: {
          bairro: string | null
          cep: string | null
          cidade: string | null
          complemento: string | null
          created_at: string | null
          descricao: string | null
          estado: string | null
          id: string
          latitude: number | null
          longitude: number | null
          manual_categoria: string | null
          numero: string | null
          ordem: number
          pedido_id: string | null
          roteiro_veiculo_id: string
          rua: string | null
          tempo_parada_minutos: number | null
          tipo: string
          titulo: string | null
        }
        Insert: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          created_at?: string | null
          descricao?: string | null
          estado?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          manual_categoria?: string | null
          numero?: string | null
          ordem: number
          pedido_id?: string | null
          roteiro_veiculo_id: string
          rua?: string | null
          tempo_parada_minutos?: number | null
          tipo?: string
          titulo?: string | null
        }
        Update: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          created_at?: string | null
          descricao?: string | null
          estado?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          manual_categoria?: string | null
          numero?: string | null
          ordem?: number
          pedido_id?: string | null
          roteiro_veiculo_id?: string
          rua?: string | null
          tempo_parada_minutos?: number | null
          tipo?: string
          titulo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "roteiro_paradas_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roteiro_paradas_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "relatorio_producao_pedidos_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roteiro_paradas_roteiro_veiculo_id_fkey"
            columns: ["roteiro_veiculo_id"]
            isOneToOne: false
            referencedRelation: "roteiro_veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      roteiro_veiculos: {
        Row: {
          created_at: string | null
          custo_fixo_snapshot: number | null
          custo_percentual_snapshot: number | null
          custos_congelados_em: string | null
          distancia_km: number | null
          id: string
          minutos_por_100_cx: number | null
          motorista_alocado_em: string | null
          motorista_alocado_por: string | null
          motorista_usuario_id: string | null
          ordem_exibicao: number
          propriedade_snapshot: string | null
          rota_calculada_em: string | null
          roteiro_id: string
          tempo_direcao_minutos: number | null
          tempo_paradas_minutos: number | null
          tempo_total_minutos: number | null
          transportadora_nome_snapshot: string | null
          updated_at: string | null
          veiculo_logistica_id: string
        }
        Insert: {
          created_at?: string | null
          custo_fixo_snapshot?: number | null
          custo_percentual_snapshot?: number | null
          custos_congelados_em?: string | null
          distancia_km?: number | null
          id?: string
          minutos_por_100_cx?: number | null
          motorista_alocado_em?: string | null
          motorista_alocado_por?: string | null
          motorista_usuario_id?: string | null
          ordem_exibicao?: number
          propriedade_snapshot?: string | null
          rota_calculada_em?: string | null
          roteiro_id: string
          tempo_direcao_minutos?: number | null
          tempo_paradas_minutos?: number | null
          tempo_total_minutos?: number | null
          transportadora_nome_snapshot?: string | null
          updated_at?: string | null
          veiculo_logistica_id: string
        }
        Update: {
          created_at?: string | null
          custo_fixo_snapshot?: number | null
          custo_percentual_snapshot?: number | null
          custos_congelados_em?: string | null
          distancia_km?: number | null
          id?: string
          minutos_por_100_cx?: number | null
          motorista_alocado_em?: string | null
          motorista_alocado_por?: string | null
          motorista_usuario_id?: string | null
          ordem_exibicao?: number
          propriedade_snapshot?: string | null
          rota_calculada_em?: string | null
          roteiro_id?: string
          tempo_direcao_minutos?: number | null
          tempo_paradas_minutos?: number | null
          tempo_total_minutos?: number | null
          transportadora_nome_snapshot?: string | null
          updated_at?: string | null
          veiculo_logistica_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "roteiro_veiculos_motorista_alocado_por_fkey"
            columns: ["motorista_alocado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roteiro_veiculos_motorista_usuario_id_fkey"
            columns: ["motorista_usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roteiro_veiculos_roteiro_id_fkey"
            columns: ["roteiro_id"]
            isOneToOne: false
            referencedRelation: "roteiros_entrega"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "roteiro_veiculos_veiculo_logistica_id_fkey"
            columns: ["veiculo_logistica_id"]
            isOneToOne: false
            referencedRelation: "veiculos_logistica"
            referencedColumns: ["id"]
          },
        ]
      }
      roteiros_entrega: {
        Row: {
          created_at: string | null
          data_rota: string
          id: string
          publicado_em: string | null
          publicado_por: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          data_rota: string
          id?: string
          publicado_em?: string | null
          publicado_por?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          data_rota?: string
          id?: string
          publicado_em?: string | null
          publicado_por?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "roteiros_entrega_publicado_por_fkey"
            columns: ["publicado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
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
            foreignKeyName: "sugestoes_envio_logs_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "relatorio_script_consignados_v"
            referencedColumns: ["distribuidor_id"]
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
        ]
      }
      tipos_estoque: {
        Row: {
          ativo: boolean | null
          congelado: boolean
          created_at: string | null
          id: string
          mostrar_texto_congelado: boolean
          nome: string
          possui_etiqueta: boolean
          receita_caixa_id: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          congelado?: boolean
          created_at?: string | null
          id?: string
          mostrar_texto_congelado?: boolean
          nome: string
          possui_etiqueta?: boolean
          receita_caixa_id?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          congelado?: boolean
          created_at?: string | null
          id?: string
          mostrar_texto_congelado?: boolean
          nome?: string
          possui_etiqueta?: boolean
          receita_caixa_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tipos_estoque_receita_caixa_id_fkey"
            columns: ["receita_caixa_id"]
            isOneToOne: false
            referencedRelation: "receitas"
            referencedColumns: ["id"]
          },
        ]
      }
      transportadoras_logistica: {
        Row: {
          ativo: boolean
          created_at: string
          grupo_whatsapp: string | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          grupo_whatsapp?: string | null
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          grupo_whatsapp?: string | null
          id?: string
          nome?: string
          updated_at?: string
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
            foreignKeyName: "usuario_clientes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "relatorio_script_consignados_v"
            referencedColumns: ["distribuidor_id"]
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
      usuario_papeis: {
        Row: {
          created_at: string
          papel: string
          usuario_id: string
        }
        Insert: {
          created_at?: string
          papel: string
          usuario_id: string
        }
        Update: {
          created_at?: string
          papel?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuario_papeis_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      usuario_perfis: {
        Row: {
          created_at: string
          perfil_id: string
          usuario_id: string
        }
        Insert: {
          created_at?: string
          perfil_id: string
          usuario_id: string
        }
        Update: {
          created_at?: string
          perfil_id?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuario_perfis_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "perfis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usuario_perfis_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      usuarios: {
        Row: {
          ativo: boolean
          cliente_id: string | null
          codigo_whatsapp: string | null
          codigo_whatsapp_bloqueado_ate: string | null
          codigo_whatsapp_expires: string | null
          codigo_whatsapp_tentativas: number | null
          created_at: string | null
          email: string | null
          id: string
          inativado_em: string | null
          inativado_por: string | null
          is_system_owner: boolean
          nome: string
          telefone: string | null
          telefone_verificado: boolean | null
          tipo: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean
          cliente_id?: string | null
          codigo_whatsapp?: string | null
          codigo_whatsapp_bloqueado_ate?: string | null
          codigo_whatsapp_expires?: string | null
          codigo_whatsapp_tentativas?: number | null
          created_at?: string | null
          email?: string | null
          id?: string
          inativado_em?: string | null
          inativado_por?: string | null
          is_system_owner?: boolean
          nome: string
          telefone?: string | null
          telefone_verificado?: boolean | null
          tipo: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean
          cliente_id?: string | null
          codigo_whatsapp?: string | null
          codigo_whatsapp_bloqueado_ate?: string | null
          codigo_whatsapp_expires?: string | null
          codigo_whatsapp_tentativas?: number | null
          created_at?: string | null
          email?: string | null
          id?: string
          inativado_em?: string | null
          inativado_por?: string | null
          is_system_owner?: boolean
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
          {
            foreignKeyName: "usuarios_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "relatorio_script_consignados_v"
            referencedColumns: ["distribuidor_id"]
          },
          {
            foreignKeyName: "usuarios_inativado_por_fkey"
            columns: ["inativado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      veiculos_logistica: {
        Row: {
          ativo: boolean
          capacidade: number
          capacidade_unidade: string
          created_at: string | null
          custo_fixo_viagem: number
          custo_percentual_nf: number
          id: string
          nome: string
          placa: string | null
          propriedade: string
          transportadora_id: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean
          capacidade: number
          capacidade_unidade: string
          created_at?: string | null
          custo_fixo_viagem?: number
          custo_percentual_nf?: number
          id?: string
          nome: string
          placa?: string | null
          propriedade?: string
          transportadora_id?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean
          capacidade?: number
          capacidade_unidade?: string
          created_at?: string | null
          custo_fixo_viagem?: number
          custo_percentual_nf?: number
          id?: string
          nome?: string
          placa?: string | null
          propriedade?: string
          transportadora_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "veiculos_logistica_transportadora_id_fkey"
            columns: ["transportadora_id"]
            isOneToOne: false
            referencedRelation: "transportadoras_logistica"
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
          usuario_id: string | null
        }
        Insert: {
          ativo?: boolean
          comissao_percentual?: number
          created_at?: string | null
          id?: string
          nome: string
          updated_at?: string | null
          usuario_id?: string | null
        }
        Update: {
          ativo?: boolean
          comissao_percentual?: number
          created_at?: string | null
          id?: string
          nome?: string
          updated_at?: string | null
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendedores_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: true
            referencedRelation: "usuarios"
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
      whatsapp_notificacao_log: {
        Row: {
          created_at: string
          destino: string | null
          enviado: boolean
          erro: string | null
          id: string
          mensagem_preview: string | null
          motivo_nao_envio: string | null
          referencia_id: string | null
          referencia_tipo: string | null
          tipo_chave: string
          triggered_by: string | null
          zapi_message_id: string | null
        }
        Insert: {
          created_at?: string
          destino?: string | null
          enviado: boolean
          erro?: string | null
          id?: string
          mensagem_preview?: string | null
          motivo_nao_envio?: string | null
          referencia_id?: string | null
          referencia_tipo?: string | null
          tipo_chave: string
          triggered_by?: string | null
          zapi_message_id?: string | null
        }
        Update: {
          created_at?: string
          destino?: string | null
          enviado?: boolean
          erro?: string | null
          id?: string
          mensagem_preview?: string | null
          motivo_nao_envio?: string | null
          referencia_id?: string | null
          referencia_tipo?: string | null
          tipo_chave?: string
          triggered_by?: string | null
          zapi_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_notificacao_log_triggered_by_fkey"
            columns: ["triggered_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_notificacao_tipos: {
        Row: {
          categoria: string
          chave: string
          created_at: string
          descricao: string
          habilitado: boolean
          id: string
          nome: string
          ordem: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          categoria: string
          chave: string
          created_at?: string
          descricao?: string
          habilitado?: boolean
          id?: string
          nome: string
          ordem?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          categoria?: string
          chave?: string
          created_at?: string
          descricao?: string
          habilitado?: boolean
          id?: string
          nome?: string
          ordem?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_notificacao_tipos_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_notificacoes_config: {
        Row: {
          embalagem_habilitado: boolean
          fermentacao_habilitado: boolean
          forno_habilitado: boolean
          id: string
          saidas_habilitado: boolean
          updated_at: string
        }
        Insert: {
          embalagem_habilitado?: boolean
          fermentacao_habilitado?: boolean
          forno_habilitado?: boolean
          id?: string
          saidas_habilitado?: boolean
          updated_at?: string
        }
        Update: {
          embalagem_habilitado?: boolean
          fermentacao_habilitado?: boolean
          forno_habilitado?: boolean
          id?: string
          saidas_habilitado?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      whatsapp_pedido_mensagem: {
        Row: {
          created_at: string
          id: string
          message_id: string
          process_started_at: string | null
          processed_at: string | null
          raw_payload: Json | null
          status: string
          telefone: string
          tentativas: number
          texto: string | null
          ultimo_erro: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message_id: string
          process_started_at?: string | null
          processed_at?: string | null
          raw_payload?: Json | null
          status?: string
          telefone: string
          tentativas?: number
          texto?: string | null
          ultimo_erro?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string
          process_started_at?: string | null
          processed_at?: string | null
          raw_payload?: Json | null
          status?: string
          telefone?: string
          tentativas?: number
          texto?: string | null
          ultimo_erro?: string | null
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
      relatorio_script_consignados_v: {
        Row: {
          distribuidor: string | null
          distribuidor_id: string | null
          estoque_atual: number | null
          media_quantidade: number | null
          min_quantidade: number | null
          produto: string | null
          semana_1_label: string | null
          semana_1_quantidade: number | null
          semana_2_label: string | null
          semana_2_quantidade: number | null
          semana_3_label: string | null
          semana_3_quantidade: number | null
          semana_4_label: string | null
          semana_4_quantidade: number | null
        }
        Relationships: []
      }
      vw_estoque_consignado_saldo: {
        Row: {
          distribuidor_id: string | null
          produto_id: string | null
          saldo: number | null
        }
        Relationships: [
          {
            foreignKeyName: "estoque_consignado_movimentos_distribuidor_id_fkey"
            columns: ["distribuidor_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_consignado_movimentos_distribuidor_id_fkey"
            columns: ["distribuidor_id"]
            isOneToOne: false
            referencedRelation: "relatorio_script_consignados_v"
            referencedColumns: ["distribuidor_id"]
          },
          {
            foreignKeyName: "estoque_consignado_movimentos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "estoque_consignado_movimentos_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "vw_produtos_com_receitas"
            referencedColumns: ["produto_id"]
          },
        ]
      }
      vw_produtos_com_receitas: {
        Row: {
          produto_codigo: string | null
          produto_id: string | null
          produto_nome: string | null
          quantidade_por_produto: number | null
          receita_ativa: boolean | null
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
      auth_tem_modulo: {
        Args: { p_modulo: string; p_nivel: string }
        Returns: boolean
      }
      auth_tem_papel: { Args: { p_papel: string }; Returns: boolean }
      boleto_sync_manual_try_reserve: {
        Args: {
          p_cooldown_seconds: number
          p_max_attempts_24h: number
          p_pedido_id: string
          p_usuario_id: string
        }
        Returns: {
          code: string
          ok: boolean
          retry_after_seconds: number
        }[]
      }
      claim_next_whatsapp_pedido_mensagem: {
        Args: never
        Returns: {
          created_at: string
          id: string
          message_id: string
          process_started_at: string | null
          processed_at: string | null
          raw_payload: Json | null
          status: string
          telefone: string
          tentativas: number
          texto: string | null
          ultimo_erro: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "whatsapp_pedido_mensagem"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      crm_first_pipeline_stage_id: { Args: never; Returns: string }
      crm_seed_set_admin_profile: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      get_receita_tipo: {
        Args: { receita_id: string }
        Returns: Database["public"]["Enums"]["tipo_receita"]
      }
      get_user_cliente_id: { Args: { user_id: string }; Returns: string }
      get_user_tipo: { Args: { user_id: string }; Returns: string }
      is_admin: { Args: never; Returns: boolean }
      list_insumo_consumo_agregado: {
        Args: { p_end: string; p_start: string; p_visualizacao?: string }
        Returns: {
          coluna_inicio: string
          consumo: number
          conversao_fator: number
          conversao_unidade_resumida: string
          insumo_id: string
          nome: string
          unidade_resumida: string
        }[]
      }
      replace_insumo_distribuidores: {
        Args: { p_insumo_id: string; p_items: Json }
        Returns: undefined
      }
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
      embalagem_lote_modo: "parcial" | "substituicao" | "importado"
      estoque_consignado_tipo_mov_enum:
        | "entrada_remessa"
        | "saida_venda"
        | "ajuste_entrada"
        | "ajuste_saida"
      estoque_movimento_origem: "embalagem" | "saida" | "ajuste_manual"
      frequencia_pedido_enum: "semanal" | "quinzenal" | "esporadico"
      insumo_movimento_origem:
        | "entrada_nf"
        | "ajuste_manual"
        | "resolucao_pendencia"
        | "producao_fermentacao"
        | "producao_forno"
        | "producao_embalagem"
      insumo_pendencia_status: "pendente" | "resolvido" | "ignorado"
      motivo_bonificacao_enum:
        | "troca_produtos"
        | "pagamento_comissao"
        | "verba_marketing"
      producao_lote_modo: "parcial" | "substituicao"
      tipo_cliente_enum: "distribuidor" | "hamburgueria"
      tipo_operacao_pedido_enum:
        | "venda"
        | "bonificacao"
        | "amostra"
        | "remessa_consignacao"
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
      embalagem_lote_modo: ["parcial", "substituicao", "importado"],
      estoque_consignado_tipo_mov_enum: [
        "entrada_remessa",
        "saida_venda",
        "ajuste_entrada",
        "ajuste_saida",
      ],
      estoque_movimento_origem: ["embalagem", "saida", "ajuste_manual"],
      frequencia_pedido_enum: ["semanal", "quinzenal", "esporadico"],
      insumo_movimento_origem: [
        "entrada_nf",
        "ajuste_manual",
        "resolucao_pendencia",
        "producao_fermentacao",
        "producao_forno",
        "producao_embalagem",
      ],
      insumo_pendencia_status: ["pendente", "resolvido", "ignorado"],
      motivo_bonificacao_enum: [
        "troca_produtos",
        "pagamento_comissao",
        "verba_marketing",
      ],
      producao_lote_modo: ["parcial", "substituicao"],
      tipo_cliente_enum: ["distribuidor", "hamburgueria"],
      tipo_operacao_pedido_enum: [
        "venda",
        "bonificacao",
        "amostra",
        "remessa_consignacao",
      ],
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
