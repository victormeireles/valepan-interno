import { useMemo, useState, useEffect } from 'react';
import { 
  linkReceitaAoProduto, 
  updateProdutoReceita, 
  unlinkProdutoReceita,
  ProdutoResumoComReceitas,
  getProdutosComReceitas
} from '@/app/actions/produto-receitas-actions';
import type { ReceitaWithRelations } from '@/app/actions/receitas-actions';

type TipoReceita = ReceitaWithRelations['tipo'];

interface ReceitaResumo {
  id: string;
  nome: string;
  tipo: TipoReceita;
  ativo: boolean | null;
}

interface EditModalProps {
  produto: ProdutoResumoComReceitas;
  receitas: ReceitaResumo[];
  tipoOptions: Array<{ value: TipoReceita; label: string; helper: string; icon: string }>;
  onClose?: () => void;
  onSuccess: () => void;
}

export default function EditModal({ produto, receitas, tipoOptions, onSuccess }: EditModalProps) {
  const [loading, setLoading] = useState<string | null>(null); // 'all' para salvar tudo, ou tipo específico para remover
  const [quantidades, setQuantidades] = useState<Partial<Record<TipoReceita, number>>>({});
  const [selectedReceitas, setSelectedReceitas] = useState<Partial<Record<TipoReceita, string>>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [localProduto, setLocalProduto] = useState(produto);

  // Inicializar estados
  useEffect(() => {
    const initialQuantidades: Partial<Record<TipoReceita, number>> = {};
    const initialReceitas: Partial<Record<TipoReceita, string>> = {};

    tipoOptions.forEach(opt => {
      const vinculo = localProduto.receitas_vinculadas[opt.value];
      if (vinculo) {
        initialQuantidades[opt.value] = vinculo.quantidade;
        initialReceitas[opt.value] = vinculo.receita_id;
      }
    });

    setQuantidades(initialQuantidades);
    setSelectedReceitas(initialReceitas);
  }, [localProduto, tipoOptions]);

  const receitasPorTipo = useMemo(() => {
    return tipoOptions.reduce<Record<TipoReceita, ReceitaResumo[]>>((acc, option) => {
      acc[option.value] = receitas.filter((receita) => receita.tipo === option.value);
      return acc;
    }, {} as Record<TipoReceita, ReceitaResumo[]>);
  }, [receitas, tipoOptions]);

  const handleSaveAll = async () => {
    setLoading('all');
    setMessage(null);

    const errors: string[] = [];
    const promises: Promise<void>[] = [];

    tipoOptions.forEach((option) => {
      const receitaId = selectedReceitas[option.value];
      const quantidade = quantidades[option.value];
      const vinculoExistente = localProduto.receitas_vinculadas[option.value];

      // Se não tem receita selecionada, pula (ou remove se tinha vínculo)
      if (!receitaId) {
        // Se tinha vínculo e não tem mais receita selecionada, não faz nada aqui
        // O usuário deve usar o botão de remover explicitamente
        return;
      }

      // Valida quantidade
      if (!quantidade || quantidade <= 0) {
        errors.push(`${option.label}: Quantidade deve ser maior que zero.`);
        return;
      }

      // Cria promise para salvar
      const savePromise = (async () => {
        let result;
        
        if (vinculoExistente && vinculoExistente.receita_id === receitaId) {
          // Update quantidade apenas
          result = await updateProdutoReceita(vinculoExistente.id, quantidade);
        } else {
          // Novo vínculo ou troca de receita
          result = await linkReceitaAoProduto({
            produtoId: localProduto.id,
            receitaId,
            quantidade
          });
        }

        if (!result.success) {
          errors.push(`${option.label}: ${result.error || 'Erro ao salvar.'}`);
        }
      })();

      promises.push(savePromise);
    });

    // Executa todas as operações em paralelo
    await Promise.all(promises);

    if (errors.length > 0) {
      setMessage(`Erros encontrados:\n${errors.join('\n')}`);
      setLoading(null);
      return;
    }

    // Refresh data
    const updatedProdutos = await getProdutosComReceitas();
    const updatedProduto = updatedProdutos.find(p => p.id === localProduto.id);
    if (updatedProduto) {
      setLocalProduto(updatedProduto);
      setMessage('Todas as alterações foram salvas com sucesso!');
      // Atualiza os estados locais com os novos dados
      tipoOptions.forEach(opt => {
        const vinculo = updatedProduto.receitas_vinculadas[opt.value];
        if (vinculo) {
          setQuantidades(prev => ({ ...prev, [opt.value]: vinculo.quantidade }));
          setSelectedReceitas(prev => ({ ...prev, [opt.value]: vinculo.receita_id }));
        }
      });
    } else {
      setMessage('Erro ao atualizar dados.');
    }

    setLoading(null);
  };

  const handleUnlink = async (tipo: TipoReceita) => {
    const vinculo = localProduto.receitas_vinculadas[tipo];
    if (!vinculo) return;

    setLoading(tipo);
    const result = await unlinkProdutoReceita(vinculo.id);
    
    if (result.success) {
       const updatedProdutos = await getProdutosComReceitas();
       const updatedProduto = updatedProdutos.find(p => p.id === localProduto.id);
       if(updatedProduto) {
         setLocalProduto(updatedProduto);
         // Limpar seleção local
         setQuantidades(prev => ({ ...prev, [tipo]: 0 }));
         setSelectedReceitas(prev => ({ ...prev, [tipo]: '' }));
       }
       setMessage('Vínculo removido.');
    } else {
      setMessage(result.error || 'Erro ao remover.');
    }
    setLoading(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-2xl">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{localProduto.nome}</h2>
            <p className="text-xs text-gray-500 mt-0.5">Gerenciar receitas vinculadas</p>
          </div>
          <button 
            onClick={onSuccess}
            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
          >
            <span className="material-icons text-xl">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto">
          
          {message && (
            <div className="mb-4 p-3 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
              <span className="material-icons text-sm">info</span>
              <span className="whitespace-pre-line">{message}</span>
            </div>
          )}

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-32">Tipo</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider max-w-xs">Receita</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-32">Quantidade</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider w-20">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tipoOptions.map((option) => {
                  const vinculo = localProduto.receitas_vinculadas[option.value];
                  const receitasDisponiveis = receitasPorTipo[option.value] || [];

                  return (
                    <tr 
                      key={option.value} 
                      className={`hover:bg-gray-50/50 transition-colors ${vinculo ? 'bg-emerald-50/20' : ''}`}
                    >
                      {/* Tipo */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="material-icons text-gray-400 text-lg" title={option.helper}>
                            {option.icon}
                          </span>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{option.label}</div>
                            {vinculo && (
                              <div className="text-[10px] text-emerald-600 font-medium mt-0.5">Ativo</div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Receita */}
                      <td className="px-4 py-3 max-w-xs">
                        <div className="relative">
                          <select
                            value={selectedReceitas[option.value] || ''}
                            onChange={(e) => setSelectedReceitas(prev => ({ ...prev, [option.value]: e.target.value }))}
                            className="w-full max-w-xs px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={loading !== null}
                            title={option.helper}
                          >
                            <option value="">Selecione...</option>
                            {receitasDisponiveis.map(r => (
                              <option key={r.id} value={r.id}>{r.nome}</option>
                            ))}
                          </select>
                          <span className="material-icons absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">
                            expand_more
                          </span>
                        </div>
                      </td>

                      {/* Quantidade */}
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          step="0.001"
                          min="0"
                          value={quantidades[option.value] || ''}
                          onChange={(e) => setQuantidades(prev => ({ ...prev, [option.value]: parseFloat(e.target.value) }))}
                          className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={loading !== null}
                          placeholder="0"
                        />
                      </td>

                      {/* Ações */}
                      <td className="px-4 py-3 text-center">
                        {vinculo && (
                          <button
                            onClick={() => handleUnlink(option.value)}
                            disabled={loading !== null}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Remover vínculo"
                          >
                            <span className="material-icons text-lg">delete_outline</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

        </div>
        
        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl flex justify-end gap-2">
          <button 
            onClick={onSuccess}
            className="px-5 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={handleSaveAll}
            disabled={loading !== null}
            className="min-w-[140px] px-5 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-black disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {loading === 'all' ? (
              <>
                <span className="material-icons text-sm animate-spin">progress_activity</span>
                <span>Salvando...</span>
              </>
            ) : (
              <>
                <span className="material-icons text-sm">save</span>
                <span>Salvar Tudo</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
