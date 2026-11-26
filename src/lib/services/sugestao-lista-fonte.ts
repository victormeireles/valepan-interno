import type { SupabaseClient } from '@supabase/supabase-js';
import type { SugestaoListaBruta } from '@/lib/services/sugestao-lista-leitura';

type Join = { nome: string } | { nome: string }[] | null;
type Row = {
  id: string; tema: string; texto: string; foto_path: string | null;
  criado_em: string; pessoas_colaboradores: Join;
};

function nomeDe(valor: Join): string {
  if (!valor) return '';
  return Array.isArray(valor) ? valor[0]?.nome ?? '' : valor.nome;
}

export class SugestaoListaFonteSupabase {
  constructor(private readonly db: SupabaseClient) {}

  async buscar(tema: string | null): Promise<SugestaoListaBruta[]> {
    let consulta = this.db.from('sugestoes_melhoria' as never)
      .select('id, tema, texto, foto_path, criado_em, pessoas_colaboradores(nome)')
      .order('criado_em', { ascending: false })
      .limit(200);
    if (tema) consulta = consulta.eq('tema', tema);
    const { data, error } = await consulta;
    if (error) throw new Error(error.message);
    return ((data ?? []) as Row[]).map((row) => ({
      id: row.id, tema: row.tema, texto: row.texto,
      fotoPath: row.foto_path, criadoEm: row.criado_em, nome: nomeDe(row.pessoas_colaboradores),
    }));
  }
}
