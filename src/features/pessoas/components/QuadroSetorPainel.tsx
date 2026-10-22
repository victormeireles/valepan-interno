'use client';

import { useState } from 'react';
import { criarSetor } from '@/app/actions/pessoas-setor-actions';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { PainelAcao } from './PainelAcao';

type Props = {
  aberto: boolean;
  onFechar: () => void;
  onConcluir: (mensagem: string, ok: boolean) => void;
};

export function QuadroSetorPainel({ aberto, onFechar, onConcluir }: Props) {
  if (!aberto) return null;
  return <Formulario onFechar={onFechar} onConcluir={onConcluir} />;
}

function Formulario({ onFechar, onConcluir }: Omit<Props, 'aberto'>) {
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<'operacional' | 'apoio'>('operacional');
  const [pendente, setPendente] = useState(false);

  async function salvar() {
    setPendente(true);
    const resultado = await criarSetor({ nome, tipo });
    setPendente(false);
    onConcluir(resultado.mensagem, resultado.ok);
    if (resultado.ok) onFechar();
  }

  return (
    <PainelAcao aberto titulo="Novo setor" onFechar={onFechar}>
      <div className="flex flex-col gap-4">
        <Input label="Nome" value={nome} required onChange={(event) => setNome(event.target.value)} />
        <Select
          label="Tipo"
          value={tipo}
          onChange={(event) => setTipo(event.target.value as 'operacional' | 'apoio')}
          options={[
            { value: 'operacional', label: 'Operacional' },
            { value: 'apoio', label: 'Apoio' },
          ]}
        />
        <p className="text-sm text-stone-600">O código é gerado a partir do nome. Depois você cria os turnos no próprio setor.</p>
        <div className="flex justify-stretch border-t border-stone-100 pt-4 sm:justify-end">
          <Button
            type="button"
            variant="primary"
            size="lg"
            fullWidth
            className="sm:w-auto"
            disabled={pendente || !nome.trim()}
            onClick={salvar}
          >
            {pendente ? 'Salvando…' : 'Criar setor'}
          </Button>
        </div>
      </div>
    </PainelAcao>
  );
}
