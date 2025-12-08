'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import InsumoModal from '@/components/Insumos/InsumoModal';
import DashboardHeader from '@/components/DashboardHeader';
import { type Insumo, deleteInsumo } from '@/app/actions/insumos-actions';

interface InsumosClientProps {
  initialInsumos: Insumo[];
}

export default function InsumosClient({ initialInsumos }: InsumosClientProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInsumo, setEditingInsumo] = useState<Insumo | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUnidade, setFilterUnidade] = useState<string>('');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleEdit = (insumo: Insumo) => {
    setEditingInsumo(insumo);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja desativar este insumo?')) {
      return;
    }

    const result = await deleteInsumo(id);
    if (result.success) {
      router.refresh();
    } else {
      alert(result.error || 'Erro ao deletar insumo');
    }
  };

  const handleNew = () => {
    setEditingInsumo(undefined);
    setIsModalOpen(true);
  };

  const handleSaved = () => {
    router.refresh();
  };

  // Estatísticas
  const totalInsumos = initialInsumos.length;
  const ativosInsumos = initialInsumos.filter((i) => i.ativo).length;
  
  // Agrupar unidades únicas com id e nome
  const unidadesMap = new Map<string, { id: string; nome: string }>();
  initialInsumos.forEach((insumo) => {
    if (insumo.unidades && !unidadesMap.has(insumo.unidade_id)) {
      unidadesMap.set(insumo.unidade_id, {
        id: insumo.unidade_id,
        nome: insumo.unidades.nome_resumido || insumo.unidades.nome,
      });
    }
  });
  const unidadesUnicas = Array.from(unidadesMap.values());

  // Filtros
  const filteredInsumos = initialInsumos.filter((insumo) => {
    const matchesSearch = insumo.nome.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesUnidade = !filterUnidade || insumo.unidade_id === filterUnidade;
    return matchesSearch && matchesUnidade;
  });

  return (
    <div className="min-h-screen bg-gray-50/50">
      <DashboardHeader title="Cadastro de Insumos" icon="📦" />

      <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
        {/* Stats Grid & Action Button */}
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-stretch">
          <div className="w-full md:w-auto md:order-2">
            <button
              onClick={handleNew}
              className="w-full md:w-auto group relative inline-flex items-center justify-center px-6 py-4 text-sm font-medium text-white transition-all duration-200 bg-gray-900 rounded-2xl shadow-lg hover:bg-gray-800 hover:shadow-xl hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 h-full cursor-pointer"
            >
              <span className="mr-2 text-lg leading-none">+</span> Novo Insumo
              <div className="absolute inset-0 rounded-2xl ring-2 ring-white/20 group-hover:ring-white/40 transition-all pointer-events-none" />
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 flex-1 w-full md:order-1">
            <div className="bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Total</p>
              <p className="text-2xl md:text-3xl font-bold text-gray-900">{totalInsumos}</p>
            </div>
            <div className="bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center">
              <p className="text-xs font-medium text-emerald-600 uppercase tracking-wide mb-1">Ativos</p>
              <p className="text-2xl md:text-3xl font-bold text-emerald-600">{ativosInsumos}</p>
            </div>
            <div className="bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center col-span-2 md:col-span-1">
              <p className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-1">Unidades</p>
              <p className="text-2xl md:text-3xl font-bold text-blue-600">{unidadesUnicas.length}</p>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Buscar por nome</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Digite o nome do insumo..."
                className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl text-gray-900 font-medium focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Filtrar por unidade</label>
              <select
                value={filterUnidade}
                onChange={(e) => setFilterUnidade(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl text-gray-900 font-medium focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all appearance-none cursor-pointer"
              >
                <option value="">Todas as unidades</option>
                {unidadesUnicas.map((unidade) => (
                  <option key={unidade.id} value={unidade.id}>
                    {unidade.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredInsumos.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <span className="material-icons text-3xl text-gray-300">inventory</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900">
                {searchTerm || filterUnidade ? 'Nenhum insumo encontrado' : 'Nenhum insumo cadastrado'}
              </h3>
              <p className="text-gray-500 max-w-sm text-center mt-1">
                {searchTerm || filterUnidade
                  ? 'Tente ajustar os filtros de busca.'
                  : 'Crie um novo insumo para começar.'}
              </p>
            </div>
          ) : (
            filteredInsumos.map((insumo) => (
              <div
                key={insumo.id}
                className={`group bg-white rounded-2xl p-5 shadow-sm border transition-all duration-200 relative overflow-hidden ${
                  insumo.ativo
                    ? 'border-gray-100 hover:shadow-md hover:border-gray-200'
                    : 'border-gray-200 opacity-60'
                }`}
              >
                {!insumo.ativo && (
                  <div className="absolute top-2 right-2">
                    <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                      Inativo
                    </span>
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                      {insumo.nome}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm text-gray-500">
                        {formatCurrency(insumo.custo_unitario)}
                      </span>
                      <span className="text-gray-300">•</span>
                      <span className="text-sm font-medium text-gray-600 bg-gray-50 px-2 py-0.5 rounded-md">
                        {insumo.unidades?.nome_resumido || 'N/A'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                    <button
                      onClick={() => handleEdit(insumo)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all active:scale-95 flex items-center gap-2"
                    >
                      <span className="material-icons text-base">edit</span>
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(insumo.id)}
                      className="px-4 py-2 text-sm font-medium text-rose-700 bg-white border border-rose-200 rounded-xl hover:bg-rose-50 hover:border-rose-300 transition-all active:scale-95 flex items-center gap-2"
                    >
                      <span className="material-icons text-base">delete</span>
                      {insumo.ativo ? 'Desativar' : 'Excluir'}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <InsumoModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingInsumo(undefined);
        }}
        insumo={editingInsumo}
        onSaved={handleSaved}
      />
    </div>
  );
}

