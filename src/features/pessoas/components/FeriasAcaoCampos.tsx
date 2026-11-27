import { Input } from '@/components/ui/Input';
import type { ColaboradorListaItem } from '@/domain/pessoas/colaborador-lista-filtro';
import { FeriasPeriodo } from '@/domain/pessoas/ferias-periodo';
import { getTodayISOInBrazilTimezone } from '@/lib/utils/date-utils';

type AcaoFerias = 'ferias' | 'alterar_ferias' | 'cancelar_ferias';

export function FeriasAcaoCampos({ pessoa, acao }: { pessoa: ColaboradorListaItem | null; acao: AcaoFerias }) {
  if (acao === 'cancelar_ferias') return <p className="text-sm text-stone-700">{textoCancelar(pessoa)}</p>;
  const emGozo = acao === 'alterar_ferias' && emGozoAgora(pessoa);
  return (
    <>
      <Input
        name="inicio"
        label="Início"
        type="date"
        required
        readOnly={emGozo}
        defaultValue={pessoa?.ferias?.inicio ?? ''}
      />
      <Input name="volta" label="Volta" type="date" required defaultValue={pessoa?.ferias?.volta ?? ''} />
      <p className="text-sm text-stone-700">A volta é o primeiro dia de trabalho.</p>
    </>
  );
}

function emGozoAgora(pessoa: ColaboradorListaItem | null): boolean {
  if (!pessoa?.ferias) return false;
  return new FeriasPeriodo().estado(pessoa.ferias, getTodayISOInBrazilTimezone()) === 'em_gozo';
}

function textoCancelar(pessoa: ColaboradorListaItem | null): string {
  if (!pessoa?.ferias) return 'Não há férias em aberto.';
  const frase = new FeriasPeriodo().frase(pessoa.ferias);
  const quando = frase.includes(' a ') ? `de ${frase}` : `em ${frase}`;
  return `Cancelar as férias de ${pessoa.nome}, ${quando}.`;
}
