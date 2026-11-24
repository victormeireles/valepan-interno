'use client';

import { apagarCargo, definirCargoAtivo, gravarCargo, type CargoForm } from '@/app/actions/pessoas-cargo-actions';
import type { CargoCadastro } from '@/domain/pessoas/cargo-faixa';

type Aviso = (texto: string) => void;
type Resultado = { ok: boolean; mensagem: string };

export class CargoComandos {
  constructor(
    private readonly form: CargoForm,
    private readonly definirForm: (form: CargoForm) => void,
    private readonly definirErro: Aviso,
    private readonly definirAviso: Aviso,
    private readonly definirOcupado: (ocupado: boolean) => void,
    private readonly atualizar: () => void,
  ) {}

  gravar(): Promise<void> {
    return this.executar(() => gravarCargo(this.form), () => this.definirForm({ nome: '', de: '', ate: '' }));
  }

  alternar(cargo: CargoCadastro): Promise<void> {
    return this.executar(() => definirCargoAtivo(cargo.id, !cargo.ativo));
  }

  apagar(cargo: CargoCadastro): Promise<void> {
    if (!window.confirm(`Apagar o cargo ${cargo.nome}?`)) return Promise.resolve();
    return this.executar(() => apagarCargo(cargo.id), () => {
      if (this.form.id === cargo.id) this.definirForm({ nome: '', de: '', ate: '' });
    });
  }

  private async executar(acao: () => Promise<Resultado>, depois?: () => void): Promise<void> {
    this.definirOcupado(true);
    this.definirErro('');
    this.definirAviso('');
    const resultado = await acao();
    this.definirOcupado(false);
    if (!resultado.ok) {
      this.definirErro(resultado.mensagem);
      return;
    }
    depois?.();
    this.definirAviso(resultado.mensagem);
    this.atualizar();
  }
}
