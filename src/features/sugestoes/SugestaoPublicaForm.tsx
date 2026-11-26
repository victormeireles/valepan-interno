'use client';

import { useState } from 'react';
import { SugestaoTemaCatalogo } from '@/domain/sugestoes/sugestao-tema-catalogo';
import { SUGESTAO_MENSAGENS } from '@/domain/sugestoes/sugestao-mensagens';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';

const temas = new SugestaoTemaCatalogo().opcoes();

export function SugestaoPublicaForm() {
  const [cpf, setCpf] = useState('');
  const [nome, setNome] = useState('');
  const [token, setToken] = useState('');
  const [tema, setTema] = useState('');
  const [texto, setTexto] = useState('');
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [mensagem, setMensagem] = useState('');
  const [enviada, setEnviada] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  async function identificar() {
    setOcupado(true);
    setMensagem('');
    try {
      const resposta = await fetch('/api/public/sugestoes/identificar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpf }),
      });
      const corpo = await resposta.json() as { nome?: string; token?: string; mensagem?: string };
      if (resposta.ok && corpo.nome && corpo.token) {
        setNome(corpo.nome);
        setToken(corpo.token);
        return;
      }
      setMensagem(corpo.mensagem ?? SUGESTAO_MENSAGENS.falhaConsulta);
    } catch {
      setMensagem(SUGESTAO_MENSAGENS.falhaConsulta);
    } finally {
      setOcupado(false);
    }
  }

  function naoSouEu() {
    setNome('');
    setToken('');
    setMensagem('');
  }

  async function enviar() {
    setOcupado(true);
    setMensagem('');
    const form = new FormData();
    form.set('token', token);
    form.set('tema', tema);
    form.set('texto', texto);
    if (arquivo) form.set('foto', arquivo);
    try {
      const resposta = await fetch('/api/public/sugestoes', { method: 'POST', body: form });
      const corpo = await resposta.json() as { mensagem?: string };
      if (resposta.status === 401) {
        naoSouEu();
        setMensagem(corpo.mensagem ?? SUGESTAO_MENSAGENS.identificacaoExpirou);
        return;
      }
      if (!resposta.ok) {
        setMensagem(corpo.mensagem ?? SUGESTAO_MENSAGENS.falhaEnvio);
        return;
      }
      setEnviada(true);
    } catch {
      setMensagem(SUGESTAO_MENSAGENS.falhaEnvio);
    } finally {
      setOcupado(false);
    }
  }

  function outra() {
    setToken('');
    setNome('');
    setTema('');
    setTexto('');
    setArquivo(null);
    setEnviada(false);
    setMensagem('');
  }

  return (
    <Card className="mx-auto w-full max-w-md" padding="lg">
      <h1 className="text-2xl font-bold tracking-tight text-text-strong">Sugestão de melhoria</h1>
      {enviada ? <Enviada onOutra={outra} /> : null}
      {!enviada && !token ? <Cpf cpf={cpf} ocupado={ocupado} onCpf={setCpf} onSeguir={identificar} /> : null}
      {!enviada && token ? (
        <Envio
          nome={nome}
          tema={tema}
          texto={texto}
          ocupado={ocupado}
          onTema={setTema}
          onTexto={setTexto}
          onArquivo={setArquivo}
          onEnviar={enviar}
          onNaoSouEu={naoSouEu}
        />
      ) : null}
      {mensagem ? <p className="mt-4 text-sm text-red-700">{mensagem}</p> : null}
    </Card>
  );
}

function Enviada({ onOutra }: { onOutra: () => void }) {
  return (
    <div className="mt-6">
      <p className="text-sm text-text-strong">{SUGESTAO_MENSAGENS.enviada}</p>
      <Button className="mt-4" size="lg" type="button" onClick={onOutra}>Enviar outra</Button>
    </div>
  );
}

function Cpf(props: { cpf: string; ocupado: boolean; onCpf: (v: string) => void; onSeguir: () => void }) {
  return (
    <form className="mt-6 flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); props.onSeguir(); }}>
      <Input label="CPF" inputMode="numeric" value={props.cpf} onChange={(e) => props.onCpf(e.target.value)} />
      <Button size="lg" type="submit" disabled={props.ocupado}>Continuar</Button>
    </form>
  );
}

function Envio(props: {
  nome: string; tema: string; texto: string; ocupado: boolean;
  onTema: (v: string) => void; onTexto: (v: string) => void;
  onArquivo: (f: File | null) => void; onEnviar: () => void; onNaoSouEu: () => void;
}) {
  return (
    <form className="mt-6 flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); props.onEnviar(); }}>
      <p className="text-sm text-text-strong">Você é {props.nome}?</p>
      <Button size="lg" type="button" variant="secondary" onClick={props.onNaoSouEu}>Não sou esta pessoa</Button>
      <label className="text-sm font-medium text-stone-700">
        Tema
        <select className="mt-1.5 min-h-11 w-full rounded-xl border border-border-default px-3" value={props.tema} onChange={(e) => props.onTema(e.target.value)}>
          <option value="">Escolha o tema</option>
          {temas.map((item) => <option key={item.valor} value={item.valor}>{item.rotulo}</option>)}
        </select>
      </label>
      <label className="text-sm font-medium text-stone-700">
        Sugestão
        <textarea className="mt-1.5 min-h-28 w-full rounded-xl border border-border-default px-3 py-2" value={props.texto} onChange={(e) => props.onTexto(e.target.value)} />
      </label>
      <label className="text-sm font-medium text-stone-700">
        Foto
        <input className="mt-1.5 block min-h-11 w-full" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => props.onArquivo(e.target.files?.[0] ?? null)} />
      </label>
      <Button size="lg" type="submit" disabled={props.ocupado}>Enviar</Button>
    </form>
  );
}
