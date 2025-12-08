'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardHeader from '@/components/DashboardHeader';
import type { ReceitaWithRelations } from '@/app/actions/receitas-actions';
import ReceitaModal from '@/components/Receitas/ReceitaModal';

interface ReceitasClientProps {
  initialReceitas: ReceitaWithRelations[];
}

const tipoOptions: Array<{ value: ReceitaWithRelations['tipo']; label: string }> = [
  { value: 'massa', label: 'Massa' },
  { value: 'brilho', label: 'Brilho' },
  { value: 'confeito', label: 'Confeito' },
  { value: 'antimofo', label: 'Antimofo' },
  { value: 'embalagem', label: 'Embalagem' },
  { value: 'caixa', label: 'Caixa' },
];

const tipoLabels = Object.fromEntries(tipoOptions.map((option) => [option.value, option.label]));

export default function ReceitasClient({ initialReceitas }: ReceitasClientProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<'ativos' | 'inativos' | 'todos'>('ativos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReceita, setEditingReceita] = useState<ReceitaWithRelations | null>(null);

  const filteredReceitas = useMemo(() => {
    return initialReceitas.filter((receita) => {
      const matchesSearch = receita.nome.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTipo = !filterTipo || receita.tipo === filterTipo;
      const matchesStatus =
        filterStatus === 'todos' ||
        (filterStatus === 'ativos' ? receita.ativo !== false : receita.ativo === false);
      return matchesSearch && matchesTipo && matchesStatus;
    });
  }, [initialReceitas, searchTerm, filterTipo, filterStatus]);

  const stats = useMemo(() => {
    const total = initialReceitas.length;
    const ativos = initialReceitas.filter((r) => r.ativo !== false).length;
    const porTipo = tipoOptions.map((option) => ({
      tipo: option.label,
      count: initialReceitas.filter((r) => r.tipo === option.value).length,
    }));

    return { total, ativos, porTipo };
  }, [initialReceitas]);

  const handleNew = () => {
    setEditingReceita(null);
    setIsModalOpen(true);
  };

  const handleEdit = (receita: ReceitaWithRelations) => {
    setEditingReceita(receita);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingReceita(null);
  };

  const handleSaved = () => {
    setIsModalOpen(false);
    setEditingReceita(null);
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      <DashboardHeader title="Receitas" icon="🧾" />

      <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
        <div className="flex justify-end">
          <button
            onClick={handleNew}
            className="inline-flex items-center px-6 py-3 rounded-2xl bg-gray-900 text-white text-sm font-semibold shadow-lg shadow-gray-900/20 hover:bg-black transition-all"
          >
            <span className="material-icons text-base mr-2">add</span>
            Nova receita
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard title="Total de receitas" value={stats.total} />
          <StatCard title="Receitas ativas" value={stats.ativos} accent="emerald" />
          <div className="bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-gray-100">
            <p className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-3">
              Distribuição por tipo
            </p>
            <div className="flex flex-wrap gap-2">
              {stats.porTipo.map((item) => (
                <span
                  key={item.tipo}
                  className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700"
                >
                  {item.tipo}: {item.count}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Buscar receita
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Digite o nome da receita..."
                className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl text-gray-900 font-medium focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Filtrar por tipo
              </label>
              <select
                value={filterTipo}
                onChange={(e) => setFilterTipo(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl text-gray-900 font-medium focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all appearance-none cursor-pointer"
              >
                <option value="">Todos os tipos</option>
                {tipoOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Status
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['ativos', 'inativos', 'todos'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`px-3 py-2 rounded-xl text-sm font-semibold transition-colors border ${
                      filterStatus === status
                        ? 'bg-gray-900 text-white border-gray-900'
                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredReceitas.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <span className="material-icons text-3xl text-gray-300">content_paste</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900">Nenhuma receita encontrada</h3>
              <p className="text-gray-500 max-w-sm text-center mt-1">
                Ajuste os filtros ou crie uma nova receita.
              </p>
            </div>
          ) : (
            filteredReceitas.map((receita) => {
              const ingredientes = receita.receita_ingredientes || [];
              const produtos = (receita.produto_receitas || []).filter((link) => link.ativo);
              return (
                <div
                  key={receita.id}
                  className={`group bg-white rounded-2xl p-5 shadow-sm border transition-all duration-200 relative overflow-hidden ${
                    receita.ativo === false
                      ? 'border-gray-200 opacity-60'
                      : 'border-gray-100 hover:shadow-md hover:border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2 mb-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                        {tipoLabels[receita.tipo]}
                      </p>
                      <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {receita.nome}
                      </h3>
                      {receita.codigo && (
                        <p className="text-xs font-mono text-gray-400 mt-1">{receita.codigo}</p>
                      )}
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        receita.ativo === false
                          ? 'bg-gray-100 text-gray-600'
                          : 'bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      {receita.ativo === false ? 'Inativa' : 'Ativa'}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm text-gray-600">
                    <p className="font-semibold text-gray-900">
                      {ingredientes.length} ingrediente{ingredientes.length === 1 ? '' : 's'}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {ingredientes.slice(0, 3).map((ingrediente) => (
                        <span
                          key={ingrediente.id}
                          className="px-2 py-1 bg-gray-50 border border-gray-100 rounded-lg text-xs font-medium text-gray-600"
                        >
                          {ingrediente.insumos?.nome ?? 'Ingrediente sem nome'}
                        </span>
                      ))}
                      {ingredientes.length > 3 && (
                        <span className="px-2 py-1 bg-gray-50 border border-gray-100 rounded-lg text-xs font-medium text-gray-600">
                          +{ingredientes.length - 3}
                        </span>
                      )}
                    </div>
                  </div>

                {produtos.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">
                        Usada em
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {produtos.slice(0, 3).map((link) => (
                          <span
                            key={link.id}
                            className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold"
                          >
                            {link.produtos?.nome ?? 'Produto'}
                          </span>
                        ))}
                        {produtos.length > 3 && (
                          <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold">
                            +{produtos.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2 mt-4">
                    <button
                      type="button"
                      onClick={() => handleEdit(receita)}
                      className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
                    >
                      Editar
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <ReceitaModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSaved={handleSaved}
        receita={editingReceita}
      />
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: number;
  accent?: 'emerald' | 'blue';
}

function StatCard({ title, value, accent = 'blue' }: StatCardProps) {
  const colorClasses =
    accent === 'emerald'
      ? 'text-emerald-700 bg-emerald-50'
      : 'text-gray-900 bg-white';

  return (
    <div className={`p-4 md:p-5 rounded-2xl shadow-sm border border-gray-100 ${colorClasses}`}>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{title}</p>
      <p className="text-2xl md:text-3xl font-bold">{value}</p>
    </div>
  );
}

