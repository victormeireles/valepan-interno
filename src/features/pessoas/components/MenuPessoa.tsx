import OverflowMenu from '@/components/OverflowMenu/OverflowMenu';
import OverflowMenuItem from '@/components/OverflowMenu/OverflowMenuItem';
import type { ColaboradorListaItem } from '@/domain/pessoas/colaborador-lista-filtro';
import { RegimeTroca } from '@/domain/pessoas/regime-troca';
import type { AcaoPessoa } from './PessoasAcaoPainel';

export function MenuPessoa({
  item,
  onAcao,
  onCadastro,
  onRemuneracao,
  onExames,
  definirLider = false,
}: {
  item: ColaboradorListaItem;
  onAcao: (acao: AcaoPessoa) => void;
  onCadastro?: (item: ColaboradorListaItem) => void;
  onRemuneracao?: (item: ColaboradorListaItem) => void;
  onExames?: (item: ColaboradorListaItem) => void;
  definirLider?: boolean;
}) {
  return (
    <OverflowMenu ariaLabel={`Ações de ${item.nome}`}>
      {onCadastro ? <OverflowMenuItem icon="edit" label="Editar cadastro" onClick={() => onCadastro(item)} /> : null}
      {onRemuneracao ? <OverflowMenuItem icon="payments" label="Remuneração" onClick={() => onRemuneracao(item)} /> : null}
      {onExames && item.regime !== 'pj' ? <OverflowMenuItem icon="medical_services" label="Exames" onClick={() => onExames(item)} /> : null}
      {item.situacao === 'admissao_prevista' ? <OverflowMenuItem icon="how_to_reg" label="Contratar" onClick={() => onAcao('contratar')} /> : null}
      {item.situacao !== 'desligado' ? <OverflowMenuItem icon="swap_horiz" label="Alterar setor e turno" onClick={() => onAcao('transferir')} /> : null}
      {definirLider && item.situacao !== 'desligado' ? (
        <OverflowMenuItem
          icon="supervisor_account"
          label={item.liderSetor ? 'Remover liderança' : 'Definir como líder'}
          onClick={() => onAcao('lider')}
        />
      ) : null}
      {item.situacao === 'ativo' ? <OverflowMenuItem icon="pause_circle" label="Afastar" onClick={() => onAcao('afastar')} /> : null}
      {item.situacao === 'afastado' ? <OverflowMenuItem icon="how_to_reg" label="Voltar ao posto" onClick={() => onAcao('retomar')} /> : null}
      {item.situacao === 'admissao_prevista' ? <OverflowMenuItem icon="undo" label="Desistir da admissão" onClick={() => onAcao('desistir')} /> : null}
      {item.avisoAtivo ? <OverflowMenuItem icon="undo" label="Cancelar aviso" onClick={() => onAcao('cancelar_aviso')} /> : null}
      {new RegimeTroca().saidaPrevista(item.regime, item.situacao, item.dataDesligamento) ? (
        <OverflowMenuItem icon="undo" label="Cancelar saída" onClick={() => onAcao('cancelar_saida')} />
      ) : null}
      {item.situacao !== 'desligado' ? <OverflowMenuItem icon="person_off" label="Desligar" tone="danger" onClick={() => onAcao('desligar')} /> : null}
    </OverflowMenu>
  );
}
