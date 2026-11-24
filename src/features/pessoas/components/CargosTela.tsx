'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CargoForm } from '@/app/actions/pessoas-cargo-actions';
import { Toolbar } from '@/components/ui/Toolbar';
import type { CargoCadastro } from '@/domain/pessoas/cargo-faixa';
import { RemuneracaoCentavos } from '@/domain/pessoas/remuneracao-centavos';
import { CargoComandos } from './cargo-comandos';
import { CargoForma } from './CargoForma';
import { CargoLista } from './CargoLista';

const VAZIO: CargoForm = { nome: '', de: '', ate: '' };
const centavos = new RemuneracaoCentavos();

export function CargosTela({ cargos }: { cargos: CargoCadastro[] }) {
  const router = useRouter();
  const [form, setForm] = useState<CargoForm>(VAZIO);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const comandos = new CargoComandos(form, setForm, setErro, setAviso, setOcupado, () => router.refresh());

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-3xl flex-col gap-4">
      <Toolbar title="Cargos" resumo="Nome e faixa salarial de cada cargo." sticky={false} />
      <CargoForma
        form={form}
        erro={erro}
        aviso={aviso}
        ocupado={ocupado}
        onChange={setForm}
        onSubmit={() => void comandos.gravar()}
        onCancelar={() => setForm(VAZIO)}
      />
      <CargoLista
        cargos={cargos}
        onEditar={(cargo) => setForm(formularioDe(cargo))}
        onAtivo={(cargo) => void comandos.alternar(cargo)}
        onApagar={(cargo) => void comandos.apagar(cargo)}
      />
    </div>
  );
}

function formularioDe(cargo: CargoCadastro): CargoForm {
  return {
    id: cargo.id,
    nome: cargo.nome,
    de: centavos.digitar(cargo.deCentavos),
    ate: centavos.digitar(cargo.ateCentavos),
  };
}
