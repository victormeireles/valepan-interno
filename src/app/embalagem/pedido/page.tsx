'use client';

import { useEffect, useMemo, useState } from 'react';
import DateInput from '@/components/FormControls/DateInput';
import NumberInput from '@/components/FormControls/NumberInput';
import AutocompleteInput from '@/components/FormControls/AutocompleteInput';
import Switch from '@/components/FormControls/Switch';
import { getTodayString } from '@/domain/validation';

type Item = {
  produto: string;
  congelado: boolean;
  quantidade: number;
  unidade: 'cx' | 'pct' | 'un' | 'kg' | '';
};

export default function PedidoEmbalagemPage() {
  const [dataProducao, setDataProducao] = useState(getTodayString());
  const [dataFabricacaoEtiqueta, setDataFabricacaoEtiqueta] = useState(getTodayString());
  const [cliente, setCliente] = useState('');
  const [observacao, setObservacao] = useState('');
  const [itens, setItens] = useState<Item[]>([
    { produto: '', congelado: false, quantidade: 0, unidade: '' }
  ]);
  const [clientesOptions, setClientesOptions] = useState<string[]>([]);
  const [produtosOptions, setProdutosOptions] = useState<string[]>([]);
  const [produtosComUnidades, setProdutosComUnidades] = useState<{ produto: string; unidade: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [clientesRes, produtosRes] = await Promise.all([
          fetch('/api/options/embalagem?type=clientes'),
          fetch('/api/options/embalagem?type=produtos'),
        ]);
        const clientesData = await clientesRes.json();
        const produtosData = await produtosRes.json();
        if (!clientesRes.ok) throw new Error(clientesData.error || 'Erro ao carregar clientes');
        if (!produtosRes.ok) throw new Error(produtosData.error || 'Erro ao carregar produtos');
        setClientesOptions(clientesData.options || []);
        setProdutosOptions(produtosData.options || []);
        setProdutosComUnidades(produtosData.productsWithUnits || []);
      } catch (err) {
        setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Erro ao carregar opções' });
      }
    };
    loadOptions();
  }, []);

  const canSubmit = useMemo(() => {
    if (!dataProducao || !dataFabricacaoEtiqueta || !cliente) return false;
    if (itens.length === 0) return false;
    for (const i of itens) {
      if (!i.produto || !i.unidade) return false;
      if (i.quantidade <= 0) return false;
    }
    return true;
  }, [dataProducao, dataFabricacaoEtiqueta, cliente, itens]);

  const addItem = () => {
    setItens(prev => [...prev, { produto: '', congelado: false, quantidade: 0, unidade: '' }]);
  };

  const updateItem = (index: number, patch: Partial<Item>) => {
    setItens(prev => prev.map((it, idx) => (idx === index ? { ...it, ...patch } : it)));
  };

  const getUnidadePadrao = (produto: string): string => {
    const produtoComUnidade = produtosComUnidades.find(p => p.produto === produto);
    const unidade = produtoComUnidade?.unidade || '';
    // Converter para minúsculo para corresponder aos valores internos
    return unidade.toLowerCase();
  };

  const handleProdutoChange = (index: number, produto: string) => {
    const unidadePadrao = getUnidadePadrao(produto);
    updateItem(index, { produto, unidade: unidadePadrao });
  };

  const removeItem = (index: number) => {
    setItens(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setMessage(null);
      const payload = { 
        dataPedido: dataProducao, 
        dataFabricacao: dataFabricacaoEtiqueta, 
        cliente, 
        observacao, 
        itens: itens.map(i => ({
          produto: i.produto,
          congelado: i.congelado ? 'Sim' : 'Não',
          caixas: i.unidade === 'cx' ? i.quantidade : 0,
          pacotes: i.unidade === 'pct' ? i.quantidade : 0,
          unidades: i.unidade === 'un' ? i.quantidade : 0,
          kg: i.unidade === 'kg' ? i.quantidade : 0,
        }))
      };
      const res = await fetch('/api/submit/embalagem-pedido', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao salvar');
      setMessage({ type: 'success', text: data.message || 'Salvo' });
      // reset parcial: mantém datas, limpa cliente, observação e itens
      setCliente('');
      setObservacao('');
      setItens([{ produto: '', congelado: false, quantidade: 0, unidade: '' }]);
      
      // Scroll para o topo da página
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Erro desconhecido' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-50 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Pedido para Embalagem</h1>
            <p className="text-gray-600">Cadastro de pedidos por cliente e produto</p>
          </div>

          {message && (
            <div className={`mb-4 p-4 rounded-md ${
              message.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-800'
            }`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <DateInput 
                value={dataProducao} 
                onChange={setDataProducao} 
                required 
                label="Data de Produção"
              />
              <DateInput 
                value={dataFabricacaoEtiqueta} 
                onChange={setDataFabricacaoEtiqueta} 
                required 
                label="Data de Fabricação na Etiqueta"
              />
            </div>

            <div className="grid grid-cols-1 gap-6">
              <AutocompleteInput
                value={cliente}
                onChange={setCliente}
                options={clientesOptions}
                placeholder="Digite para buscar o cliente..."
                required
                label="Cliente"
              />

              <div>
                <label className="block text-base font-semibold text-gray-800 mb-3">Observação do cliente</label>
                <textarea
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base bg-white text-gray-900"
                  placeholder="Observações adicionais..."
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">Itens do Pedido</h2>
              </div>

              {itens.map((item, idx) => (
                <div key={idx} className="p-4 border-2 border-gray-200 rounded-lg space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <AutocompleteInput
                        value={item.produto}
                        onChange={(value) => handleProdutoChange(idx, value)}
                        options={produtosOptions}
                        placeholder="Digite para buscar o produto..."
                        required
                        label="Produto"
                      />
                    </div>

                    <div>
                      <Switch
                        value={item.congelado}
                        onChange={(value) => updateItem(idx, { congelado: value })}
                        required
                        label="Congelado"
                        trueLabel="Sim"
                        falseLabel="Não"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <NumberInput label="Quantidade" value={item.quantidade} onChange={(v) => updateItem(idx, { quantidade: v })} />
                    <div>
                      <label className="block text-base font-semibold text-gray-800 mb-2">Unidade <span className="text-red-500">*</span></label>
                      <select
                        value={item.unidade}
                        onChange={(e) => updateItem(idx, { unidade: e.target.value as Item['unidade'] })}
                        required
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                      >
                        <option value="">Selecione...</option>
                        <option value="cx">CX</option>
                        <option value="pct">PCT</option>
                        <option value="un">UN</option>
                        <option value="kg">KG</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    {itens.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        className="text-red-600 hover:text-red-700 font-semibold"
                      >
                        Remover
                      </button>
                    )}
                  </div>
                </div>
              ))}

              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={addItem}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700"
                >
                  Adicionar produto
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={!canSubmit || loading}
              className="w-full bg-blue-600 text-white py-5 px-6 rounded-lg font-bold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-2xl shadow-lg"
            >
              {loading ? 'Salvando...' : 'Salvar pedido'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}


