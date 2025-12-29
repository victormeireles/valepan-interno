'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  createMassaLote,
  updateMassaLote,
  getMassaLotesByOrder,
  ensureMassaStepLog,
} from '@/app/actions/producao-massa-actions';
import {
  getReceitasMassaByProduto,
  getMasseiras,
} from '@/app/actions/producao-etapas-actions';
import { getReceitaDetalhes } from '@/app/actions/receitas-actions';
import { getQuantityByStation } from '@/lib/utils/production-conversions';
import { MassaLote } from '@/domain/types/producao-massa';
import { formatNumberWithThousands, formatIntegerWithThousands } from '@/lib/utils/number-utils';
import ProductionStepLayout from '@/components/Producao/ProductionStepLayout';
import ProductionProgressCard from '@/components/Producao/ProductionProgressCard';
import ProductionFormActions from '@/components/Producao/ProductionFormActions';
import ProductionErrorAlert from '@/components/Producao/ProductionErrorAlert';
import Accordion from '@/components/Accordion';

interface MassaStepClientProps {
  ordemProducao: {
    id: string;
    lote_codigo: string;
    qtd_planejada: number;
    produto: {
      id: string;
      nome: string;
      unidadeNomeResumido: string | null; // nome_resumido da tabela unidades
      unidades_assadeira?: number | null;
      box_units?: number | null;
      receita_massa?: {
        quantidade_por_produto: number;
      } | null;
    };
  };
  initialLoteId?: string;
}

interface Masseira {
  id: string;
  nome: string;
  tempo_mistura_lenta_padrao: number | null;
  tempo_mistura_rapida_padrao: number | null;
}

interface IngredienteForm {
  id: string;
  insumo_id: string | null;
  ingrediente_nome: string;
  quantidade_padrao: number;
  quantidade_usada: number;
  unidade: string;
}

