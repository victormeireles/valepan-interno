'use client';

import { useEffect, useState } from 'react';
import DateInput from '@/components/FormControls/DateInput';
import NumberInput from '@/components/FormControls/NumberInput';
import AutocompleteInput from '@/components/FormControls/AutocompleteInput';
import Switch from '@/components/FormControls/Switch';

type EditData = {
  dataPedido: string;
  dataFabricacao: string;
  cliente: string;
  observacao: string;
  produto: string;
  congelado: boolean;
  caixas: number;
  pacotes: number;
  unidades: number;
  kg: number;
};

type EditModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: EditData) => Promise<void>;
  onDelete?: () => Promise<void>;
  rowId?: number;
  initialData?: EditData;
  clientesOptions: string[];
  produtosOptions: string[];
  loading?: boolean;
  visibleFields?: {
    dataFabricacao?: boolean;
    cliente?: boolean;
    observacao?: boolean;
    congelado?: boolean;
    pacotes?: boolean;
  };
  labelsOverride?: {
    title?: string;
    caixas?: string;
    pacotes?: string;
    unidades?: string;
    kg?: string;
  };
};

export default function EditModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  rowId,
  initialData,
  clientesOptions,
  produtosOptions,
  loading = false,
  visibleFields,
  labelsOverride
}: EditModalProps) {
  const [formData, setFormData] = useState<EditData>({
    dataPedido: '',
    dataFabricacao: '',
    cliente: '',
    observacao: '',
    produto: '',
    congelado: false,
    caixas: 0,
    pacotes: 0,
    unidades: 0,
    kg: 0,
  });

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setMessage(null);
      await onSave(formData);
      onClose(); // Fechar imediatamente após sucesso
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Erro ao salvar dados' 
      });
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    
    const confirmed = window.confirm('Tem certeza que deseja deletar este pedido? Esta ação não pode ser desfeita.');
    if (!confirmed) return;

    try {
      setMessage(null);
      await onDelete();
      onClose(); // Fechar imediatamente após sucesso
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Erro ao deletar pedido' 
      });
    }
  };

  const handleClose = () => {
    setFormData({
      dataPedido: '',
      dataFabricacao: '',
      cliente: '',
      observacao: '',
      produto: '',
      congelado: false,
      caixas: 0,
      pacotes: 0,
      unidades: 0,
      kg: 0,
    });
    setMessage(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {labelsOverride?.title || (rowId ? `Editar Pedido (Linha ${rowId})` : 'Novo Pedido')}
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          {message && (
            <div className={`mb-4 p-3 rounded-md ${
              message.type === 'success' 
                ? 'bg-green-100 text-green-700 border border-green-300' 
                : 'bg-red-100 text-red-700 border border-red-300'
            }`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DateInput
                label="Data de Produção"
                value={formData.dataPedido}
                onChange={(value) => setFormData(prev => ({ ...prev, dataPedido: value }))}
                required
              />
              {(visibleFields?.dataFabricacao ?? true) && (
                <DateInput
                  label="Data de Fabricação na Etiqueta"
                  value={formData.dataFabricacao}
                  onChange={(value) => setFormData(prev => ({ ...prev, dataFabricacao: value }))}
                  required
                />
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(visibleFields?.cliente ?? true) && (
                <AutocompleteInput
                  label="Cliente"
                  value={formData.cliente}
                  onChange={(value) => setFormData(prev => ({ ...prev, cliente: value }))}
                  options={clientesOptions}
                  required
                />
              )}
              <AutocompleteInput
                label="Produto"
                value={formData.produto}
                onChange={(value) => setFormData(prev => ({ ...prev, produto: value }))}
                options={produtosOptions}
                required
              />
            </div>

            {(visibleFields?.observacao ?? true) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Observação
                </label>
                <input
                  type="text"
                  value={formData.observacao}
                  onChange={(e) => setFormData(prev => ({ ...prev, observacao: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                  placeholder="Observações do cliente"
                />
              </div>
            )}

            {(visibleFields?.congelado ?? true) && (
              <div className="flex items-center space-x-4">
                <Switch
                  label="Congelado"
                  value={formData.congelado}
                  onChange={(checked) => setFormData(prev => ({ ...prev, congelado: checked }))}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <NumberInput
                label={labelsOverride?.caixas || 'Caixas'}
                value={formData.caixas}
                onChange={(value) => setFormData(prev => ({ ...prev, caixas: value }))}
                min={0}
              />
              {(visibleFields?.pacotes ?? true) && (
                <NumberInput
                  label={labelsOverride?.pacotes || 'Pacotes'}
                  value={formData.pacotes}
                  onChange={(value) => setFormData(prev => ({ ...prev, pacotes: value }))}
                  min={0}
                />
              )}
              <NumberInput
                label={labelsOverride?.unidades || 'Unidades'}
                value={formData.unidades}
                onChange={(value) => setFormData(prev => ({ ...prev, unidades: value }))}
                min={0}
              />
              <NumberInput
                label={labelsOverride?.kg || 'Kg'}
                value={formData.kg}
                onChange={(value) => setFormData(prev => ({ ...prev, kg: value }))}
                min={0}
                step={1}
              />
            </div>

            <div className="flex justify-between pt-4">
              <div>
                {rowId && onDelete && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
                    disabled={loading}
                  >
                    {loading ? 'Deletando...' : 'Deletar'}
                  </button>
                )}
              </div>
              
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
