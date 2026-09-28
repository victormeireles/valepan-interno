import OverflowMenu from '@/components/OverflowMenu/OverflowMenu';
import OverflowMenuItem from '@/components/OverflowMenu/OverflowMenuItem';
import type { ColaboradorListaItem } from '@/domain/pessoas/colaborador-lista-filtro';
import type { AcaoPessoa } from './PessoasAcaoPainel';

export function MenuPessoa({
  item,
  onAcao,
  onCadastro,
  definirLider = false,
}: {
  item: ColaboradorListaItem;
  onAcao: (acao: AcaoPessoa) => void;
  onCadastro?: (item: ColaboradorListaItem) => void;
  definirLider?: boolean;
}) {
  return (
    <OverflowMenu ariaLabel={`Ações de ${item.nome}`}>
      {onCadastro ? <OverflowMenuItem icon="edit" label="Editar cadastro" onClick={() => onCadastro(item)} /> : null}
      {item.situacao === 'admissao_prevista' ? <OverflowMenuItem icon="how_to_reg" label="Contratar" onClick={() => onAcao('contratar')} /> : null}
      {item.situacao !== 'desligado' ? <OverflowMenuItem icon="swap_horiz" label="Alterar setor e turno" onClick={() => onAcao('transferir')} /> : null}
      {definirLider && item.situacao !== 'desligado' ? (
        <OverflowMenuItem
          icon="supervisor_account"
          label={item.liderSetor ? 'Remover liderança' : 'Definir como líder'}
          onClick={() => onAcao('lider')}
        />
      ) : null}
      {item.situacao === 'admissao_prevista' ? <OverflowMenuItem icon="undo" label="Desistir da admissão" onClick={() => onAcao('desistir')} /> : null}
      {item.situacao !== 'desligado' ? <OverflowMenuItem icon="person_off" label="Desligar" tone="danger" onClick={() => onAcao('desligar')} /> : null}
    </OverflowMenu>
  );
}
