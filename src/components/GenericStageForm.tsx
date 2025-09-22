'use client';

import { useState } from 'react';
import { getTodayString } from '@/domain/validation';
import { validateStageData } from '@/domain/validation';
import LoadingOverlay from './LoadingOverlay';
import DateInput from './FormControls/DateInput';
import TurnoRadio from './FormControls/TurnoRadio';
import SelectRemoteAutocomplete from './FormControls/SelectRemoteAutocomplete';
import NumberHalfStepInput from './FormControls/NumberHalfStepInput';
import NumberInput from './FormControls/NumberInput';

interface GenericStageFormProps {
  stage: string;
  stageName: string;
  stageDescription: string;
  fields: {
    [key: string]: {
      type: 'date' | 'turno' | 'select' | 'number' | 'numberHalf';
      required: boolean;
      label: string;
      sourceColumn?: string;
    };
  };
}

export default function GenericStageForm({ stage, stageName, stageDescription, fields }: GenericStageFormProps) {
  const [formData, setFormData] = useState<Record<string, string | number>>({
    data: getTodayString(),
    turno: 1,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsSubmitting(true);
      setSubmitMessage(null);

      // Validar dados
      const validatedData = validateStageData(stage, formData);

      // Enviar para API
      const response = await fetch(`/api/submit/${stage}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validatedData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao salvar dados');
      }

      setSubmitMessage({ type: 'success', text: result.message });
      
      // Limpar apenas campos variáveis, manter data e turno
      const newFormData: Record<string, string | number> = {
        data: getTodayString(),
        turno: formData.turno,
      };
      
      // Limpar campos específicos da etapa
      Object.keys(fields).forEach(key => {
        if (key !== 'data' && key !== 'turno') {
          if (fields[key].type === 'select') {
            newFormData[key] = '';
          } else if (fields[key].type === 'number' || fields[key].type === 'numberHalf') {
            newFormData[key] = 0;
          }
        }
      });
      
      setFormData(newFormData);
    } catch (error) {
      console.error('Erro ao salvar:', error);
      setSubmitMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Erro desconhecido' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFieldChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const renderField = (fieldName: string, fieldConfig: { type: string; required: boolean; label: string; sourceColumn?: string }) => {
    const value = formData[fieldName] || '';
    
    switch (fieldConfig.type) {
      case 'date':
        return (
          <DateInput
            key={fieldName}
            value={String(value)}
            onChange={(val) => handleFieldChange(fieldName, val)}
            required={fieldConfig.required}
          />
        );
      
      case 'turno':
        return (
          <TurnoRadio
            key={fieldName}
            value={value as 1 | 2}
            onChange={(val) => handleFieldChange(fieldName, val)}
            required={fieldConfig.required}
          />
        );
      
      case 'select':
        return (
          <SelectRemoteAutocomplete
            key={fieldName}
            value={String(value)}
            onChange={(val) => handleFieldChange(fieldName, val)}
            stage={stage}
            required={fieldConfig.required}
            placeholder={`Digite para buscar ${fieldConfig.label.toLowerCase()}...`}
            label={fieldConfig.label}
          />
        );
      
      case 'numberHalf':
        return (
          <NumberHalfStepInput
            key={fieldName}
            value={typeof value === 'number' ? value : 0}
            onChange={(val) => handleFieldChange(fieldName, val)}
            required={fieldConfig.required}
            label={fieldConfig.label}
          />
        );
      
      case 'number':
        return (
          <NumberInput
            key={fieldName}
            value={typeof value === 'number' ? value : 0}
            onChange={(val) => handleFieldChange(fieldName, val)}
            required={fieldConfig.required}
            label={fieldConfig.label}
          />
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="bg-gray-50 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{stageName}</h1>
            <p className="text-gray-600">{stageDescription}</p>
          </div>

          {submitMessage && (
            <div className={`mb-4 p-4 rounded-md ${
              submitMessage.type === 'success' 
                ? 'bg-green-50 border border-green-200 text-green-800' 
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}>
              {submitMessage.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {Object.entries(fields).map(([fieldName, fieldConfig]) => 
              renderField(fieldName, fieldConfig)
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 text-white py-5 px-6 rounded-lg font-bold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-2xl shadow-lg"
            >
              {isSubmitting ? 'Salvando...' : 'Salvar Dados'}
            </button>
          </form>
        </div>
      </div>

      <LoadingOverlay isLoading={isSubmitting} message="Salvando dados..." />
    </div>
  );
}