export default function MassaStepClient({ ordemProducao, initialLoteId }: MassaStepClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lotes, setLotes] = useState<MassaLote[]>([]);
  const [showForm, setShowForm] = useState(!!initialLoteId);
  const [editingLoteId, setEditingLoteId] = useState<string | null>(initialLoteId || null);

  // Estados do formulário
  const [receitaId, setReceitaId] = useState<string>('');
  const [receitas, setReceitas] = useState<Array<{ id: string; nome: string; codigo: string }>>([]);
  const [ingredientes, setIngredientes] = useState<IngredienteForm[]>([]);
  const [masseiraId, setMasseiraId] = useState<string>('');
  const [masseiras, setMasseiras] = useState<Masseira[]>([]);
  const [receitasBatidas, setReceitasBatidas] = useState<number>(1);
  const [tempoLentaMin, setTempoLentaMin] = useState<number>(0);
  const [tempoLentaSeg, setTempoLentaSeg] = useState<number>(0);
  const [tempoRapidaMin, setTempoRapidaMin] = useState<number>(0);
  const [tempoRapidaSeg, setTempoRapidaSeg] = useState<number>(0);
  const [temperatura, setTemperatura] = useState<number>(0);
  const [texturaOk, setTexturaOk] = useState(false);
  const [etapasLogId, setEtapasLogId] = useState<string>('');
  const errorAlertRef = useRef<HTMLDivElement>(null);

  // Função para converter minutos e segundos para decimal (ex: 5min 30seg = 5.50)
  const minutosSegundosParaDecimal = (minutos: number, segundos: number): number => {
    return minutos + segundos / 60;
  };

  // Função para converter decimal para minutos e segundos
  const decimalParaMinutosSegundos = (decimal: number): { minutos: number; segundos: number } => {
    const minutos = Math.floor(decimal);
    const segundos = Math.round((decimal - minutos) * 60);
    return { minutos, segundos };
  };

  // Função para formatar valor para exibição ao lado do input
  const formatarValorLateral = (valor: number, unidade: string): string | null => {
    if (valor <= 0) return null;
    
    const unidadeLower = unidade.toLowerCase().trim();
    const isKg = unidadeLower === 'kg' || unidadeLower === 'kilograma' || unidadeLower === 'kilogramas';
    
    // Se for kg e valor < 1, mostrar em gramas
    if (isKg && valor < 1) {
      return `${Math.round(valor * 1000)}g`;
    }
    
    // Caso contrário, formatar com a unidade
    // Remove espaços e formata: 13 L → 13L, 5 kg → 5kg
    const unidadeFormatada = unidade.replace(/\s+/g, '');
    return `${valor}${unidadeFormatada}`;
  };

  // Função para calcular gramas (usado no padrão)
  const calcularGramas = (valor: number, unidade: string): number | null => {
    const unidadeLower = unidade.toLowerCase().trim();
    if ((unidadeLower === 'kg' || unidadeLower === 'kilograma' || unidadeLower === 'kilogramas') && valor > 0 && valor < 1) {
      return Math.round(valor * 1000);
    }
    return null;
  };

  // Função para carregar dados do lote para edição
  const loadLoteForEdit = useCallback(async (lote: MassaLote) => {
    setEditingLoteId(lote.id);
    setReceitaId(lote.receita_id);
    setMasseiraId(lote.masseira_id || '');
    setReceitasBatidas(lote.receitas_batidas);
    setTemperatura(lote.temperatura_final || 0);
    setTexturaOk(lote.textura === 'ok');

    if (lote.tempo_lenta) {
      const { minutos, segundos } = decimalParaMinutosSegundos(lote.tempo_lenta);
      setTempoLentaMin(minutos);
      setTempoLentaSeg(segundos);
    } else {
      setTempoLentaMin(0);
      setTempoLentaSeg(0);
    }

    if (lote.tempo_rapida) {
      const { minutos, segundos } = decimalParaMinutosSegundos(lote.tempo_rapida);
      setTempoRapidaMin(minutos);
      setTempoRapidaSeg(segundos);
    } else {
      setTempoRapidaMin(0);
      setTempoRapidaSeg(0);
    }

    // Carregar ingredientes do lote com nomes da receita
    if (lote.ingredientes && lote.ingredientes.length > 0) {
      // Buscar receita para obter nomes dos ingredientes
      const receitaDetalhes = await getReceitaDetalhes(lote.receita_id);
      if (receitaDetalhes && receitaDetalhes.receita_ingredientes) {
        // Criar mapa de insumo_id -> nome e unidade
        type IngredienteItem = {
          insumo_id: string | null;
          insumos?: {
            nome?: string;
            unidades?: {
              nome_resumido?: string;
              nome?: string;
            } | null;
          } | null;
        };
        const ingredientesMap = new Map<string, { nome: string; unidade: string }>();
        receitaDetalhes.receita_ingredientes.forEach((ing: IngredienteItem) => {
          if (!ing.insumo_id) return;
          ingredientesMap.set(ing.insumo_id, {
            nome: ing.insumos?.nome || 'Ingrediente sem nome',
            unidade: ing.insumos?.unidades?.nome_resumido || ing.insumos?.unidades?.nome || 'un',
          });
        });

        const ingredientesForm: IngredienteForm[] = lote.ingredientes.map((ing) => {
          const info = ing.insumo_id ? ingredientesMap.get(ing.insumo_id) : undefined;
          return {
            id: ing.id,
            insumo_id: ing.insumo_id,
            ingrediente_nome: info?.nome || 'Ingrediente sem nome',
            quantidade_padrao: ing.quantidade_padrao,
            quantidade_usada: ing.quantidade_usada,
            unidade: ing.unidade || info?.unidade || 'un',
          };
        });
        setIngredientes(ingredientesForm);
      } else {
        // Fallback: usar dados do lote sem nomes
        const ingredientesForm: IngredienteForm[] = lote.ingredientes.map((ing) => ({
          id: ing.id,
          insumo_id: ing.insumo_id,
          ingrediente_nome: 'Ingrediente',
          quantidade_padrao: ing.quantidade_padrao,
          quantidade_usada: ing.quantidade_usada,
          unidade: ing.unidade,
        }));
        setIngredientes(ingredientesForm);
      }
    }

    setShowForm(true);
  }, []);

  // Carregar dados iniciais
  useEffect(() => {
    const loadData = async () => {
      // Garantir que existe log de etapa massa
      const logResult = await ensureMassaStepLog(ordemProducao.id);
      if (logResult.success && logResult.data) {
        setEtapasLogId(logResult.data.id);
      }

      // Buscar lotes existentes
      const lotesResult = await getMassaLotesByOrder(ordemProducao.id);
      if (lotesResult.success && lotesResult.data) {
        setLotes(lotesResult.data);
        
        // Se tem initialLoteId, carregar esse lote para edição
        if (initialLoteId) {
          const loteToEdit = lotesResult.data.find(l => l.id === initialLoteId);
          if (loteToEdit) {
            await loadLoteForEdit(loteToEdit);
          } else {
            // Se não encontrou o lote, mostra formulário para criar novo
            setShowForm(true);
          }
        } else if (lotesResult.data.length === 0) {
          // Se não houver lotes e não tem initialLoteId, mostra o formulário para criar o primeiro
          setShowForm(true);
        }
      } else {
        // Se não conseguiu buscar, mostra o formulário para criar novo
        setShowForm(true);
      }

      // Buscar receitas de massa vinculadas ao produto
      const receitasResult = await getReceitasMassaByProduto(ordemProducao.produto.id);
      if (receitasResult.success && receitasResult.data) {
        const receitasMapeadas = receitasResult.data
          .filter((r): r is { id: string; nome: string; codigo: string | null; tipo: string } => r !== null && r !== undefined)
          .map((r) => ({
            id: r.id,
            nome: r.nome,
            codigo: r.codigo || '',
          }));
        setReceitas(receitasMapeadas);
        if (receitasMapeadas.length === 1) {
          setReceitaId(receitasMapeadas[0].id);
        }
      }

      // Buscar masseiras
      const masseirasResult = await getMasseiras();
      if (masseirasResult.success && masseirasResult.data) {
        setMasseiras(masseirasResult.data);
      }
    };

    loadData();
  }, [ordemProducao.id, ordemProducao.produto.id, initialLoteId, loadLoteForEdit]);

  // Carregar ingredientes quando receita for selecionada
  useEffect(() => {
    if (!receitaId) {
      setIngredientes([]);
      return;
    }

    const loadIngredientes = async () => {
      const result = await getReceitaDetalhes(receitaId);
      if (result && result.receita_ingredientes) {
        const ingredientesForm: IngredienteForm[] = result.receita_ingredientes
          .filter((ing) => ing !== null && ing !== undefined && ing.insumo_id !== null)
          .map((ing) => {
            // Calcula quantidade inicial multiplicando padrão pela quantidade de receitas batidas
            const quantidadeCalculada = ing.quantidade_padrao * receitasBatidas;
            // Arredonda para 3 casas decimais
            const quantidadeArredondada = Math.round(quantidadeCalculada * 1000) / 1000;
            
            return {
              id: ing.id,
              insumo_id: ing.insumo_id!,
              ingrediente_nome: ing.insumos?.nome || 'Ingrediente sem nome',
              quantidade_padrao: ing.quantidade_padrao,
              quantidade_usada: quantidadeArredondada,
              unidade: ing.insumos?.unidades?.nome_resumido || ing.insumos?.unidades?.nome || 'un',
            };
          });
        setIngredientes(ingredientesForm);
      }
    };

    loadIngredientes();
  }, [receitaId, receitasBatidas]);

  // Atualizar quantidades quando receitas batidas mudar
  useEffect(() => {
    if (receitasBatidas > 0 && ingredientes.length > 0) {
      setIngredientes((prev) =>
        prev.map((ing) => {
          const quantidadeCalculada = ing.quantidade_padrao * receitasBatidas;
          // Arredonda para 3 casas decimais
          const quantidadeArredondada = Math.round(quantidadeCalculada * 1000) / 1000;
          return {
            ...ing,
            quantidade_usada: quantidadeArredondada,
          };
        }),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receitasBatidas]);

  // Atualizar tempos quando masseira for selecionada
  useEffect(() => {
    if (!masseiraId) return;

    const masseira = masseiras.find((m) => m.id === masseiraId);
    if (masseira) {
      if (masseira.tempo_mistura_lenta_padrao) {
        const { minutos, segundos } = decimalParaMinutosSegundos(masseira.tempo_mistura_lenta_padrao);
        setTempoLentaMin(minutos);
        setTempoLentaSeg(segundos);
      }
      if (masseira.tempo_mistura_rapida_padrao) {
        const { minutos, segundos } = decimalParaMinutosSegundos(masseira.tempo_mistura_rapida_padrao);
        setTempoRapidaMin(minutos);
        setTempoRapidaSeg(segundos);
      }
    }
  }, [masseiraId, masseiras]);

  // Atualizar quantidade usada de um ingrediente
  const updateIngredienteQuantidade = (ingredienteId: string, quantidade: number) => {
    setIngredientes((prev) =>
      prev.map((ing) =>
        ing.id === ingredienteId ? { ...ing, quantidade_usada: quantidade } : ing,
      ),
    );
  };

  // Calcular produção estimada (assadeiras e unidades)
  const calcularProducaoEstimada = () => {
    if (!ordemProducao.produto.receita_massa) return null;
    
    const unidadesTotais = receitasBatidas * ordemProducao.produto.receita_massa.quantidade_por_produto;
    const unidadesArredondadas = Math.round(unidadesTotais);
    
    const partes: string[] = [];
    
    // Calcular assadeiras se disponível
    if (ordemProducao.produto.unidades_assadeira && ordemProducao.produto.unidades_assadeira > 0) {
      const assadeiras = unidadesTotais / ordemProducao.produto.unidades_assadeira;
      const unidadesPorAssadeira = ordemProducao.produto.unidades_assadeira;
      partes.push(`${formatNumberWithThousands(assadeiras, { minimumFractionDigits: 0, maximumFractionDigits: 1 })} LT c/ ${formatIntegerWithThousands(unidadesPorAssadeira)}`);
    }
    
    // Adicionar unidades arredondadas
    partes.push(`${formatIntegerWithThousands(unidadesArredondadas)} un`);
    
    return partes.join(' / ');
  };

  // Calcular receitas já batidas
  const receitasJaBatidas = lotes.reduce((sum, lote) => sum + lote.receitas_batidas, 0);

  const quantityInfo = getQuantityByStation('massa', ordemProducao.qtd_planejada, {
    unidadeNomeResumido: ordemProducao.produto.unidadeNomeResumido,
    unidades_assadeira: ordemProducao.produto.unidades_assadeira || null,
    box_units: ordemProducao.produto.box_units || null,
    receita_massa: ordemProducao.produto.receita_massa,
  });

  const receitasNecessarias = quantityInfo.receitas?.value || 0;
  const receitasRestantes = Math.max(0, receitasNecessarias - receitasJaBatidas);

  // Definir valor inicial do input de receitas baseado no restante
  useEffect(() => {
    // Só atualiza o valor inicial se não estiver editando um lote existente e o formulário estiver visível
    if (!editingLoteId && showForm && receitasRestantes > 0) {
      if (Math.abs(receitasRestantes - 0.5) < 0.01) {
        setReceitasBatidas(0.5);
      } else {
        setReceitasBatidas(1);
      }
    }
  }, [receitasRestantes, editingLoteId, showForm]);

  // Função para cancelar edição/criação
  const cancelForm = () => {
    setShowForm(false);
    setEditingLoteId(null);
    setError(null);
    setReceitaId('');
    setIngredientes([]);
    setMasseiraId('');
    setReceitasBatidas(1);
    setTempoLentaMin(0);
    setTempoLentaSeg(0);
    setTempoRapidaMin(0);
    setTempoRapidaSeg(0);
    setTemperatura(0);
    setTexturaOk(false);
  };

  // Função para abrir formulário de novo lote (reservada para uso futuro)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const openNewLoteForm = () => {
    // Pré-seleciona receita se houver apenas uma opção
    if (receitas.length === 1) {
      setReceitaId(receitas[0].id);
    }
    // Pré-seleciona masseira se houver apenas uma opção
    if (masseiras.length === 1) {
      setMasseiraId(masseiras[0].id);
    }
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Se não há etapasLogId, tenta criar o log novamente
      let logId = etapasLogId;
      if (!logId) {
        const logResult = await ensureMassaStepLog(ordemProducao.id);
        if (!logResult.success || !logResult.data) {
          throw new Error(logResult.error || 'Erro ao criar log de etapa. Por favor, recarregue a página e tente novamente.');
        }
        logId = logResult.data.id;
        setEtapasLogId(logId);
      }

      const ingredientesData = ingredientes.map((ing) => ({
        insumo_id: ing.insumo_id || '',
        quantidade_padrao: ing.quantidade_padrao,
        quantidade_usada: ing.quantidade_usada,
        unidade: ing.unidade,
      }));

      let result;
      if (editingLoteId) {
        // Atualiza o lote existente
        result = await updateMassaLote(editingLoteId, {
          receitas_batidas: receitasBatidas,
          temperatura_final: temperatura,
          textura: texturaOk ? 'ok' : 'rasga',
          tempo_lenta: minutosSegundosParaDecimal(tempoLentaMin, tempoLentaSeg),
          tempo_rapida: minutosSegundosParaDecimal(tempoRapidaMin, tempoRapidaSeg),
          ingredientes: ingredientesData,
        });
      } else {
        // Cria novo lote
        result = await createMassaLote({
          producao_etapas_log_id: logId,
          receita_id: receitaId,
          masseira_id: masseiraId || null,
          receitas_batidas: receitasBatidas,
          temperatura_final: temperatura,
          textura: texturaOk ? 'ok' : 'rasga',
          tempo_lenta: minutosSegundosParaDecimal(tempoLentaMin, tempoLentaSeg),
          tempo_rapida: minutosSegundosParaDecimal(tempoRapidaMin, tempoRapidaSeg),
          ingredientes: ingredientesData,
        });
      }

      if (!result.success) {
        throw new Error(result.error || 'Erro ao salvar lote');
      }

      // Recarrega lotes
      const lotesResult = await getMassaLotesByOrder(ordemProducao.id);
      if (lotesResult.success && lotesResult.data) {
        setLotes(lotesResult.data);
      }

      // Limpa formulário
      cancelForm();

      // Redireciona para a fila de produção com station=massa
      router.push('/producao/fila?station=massa');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar');
      // Scroll para o erro após um pequeno delay para garantir que o DOM foi atualizado
      setTimeout(() => {
        errorAlertRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      }, 100);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProductionStepLayout
      etapaNome="Massa"
      loteCodigo={ordemProducao.lote_codigo}
      produtoNome={ordemProducao.produto.nome}
    >
      {/* Informações de progresso */}
      {quantityInfo.receitas && (
        <ProductionProgressCard
          quantityInfo={quantityInfo}
          realizado={{
            label: 'Total realizado',
            value: receitasJaBatidas,
            unit: 'receitas',
          }}
          restante={
            receitasRestantes > 0
              ? {
                  label: 'Restantes',
                  value: receitasRestantes,
                  unit: 'receitas',
                }
              : undefined
          }
          completo={receitasRestantes === 0}
        />
      )}

      {/* Formulário para novo lote ou edição */}
      {showForm && (
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {editingLoteId ? 'Editar Lote de Massa' : 'Novo Lote de Massa'}
              </h3>

              <div ref={errorAlertRef}>
                <ProductionErrorAlert error={error} />
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Quantidade de Receitas Batidas - PRIMEIRO */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700 ml-1">
                    Quantidade de Receitas Batidas
                  </label>
                  <div className="relative group">
                    <input
                      type="number"
                      min="0.5"
                      step="0.5"
                      value={receitasBatidas || ''}
                      onChange={(e) => setReceitasBatidas(parseFloat(e.target.value) || 0)}
                      required
                      className="w-full px-4 py-3 pr-10 bg-gray-50 border-2 border-gray-100 rounded-xl text-gray-900 font-medium focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium pointer-events-none">
                      receitas
                    </span>
                  </div>
                  {receitasBatidas > 0 && calcularProducaoEstimada() && (
                    <p className="text-sm text-gray-600 ml-1">
                      Produção estimada: <strong>{calcularProducaoEstimada()}</strong>
                    </p>
                  )}
                </div>

                {/* Seleção de Receita - apenas para novo lote */}
                {!editingLoteId && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700 ml-1">Receita</label>
                    <div className="relative">
                      <select
                        value={receitaId}
                        onChange={(e) => setReceitaId(e.target.value)}
                        required
                        className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl text-gray-900 font-medium focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all appearance-none cursor-pointer"
                      >
                        <option value="">Selecione uma receita</option>
                        {receitas.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.codigo} - {r.nome}
                          </option>
                        ))}
                      </select>
                      <span className="material-icons absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                        expand_more
                      </span>
                    </div>
                  </div>
                )}

                {/* Lista de Ingredientes com Quantidades Editáveis */}
                {ingredientes.length > 0 && (
                  <Accordion title="Ingredientes e Quantidades Utilizadas" defaultOpen={false}>
                    <div className="space-y-3">
                      {ingredientes.map((ing) => (
                        <div
                          key={ing.id}
                          className="px-4 py-3 bg-white border-2 border-gray-200 rounded-xl"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-900">
                              {ing.ingrediente_nome}
                            </span>
                            <span className="text-xs text-gray-500">
                              Padrão:{' '}
                              {(() => {
                                const gramas = calcularGramas(ing.quantidade_padrao, ing.unidade);
                                if (gramas !== null) {
                                  return (
                                    <>
                                      {ing.quantidade_padrao}{ing.unidade} / <span className="text-blue-600 font-medium">{gramas}g</span>
                                    </>
                                  );
                                }
                                return `${ing.quantidade_padrao} ${ing.unidade}`;
                              })()}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="relative group flex-1">
                              <input
                                type="number"
                                min="0"
                                step="0.001"
                                value={ing.quantidade_usada || ''}
                                onChange={(e) =>
                                  updateIngredienteQuantidade(ing.id, parseFloat(e.target.value) || 0)
                                }
                                className="w-full px-4 py-2.5 pr-16 bg-white border-2 border-gray-200 rounded-lg text-gray-900 font-medium focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium pointer-events-none">
                                {ing.unidade}
                              </span>
                            </div>
                            {(() => {
                              const valorFormatado = formatarValorLateral(ing.quantidade_usada, ing.unidade);
                              return valorFormatado ? (
                                <span className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium whitespace-nowrap flex-shrink-0">
                                  {valorFormatado}
                                </span>
                              ) : null;
                            })()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </Accordion>
                )}

                {/* Seleção de Masseira - apenas para novo lote */}
                {!editingLoteId && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-gray-700 ml-1">Masseira</label>
                    <div className="relative">
                      <select
                        value={masseiraId}
                        onChange={(e) => setMasseiraId(e.target.value)}
                        required
                        className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl text-gray-900 font-medium focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all appearance-none cursor-pointer"
                      >
                        <option value="">Selecione uma masseira</option>
                        {masseiras.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.nome}
                          </option>
                        ))}
                      </select>
                      <span className="material-icons absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                        expand_more
                      </span>
                    </div>
                  </div>
                )}

                {/* Tempos de Mistura */}
                {masseiraId && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-gray-700 ml-1">
                          Tempo Mistura Lenta
                        </label>
                        <div className="flex gap-2 items-end">
                          <div className="flex-1 relative group">
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={tempoLentaMin || ''}
                              onChange={(e) => setTempoLentaMin(parseInt(e.target.value) || 0)}
                              className="w-full px-4 py-3 pr-10 bg-gray-50 border-2 border-gray-100 rounded-xl text-gray-900 font-medium focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium pointer-events-none">
                              min
                            </span>
                          </div>
                          <div className="flex-1 relative group">
                            <input
                              type="number"
                              min="0"
                              max="59"
                              step="1"
                              value={tempoLentaSeg || ''}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                setTempoLentaSeg(Math.min(59, Math.max(0, val)));
                              }}
                              className="w-full px-4 py-3 pr-10 bg-gray-50 border-2 border-gray-100 rounded-xl text-gray-900 font-medium focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium pointer-events-none">
                              seg
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-gray-700 ml-1">
                          Tempo Mistura Rápida
                        </label>
                        <div className="flex gap-2 items-end">
                          <div className="flex-1 relative group">
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={tempoRapidaMin || ''}
                              onChange={(e) => setTempoRapidaMin(parseInt(e.target.value) || 0)}
                              className="w-full px-4 py-3 pr-10 bg-gray-50 border-2 border-gray-100 rounded-xl text-gray-900 font-medium focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium pointer-events-none">
                              min
                            </span>
                          </div>
                          <div className="flex-1 relative group">
                            <input
                              type="number"
                              min="0"
                              max="59"
                              step="1"
                              value={tempoRapidaSeg || ''}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                setTempoRapidaSeg(Math.min(59, Math.max(0, val)));
                              }}
                              className="w-full px-4 py-3 pr-10 bg-gray-50 border-2 border-gray-100 rounded-xl text-gray-900 font-medium focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium pointer-events-none">
                              seg
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Temperatura */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700 ml-1">
                    Temperatura da Massa ao Sair da Masseira (°C)
                  </label>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-600 whitespace-nowrap">Alvo: 26 - 28 °C</span>
                    <span className="text-gray-300">|</span>
                    <div className="relative group flex-1">
                      <input
                        type="number"
                        min="0"
                        max="50"
                        step="0.1"
                        value={temperatura || ''}
                        onChange={(e) => setTemperatura(parseFloat(e.target.value) || 0)}
                        required
                        placeholder="Medido"
                        className="w-full px-4 py-3 pr-10 bg-gray-50 border-2 border-gray-100 rounded-xl text-gray-900 font-medium focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium pointer-events-none">
                        °C
                      </span>
                    </div>
                  </div>
                  {temperatura > 0 && (temperatura < 26 || temperatura > 28) && (
                    <p className="text-sm text-amber-600 ml-1 flex items-center gap-1">
                      <span className="material-icons text-sm">warning</span>
                      Temperatura fora da faixa ideal (26-28°C)
                    </p>
                  )}
                </div>

                {/* Textura */}
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700 ml-1">Textura</label>
                  <div className="px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl">
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={texturaOk}
                        onChange={(e) => setTexturaOk(e.target.checked)}
                        required
                        className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0"
                      />
                      <span className="text-gray-900 font-medium">OK - Mole, estica e não rasga</span>
                    </label>
                    {!texturaOk && (
                      <p className="text-sm text-gray-600 mt-2 ml-8 flex items-center gap-1">
                        <span className="material-icons text-sm">info</span>
                        Marque como OK apenas se testou e está correto
                      </p>
                    )}
                  </div>
                </div>

                 <ProductionFormActions
                   onCancel={cancelForm}
                   submitLabel="Salvar Lote"
                   cancelLabel="Cancelar"
                   loading={loading}
                   disabled={!texturaOk || (!editingLoteId && (!receitaId || !masseiraId))}
                 />
              </form>
            </div>
          )}

      {/* Botão para voltar quando não há formulário */}
      {!showForm && (
        <div className="pt-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="w-full px-6 py-3.5 text-gray-700 bg-white border-2 border-gray-100 rounded-xl font-semibold hover:bg-gray-50 hover:border-gray-200 transition-all"
          >
            Voltar
          </button>
        </div>
      )}
    </ProductionStepLayout>
  );
}
