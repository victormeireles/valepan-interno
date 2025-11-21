import { NextRequest, NextResponse } from 'next/server';
import { supabaseClientFactory } from '@/lib/clients/supabase-client-factory';

export async function GET(request: NextRequest) {
  try {
    const cliente = request.nextUrl.searchParams.get('cliente');
    
    if (!cliente || cliente.trim() === '') {
      return NextResponse.json({
        tem_validade_congelado: false,
        tem_texto_congelado: false,
      });
    }

    const client = supabaseClientFactory.createServiceRoleClient();
    const clienteNormalizado = cliente.trim();

    // Tentar buscar por nome_fantasia (case-insensitive, comparação exata)
    let query = client
      .from('clientes')
      .select('tem_validade_congelado_na_etiqueta, tem_texto_indicando_congelado_na_etiqueta')
      .ilike('nome_fantasia', clienteNormalizado)
      .limit(1);

    let { data, error } = await query;

    // Se não encontrar por nome_fantasia, tentar por erp_codigo (caso seja um código)
    if (!data || data.length === 0) {
      // Verificar se parece ser um código (apenas números)
      if (/^\d+$/.test(clienteNormalizado)) {
        query = client
          .from('clientes')
          .select('tem_validade_congelado_na_etiqueta, tem_texto_indicando_congelado_na_etiqueta')
          .eq('erp_codigo', clienteNormalizado)
          .limit(1);

        const result = await query;
        data = result.data;
        error = result.error;
      }
    }

    if (error) {
      console.error('Erro ao buscar cliente:', error);
      return NextResponse.json({
        tem_validade_congelado: false,
        tem_texto_congelado: false,
      });
    }

    // Se não encontrou o cliente, retornar valores padrão
    if (!data || data.length === 0) {
      return NextResponse.json({
        tem_validade_congelado: false,
        tem_texto_congelado: false,
      });
    }

    const clienteData = data[0];
    
    return NextResponse.json({
      tem_validade_congelado: clienteData.tem_validade_congelado_na_etiqueta ?? false,
      tem_texto_congelado: clienteData.tem_texto_indicando_congelado_na_etiqueta ?? false,
    });
  } catch (error) {
    console.error('Erro ao buscar flags do cliente:', error);
    return NextResponse.json({
      tem_validade_congelado: false,
      tem_texto_congelado: false,
    });
  }
}

