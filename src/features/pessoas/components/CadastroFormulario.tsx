'use client';

import { useState, type ReactNode } from 'react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { TAMANHOS_CAMISETA, type ColaboradorCadastro } from '@/domain/pessoas/colaborador-cadastro';

export function CadastroFormulario({ cadastro }: { cadastro: ColaboradorCadastro }) {
  return (
    <>
      <Grupo titulo="Contato">
        <Input name="telefone" label="Telefone" defaultValue={cadastro.telefone ?? ''} inputMode="tel" />
        <Input name="email" label="E-mail" type="email" defaultValue={cadastro.email ?? ''} />
      </Grupo>
      <Grupo titulo="Documentos">
        <Input name="cpf" label="CPF" defaultValue={cadastro.cpf ?? ''} inputMode="numeric" />
        <Input name="nomeMae" label="Nome da mãe" defaultValue={cadastro.nomeMae ?? ''} />
        <div className="sm:col-span-2">
          <Input name="endereco" label="Endereço" defaultValue={cadastro.endereco ?? ''} />
        </div>
      </Grupo>
      <Grupo titulo="Transporte">
        <Select
          name="valeTransporte"
          label="Vale transporte"
          defaultValue={valeValor(cadastro.valeTransporte)}
          options={[
            { value: '', label: 'Não informado' },
            { value: 'sim', label: 'Precisa' },
            { value: 'nao', label: 'Não precisa' },
          ]}
        />
      </Grupo>
      <Grupo titulo="Emergência">
        <Input name="contatoEmergencia" label="Contato de emergência" defaultValue={cadastro.contatoEmergencia ?? ''} />
        <Input name="telefoneEmergencia" label="Telefone do contato" defaultValue={cadastro.telefoneEmergencia ?? ''} inputMode="tel" />
      </Grupo>
      <Grupo titulo="EPI">
        <Select
          name="tamanhoCamiseta"
          label="Tamanho da camiseta"
          defaultValue={cadastro.tamanhoCamiseta ?? ''}
          options={[{ value: '', label: 'Não informado' }, ...TAMANHOS_CAMISETA.map((tamanho) => ({ value: tamanho, label: tamanho }))]}
        />
        <Input name="tamanhoCalca" label="Tamanho da calça" defaultValue={cadastro.tamanhoCalca ?? ''} placeholder="Ex.: 42" />
        <Input name="numeroCalcado" label="Número do calçado" defaultValue={cadastro.numeroCalcado ?? ''} placeholder="Ex.: 40" />
      </Grupo>
      <Grupo titulo="Pagamento">
        <Input name="banco" label="Banco" defaultValue={cadastro.banco ?? ''} />
        <Input name="agencia" label="Agência" defaultValue={cadastro.agencia ?? ''} />
        <Input name="contaCorrente" label="Conta" defaultValue={cadastro.contaCorrente ?? ''} />
        <ContaPoupanca inicial={cadastro.contaPoupanca} />
        <div className="sm:col-span-2">
          <Input name="chavePix" label="Chave Pix" defaultValue={cadastro.chavePix ?? ''} />
        </div>
      </Grupo>
    </>
  );
}

function ContaPoupanca({ inicial }: { inicial: boolean }) {
  const [marcada, setMarcada] = useState(inicial);
  return (
    <div className="flex min-h-11 items-end">
      <input type="hidden" name="contaPoupanca" value={marcada ? '1' : '0'} />
      <Switch label="Conta poupança" checked={marcada} onChange={setMarcada} />
    </div>
  );
}

function valeValor(valor: boolean | null): string {
  if (valor === true) return 'sim';
  if (valor === false) return 'nao';
  return '';
}

function Grupo({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-500">{titulo}</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>
    </section>
  );
}
