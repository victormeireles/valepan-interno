import type { ReactNode } from 'react';
import type { ColaboradorCadastro } from '@/domain/pessoas/colaborador-cadastro';
import { CadastroExibicao } from '@/domain/pessoas/cadastro-exibicao';

export function CadastroLeitura({ cadastro }: { cadastro: ColaboradorCadastro }) {
  const exibir = new CadastroExibicao();
  return (
    <div className="flex flex-col gap-5">
      <Grupo titulo="Contato">
        <Campo rotulo="Telefone" valor={exibir.telefone(cadastro.telefone)} />
        <Campo rotulo="E-mail" valor={exibir.texto(cadastro.email)} />
      </Grupo>
      <Grupo titulo="Documentos">
        <Campo rotulo="CPF" valor={exibir.cpf(cadastro.cpf)} />
        <Campo rotulo="Nome da mãe" valor={exibir.texto(cadastro.nomeMae)} />
        <Campo rotulo="Endereço" valor={exibir.texto(cadastro.endereco)} largo />
      </Grupo>
      <Grupo titulo="Transporte">
        <Campo rotulo="Vale transporte" valor={exibir.vale(cadastro.valeTransporte)} />
      </Grupo>
      <Grupo titulo="Emergência">
        <Campo rotulo="Contato" valor={exibir.texto(cadastro.contatoEmergencia)} />
        <Campo rotulo="Telefone" valor={exibir.telefone(cadastro.telefoneEmergencia)} />
      </Grupo>
      <Grupo titulo="EPI">
        <Campo rotulo="Camiseta" valor={exibir.texto(cadastro.tamanhoCamiseta)} />
        <Campo rotulo="Calça" valor={exibir.texto(cadastro.tamanhoCalca)} />
        <Campo rotulo="Calçado" valor={exibir.texto(cadastro.numeroCalcado)} />
      </Grupo>
      <Grupo titulo="Pagamento">
        <Campo rotulo="Banco" valor={exibir.texto(cadastro.banco)} />
        <Campo rotulo="Agência" valor={exibir.texto(cadastro.agencia)} />
        <Campo rotulo="Conta" valor={exibir.texto(cadastro.contaCorrente)} />
        <Campo rotulo="Tipo" valor={exibir.poupanca(cadastro.contaPoupanca)} />
        <Campo rotulo="Chave Pix" valor={exibir.texto(cadastro.chavePix)} largo />
      </Grupo>
    </div>
  );
}

function Grupo({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-stone-500">{titulo}</h3>
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</dl>
    </section>
  );
}

function Campo({ rotulo, valor, largo = false }: { rotulo: string; valor: string; largo?: boolean }) {
  return (
    <div className={largo ? 'sm:col-span-2' : undefined}>
      <dt className="text-xs text-stone-500">{rotulo}</dt>
      <dd className="text-sm text-stone-900">{valor}</dd>
    </div>
  );
}
