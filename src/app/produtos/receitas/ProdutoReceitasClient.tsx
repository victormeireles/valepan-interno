'use client';

import { useMemo, useState } from 'react';
import DashboardHeader from '@/components/DashboardHeader';
import type { ReceitaWithRelations } from '@/app/actions/receitas-actions';
import { ProdutoResumoComReceitas } from '@/app/actions/produto-receitas-actions';

type TipoReceita = ReceitaWithRelations['tipo'];

interface ProdutoReceitasClientProps {
  produtos: ProdutoResumoComReceitas[];
  receitas: ReceitaResumo[];
}

interface ReceitaResumo {
  id: string;
  nome: string;
  tipo: TipoReceita;
  ativo: boolean | null;
}

const tipoOptions: Array<{ value: TipoReceita; label: string; helper: string; icon: string }> = [
  {
    value: 'massa',
    label: 'Massa',
    helper: 'Quantidade de produtos que 1 receita de massa atende.',
    icon: 'grain',
  },
  {
    value: 'brilho',
    label: 'Brilho',
    helper: 'Quantidade de produtos que 1 receita de brilho atende.',
    icon: 'wb_sunny',
  },
  {
    value: 'confeito',
    label: 'Confeito',
    helper: 'Quantidade de produtos que 1 receita de confeito atende.',
    icon: 'cake',
  },
  {
    value: 'antimofo',
    label: 'Antimofo',
    helper: 'Quantidade de produtos que 1 receita de antimofo atende.',
    icon: 'sanitizer',
  },
  {
    value: 'embalagem',
    label: 'Embalagem',
    helper: 'Quantidade de pães por pacote.',
    icon: 'inventory_2',
  },
  {
    value: 'caixa',
    label: 'Caixa',
    helper: 'Quantidade de pacotes (ou pães) por caixa.',
    icon: 'all_inbox',
  },
];

import EditModal from './EditModal';
import { getProdutosComReceitas } from '@/app/actions/produto-receitas-actions';

// ... (rest of imports and types)

export default function ProdutoReceitasClient({
  produtos: initialProdutos,
  receitas,
}: ProdutoReceitasClientProps) {
  const [produtos, setProdutos] = useState(initialProdutos);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingProduto, setEditingProduto] = useState<ProdutoResumoComReceitas | null>(null);

  const filteredProdutos = useMemo(() => {
    return produtos.filter((p) =>
      p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.codigo?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [produtos, searchTerm]);

  const handleRefresh = async () => {
    const updated = await getProdutosComReceitas();
    setProdutos(updated);
    setEditingProduto(null);
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      <DashboardHeader title="Receitas por Produto" icon="🔗" />

      <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-6">
        
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3">
            <span className="material-icons text-gray-400">search</span>
            <input 
                type="text" 
                placeholder="Buscar produto por nome ou código..." 
                className="flex-1 outline-none text-gray-700 font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-1/4">Produto</th>
                  {tipoOptions.map((opt) => (
                    <th key={opt.value} className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center w-1/12">
                      <div className="flex flex-col items-center gap-1" title={opt.label}>
                        <span className="material-icons text-gray-400 text-lg">{opt.icon}</span>
                        <span className="hidden md:inline">{opt.label}</span>
                      </div>
                    </th>
                  ))}
                  <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center w-1/12">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredProdutos.map((produto) => (
                  <tr key={produto.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="p-4">
                      <div className="font-medium text-gray-900">{produto.nome}</div>
                      {produto.codigo && <div className="text-xs text-gray-400">{produto.codigo}</div>}
                    </td>
                    {tipoOptions.map((opt) => {
                      const vinculo = produto.receitas_vinculadas[opt.value];
                      const hasVinculo = !!vinculo && vinculo.ativo;
                      
                      return (
                        <td key={opt.value} className="p-4 text-center">
                          {hasVinculo ? (
                            <div className="flex flex-col items-center group-hover:scale-105 transition-transform">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 mb-1 shadow-sm shadow-emerald-200"></div>
                                <span className="text-[10px] font-medium text-gray-600 max-w-[80px] truncate" title={vinculo.receita_nome}>
                                    {vinculo.receita_nome}
                                </span>
                                <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-md mt-0.5">
                                    {vinculo.quantidade}
                                </span>
                            </div>
                          ) : (
                            <div className="w-1.5 h-1.5 rounded-full bg-gray-100 mx-auto"></div>
                          )}
                        </td>
                      );
                    })}
                    <td className="p-4 text-center">
                        <button 
                          onClick={() => setEditingProduto(produto)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                            <span className="material-icons">edit</span>
                        </button>
                    </td>
                  </tr>
                ))}
                
                {filteredProdutos.length === 0 && (
                    <tr>
                        <td colSpan={tipoOptions.length + 2} className="p-8 text-center text-gray-400">
                            Nenhum produto encontrado.
                        </td>
                    </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {editingProduto && (
        <EditModal
          produto={editingProduto}
          receitas={receitas}
          tipoOptions={tipoOptions}
          onClose={() => setEditingProduto(null)}
          onSuccess={handleRefresh}
        />
      )}
    </div>
  );
}


