'use client';

import { useEffect, useState } from 'react';
import DateInput from '@/components/FormControls/DateInput';
import NumberInput from '@/components/FormControls/NumberInput';
import AutocompleteInput from '@/components/FormControls/AutocompleteInput';
import TextInput from '@/components/FormControls/TextInput';
import Switch from '@/components/FormControls/Switch';

type PedidoItem = {
  produto: string;
  congelado: boolean;
  caixas: number;
  pacotes: number;
  unidades: number;
  kg: number;
};

type CreatePedidoData = {
  dataPedido: string;
  dataFabricacao: string;
  cliente: string;
  observacao: string;
  itens: PedidoItem[];
};

type CreatePedidoModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CreatePedidoData) => Promise<void>;
  clientesOptions: string[];
  produtosOptions: string[];
  loading?: boolean;
};

export default function CreatePedidoModal({
  isOpen,
  onClose,
  onSave,
  clientesOptions,
  produtosOptions,
  loading = false
}: CreatePedidoModalProps) {
  // Função para obter data de hoje no formato YYYY-MM-DD
  const getTodayISO = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const [formData, setFormData] = useState<CreatePedidoData>({
    dataPedido: getTodayISO(),
    dataFabricacao: getTodayISO(),
    cliente: '',
    observacao: '',
    itens: [{
      produto: '',
      congelado: false,
      caixas: 0,
      pacotes: 0,
      unidades: 0,
      kg: 0,
    }]
  });

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Resetar formulário quando abrir com data de hoje
      setFormData({
        dataPedido: getTodayISO(),
        dataFabricacao: getTodayISO(),
        cliente: '',
        observacao: '',
        itens: [{
          produto: '',
          congelado: false,
          caixas: 0,
          pacotes: 0,
          unidades: 0,
          kg: 0,
        }]
      });
      setMessage(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setMessage(null);
      
      // Validar se pelo menos um item tem produto e quantidade
      const validItems = formData.itens.filter(item => 
        item.produto.trim() && 
        (item.caixas > 0 || item.pacotes > 0 || item.unidades > 0 || item.kg > 0)
      );
      
      if (validItems.length === 0) {
        setMessage({ type: 'error', text: 'Adicione pelo menos um produto com quantidade' });
        return;
      }

      await onSave({
        ...formData,
        itens: validItems
      });
      onClose();
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Erro ao criar pedido' 
      });
    }
  };

  const handleClose = () => {
    setFormData({
      dataPedido: '',
      dataFabricacao: '',
      cliente: '',
      observacao: '',
      itens: [{
        produto: '',
        congelado: false,
        caixas: 0,
        pacotes: 0,
        unidades: 0,
        kg: 0,
      }]
    });
    setMessage(null);
    onClose();
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      itens: [...prev.itens, {
        produto: '',
        congelado: false,
        caixas: 0,
        pacotes: 0,
        unidades: 0,
        kg: 0,
      }]
    }));
  };

  const removeItem = (index: number) => {
    if (formData.itens.length > 1) {
      setFormData(prev => ({
        ...prev,
        itens: prev.itens.filter((_, i) => i !== index)
      }));
    }
  };

  const updateItem = (index: number, field: keyof PedidoItem, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      itens: prev.itens.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 sm:p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Novo Pedido de Embalagem
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          {message && (
            <div className={`mb-6 p-4 rounded-md ${
              message.type === 'success' 
                ? 'bg-green-100 text-green-800 border border-green-200' 
                : 'bg-red-100 text-red-800 border border-red-200'
            }`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Informações Gerais */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações Gerais</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <DateInput
                  label="Data de Produção"
                  value={formData.dataPedido}
                  onChange={(value) => setFormData(prev => ({ ...prev, dataPedido: value }))}
                  required
                />
                
                <DateInput
                  label="Data de Fabricação na Etiqueta"
                  value={formData.dataFabricacao}
                  onChange={(value) => setFormData(prev => ({ ...prev, dataFabricacao: value }))}
                  required
                />
                
                <AutocompleteInput
                  label="Cliente"
                  value={formData.cliente}
                  onChange={(value) => setFormData(prev => ({ ...prev, cliente: value }))}
                  options={clientesOptions}
                  required
                />
                
                <TextInput
                  label="Observação"
                  value={formData.observacao}
                  onChange={(value) => setFormData(prev => ({ ...prev, observacao: value }))}
                  placeholder="Observações do cliente"
                />
              </div>
            </div>

            {/* Itens do Pedido */}
            <div className="bg-gray-50 p-6 rounded-lg">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Itens do Pedido</h3>
              </div>

              <div className="space-y-4">
                {formData.itens.map((item, index) => (
                  <div key={index} className="bg-white p-4 rounded-lg border border-gray-200">
                    <div className="flex justify-end mb-4">
                      {formData.itens.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          Remover
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <AutocompleteInput
                        label="Produto"
                        value={item.produto}
                        onChange={(value) => updateItem(index, 'produto', value)}
                        options={produtosOptions}
                        required
                      />
                      
                      <div className="flex items-center space-x-4">
                        <Switch
                          value={item.congelado}
                          onChange={(value) => updateItem(index, 'congelado', value)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                      <NumberInput
                        label="Caixas"
                        value={item.caixas}
                        onChange={(value) => updateItem(index, 'caixas', value)}
                        min={0}
                        step={1}
                      />
                      
                      <NumberInput
                        label="Pacotes"
                        value={item.pacotes}
                        onChange={(value) => updateItem(index, 'pacotes', value)}
                        min={0}
                        step={1}
                      />
                      
                      <NumberInput
                        label="Unidades"
                        value={item.unidades}
                        onChange={(value) => updateItem(index, 'unidades', value)}
                        min={0}
                        step={1}
                      />
                      
                      <NumberInput
                        label="Kg"
                        value={item.kg}
                        onChange={(value) => updateItem(index, 'kg', value)}
                        min={0}
                        step={1}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Botão Adicionar Produto */}
              <div className="mt-6 flex justify-center">
                <button
                  type="button"
                  onClick={addItem}
                  className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
                >
                  + Adicionar Produto
                </button>
              </div>
            </div>

            <div className="flex justify-end space-x-4 pt-6">
              <button
                type="button"
                onClick={handleClose}
                className="px-6 py-3 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors font-medium"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium"
                disabled={loading}
              >
                {loading ? 'Criando...' : 'Criar Pedido'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
