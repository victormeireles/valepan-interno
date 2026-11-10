import { describe, expect, it } from 'vitest';
import { OrdemCancelamento } from './ordem-cancelamento';

type Pedido = {
  status: string;
  tipo: 'corretiva' | 'preventiva';
  solicitacaoEditar: boolean;
  manutencaoEditar: boolean;
  manutencaoAdministrar: boolean;
  motivo: string;
  setorId: string;
  setoresElegiveis: readonly string[];
};

function pedido(parcial: Partial<Pedido> = {}): Pedido {
  return {
    status: 'aberta',
    tipo: 'corretiva',
    solicitacaoEditar: false,
    manutencaoEditar: false,
    manutencaoAdministrar: false,
    motivo: '',
    setorId: 'setor-1',
    setoresElegiveis: ['setor-1'],
    ...parcial,
  };
}

describe('OrdemCancelamento', () => {
  const cancelamento = new OrdemCancelamento();

  it('deixa o solicitante cancelar corretiva aberta sem motivo', () => {
    expect(cancelamento.permite(pedido({ solicitacaoEditar: true, motivo: '' }))).toEqual({
      ok: true,
      exigeMotivo: false,
    });
  });

  it('recusa o solicitante quando o setor da ordem não está liberado', () => {
    expect(
      cancelamento.permite(
        pedido({
          solicitacaoEditar: true,
          setorId: 'setor-2',
          setoresElegiveis: ['setor-1'],
        }),
      ),
    ).toEqual({ ok: false, mensagem: 'Sem permissão.' });
    expect(
      cancelamento.permite(
        pedido({ solicitacaoEditar: true, setorId: 'setor-1', setoresElegiveis: [] }),
      ),
    ).toEqual({ ok: false, mensagem: 'Sem permissão.' });
  });

  it('deixa oficina e administração cancelarem fora da lista do solicitante', () => {
    expect(
      cancelamento.permite(
        pedido({
          manutencaoEditar: true,
          solicitacaoEditar: true,
          setorId: 'setor-2',
          setoresElegiveis: [],
        }),
      ),
    ).toEqual({ ok: true, exigeMotivo: false });
    expect(
      cancelamento.permite(
        pedido({
          manutencaoAdministrar: true,
          solicitacaoEditar: true,
          status: 'recebida',
          motivo: 'Peça errada',
          setorId: 'setor-9',
          setoresElegiveis: ['setor-1'],
        }),
      ),
    ).toEqual({ ok: true, exigeMotivo: true });
  });

  it('impede o solicitante de cancelar preventiva', () => {
    expect(
      cancelamento.permite(pedido({ solicitacaoEditar: true, tipo: 'preventiva' })),
    ).toEqual({
      ok: false,
      mensagem: 'Solicitante não cancela preventiva.',
    });
  });

  it('deixa a manutenção editar cancelar ordem aberta sem motivo', () => {
    expect(cancelamento.permite(pedido({ manutencaoEditar: true }))).toEqual({
      ok: true,
      exigeMotivo: false,
    });
    expect(
      cancelamento.permite(pedido({ manutencaoEditar: true, tipo: 'preventiva' })),
    ).toEqual({
      ok: true,
      exigeMotivo: false,
    });
  });

  it('exige motivo quando quem administra cancela recebida ou aberta', () => {
    expect(
      cancelamento.permite(
        pedido({ manutencaoAdministrar: true, status: 'recebida', motivo: '' }),
      ),
    ).toEqual({ ok: false, mensagem: 'Informe o motivo.' });
    expect(
      cancelamento.permite(
        pedido({ manutencaoAdministrar: true, status: 'aberta', motivo: '   ' }),
      ),
    ).toEqual({ ok: false, mensagem: 'Informe o motivo.' });
  });

  it('aceita o motivo de quem administra e marca que ele era exigido', () => {
    expect(
      cancelamento.permite(
        pedido({
          manutencaoAdministrar: true,
          manutencaoEditar: true,
          status: 'recebida',
          motivo: '  Peça errada  ',
        }),
      ),
    ).toEqual({ ok: true, exigeMotivo: true });
  });

  it('recusa ordem finalizada', () => {
    expect(
      cancelamento.permite(
        pedido({ status: 'finalizada', manutencaoAdministrar: true, motivo: 'tarde' }),
      ),
    ).toEqual({ ok: false, mensagem: 'Ordem finalizada não cancela.' });
  });

  it('recusa recebida para quem só edita a manutenção ou só solicita', () => {
    expect(cancelamento.permite(pedido({ status: 'recebida', manutencaoEditar: true }))).toEqual({
      ok: false,
      mensagem: 'Só quem administra cancela ordem recebida.',
    });
    expect(cancelamento.permite(pedido({ status: 'recebida', solicitacaoEditar: true }))).toEqual({
      ok: false,
      mensagem: 'Solicitante só cancela corretiva aberta.',
    });
  });

  it('recusa quem não tem permissão e ordem já cancelada', () => {
    expect(cancelamento.permite(pedido())).toEqual({
      ok: false,
      mensagem: 'Sem permissão para cancelar.',
    });
    expect(cancelamento.permite(pedido({ status: 'cancelada', manutencaoEditar: true }))).toEqual({
      ok: false,
      mensagem: 'Ordem cancelada não cancela.',
    });
  });
});
