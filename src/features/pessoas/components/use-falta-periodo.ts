'use client';

import { useEffect, useState } from 'react';
import { FaltaLancamento } from '@/domain/pessoas/falta-lancamento';

const lancamento = new FaltaLancamento();

export function useFaltaPeriodo(onDatas: (datas: string[]) => void) {
  const [inicio, setInicio] = useState('');
  const [fim, setFim] = useState('');
  const [periodo, setPeriodo] = useState(false);
  const [dias, setDias] = useState<string[]>([]);
  const [marcados, setMarcados] = useState<string[]>([]);
  const [erro, setErro] = useState('');

  useEffect(() => {
    aplicarPeriodo(periodo, inicio, fim, setDias, setMarcados, setErro);
  }, [periodo, inicio, fim]);

  useEffect(() => {
    if (!periodo) {
      onDatas(inicio ? [inicio] : []);
      return;
    }
    onDatas(erro ? [] : marcados);
  }, [periodo, inicio, marcados, erro, onDatas]);

  function alternarPeriodo(ligado: boolean) {
    setPeriodo(ligado);
    if (ligado) setFim((atual) => atual || inicio);
  }

  function alternarDia(data: string) {
    setMarcados((atual) => (
      atual.includes(data) ? atual.filter((dia) => dia !== data) : [...atual, data].sort()
    ));
  }

  return {
    inicio,
    fim,
    periodo,
    dias,
    marcados,
    erro,
    setInicio,
    setFim,
    alternarPeriodo,
    alternarDia,
    marcarTodos: () => setMarcados(dias),
  };
}

function aplicarPeriodo(
  periodo: boolean,
  inicio: string,
  fim: string,
  setDias: (dias: string[]) => void,
  setMarcados: (dias: string[]) => void,
  setErro: (erro: string) => void,
) {
  if (!periodo || !inicio || !fim) {
    setDias([]);
    setMarcados([]);
    setErro('');
    return;
  }
  try {
    const proximos = lancamento.periodo(inicio, fim);
    setDias(proximos);
    setMarcados(proximos);
    setErro('');
  } catch (error) {
    setDias([]);
    setMarcados([]);
    setErro(error instanceof Error ? error.message : 'O período da falta é inválido.');
  }
}
