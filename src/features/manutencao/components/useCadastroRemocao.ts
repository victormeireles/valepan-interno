'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { RemocaoCadastroEstado } from './RemocaoCadastroModal';

type Avaliacao = {
  pode: boolean;
  vinculos: string[];
  mensagem: string;
};

type Resultado = { ok: boolean; mensagem: string };

type AlvoRemocao = {
  id: string;
  rotulo: string;
};

type CadastroRemocaoConfig = {
  entidade: string;
  avaliar: (id: string) => Promise<Avaliacao>;
  remover: (id: string) => Promise<Resultado>;
  onAviso: (aviso: { texto: string; ok: boolean }) => void;
  onSucesso?: () => void;
  descricaoConfirmacao?: (rotulo: string) => string;
};

export class CadastroRemocaoFluxo {
  constructor(private readonly config: CadastroRemocaoConfig) {}

  async iniciar(alvo: AlvoRemocao): Promise<RemocaoCadastroEstado> {
    const avaliacao = await this.config.avaliar(alvo.id);
    if (!avaliacao.pode) {
      return {
        modo: 'bloqueio',
        titulo: `Não dá para remover`,
        mensagem: avaliacao.mensagem,
        vinculos: avaliacao.vinculos,
      };
    }
    return {
      modo: 'confirmacao',
      titulo: `Remover ${this.config.entidade}`,
      descricao: this.descricaoDe(alvo.rotulo),
    };
  }

  private descricaoDe(rotulo: string): string {
    if (this.config.descricaoConfirmacao) {
      return this.config.descricaoConfirmacao(rotulo);
    }
    return `Remover ${rotulo}? Esta ação não pode ser desfeita e não apaga vínculos em cascata.`;
  }
}

export function useCadastroRemocao(config: CadastroRemocaoConfig) {
  const router = useRouter();
  const [estado, setEstado] = useState<RemocaoCadastroEstado | null>(null);
  const [alvo, setAlvo] = useState<AlvoRemocao | null>(null);
  const [salvando, setSalvando] = useState(false);
  const fluxo = new CadastroRemocaoFluxo(config);

  async function pedirRemocao(proximo: AlvoRemocao) {
    setSalvando(true);
    try {
      const proximoEstado = await fluxo.iniciar(proximo);
      setAlvo(proximo);
      setEstado(proximoEstado);
    } catch {
      config.onAviso({ texto: 'Não foi possível verificar vínculos.', ok: false });
    } finally {
      setSalvando(false);
    }
  }

  function fechar() {
    if (salvando) return;
    setEstado(null);
    setAlvo(null);
  }

  async function confirmar() {
    if (!alvo || salvando) return;
    setSalvando(true);
    try {
      const resultado = await config.remover(alvo.id);
      if (!resultado.ok) {
        const avaliacao = await config.avaliar(alvo.id);
        if (!avaliacao.pode) {
          setEstado({
            modo: 'bloqueio',
            titulo: 'Não dá para remover',
            mensagem: avaliacao.mensagem,
            vinculos: avaliacao.vinculos,
          });
          return;
        }
        config.onAviso({ texto: resultado.mensagem, ok: false });
        setEstado(null);
        setAlvo(null);
        return;
      }
      config.onAviso({ texto: resultado.mensagem, ok: true });
      setEstado(null);
      setAlvo(null);
      if (config.onSucesso) config.onSucesso();
      else router.refresh();
    } catch {
      config.onAviso({ texto: 'Não foi possível remover.', ok: false });
    } finally {
      setSalvando(false);
    }
  }

  return { estado, salvando, pedirRemocao, fechar, confirmar };
}
