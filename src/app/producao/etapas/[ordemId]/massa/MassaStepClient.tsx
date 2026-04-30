'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  createMassaLote,
  updateMassaLote,
  getMassaLotesByOrder,
  ensureMassaStepLog,
  ensureMassaStepLogForNewLote,
  appendFotoToMassaStepLog,
} from '@/app/actions/producao-massa-actions';
import {
  getReceitasMassaByProduto,
  getMasseiras,
} from '@/app/actions/producao-etapas-actions';
import { getReceitaDetalhes } from '@/app/actions/receitas-actions';
import { getInsumosByIds } from '@/app/actions/insumos-actions';
import { getQuantityByStation } from '@/lib/utils/production-conversions';
import { filaUrlForProductionStep } from '@/lib/production/production-station-routes';
import { MassaLote } from '@/domain/types/producao-massa';
import {
  formatNumberWithThousands,
  formatIntegerWithThousands,
  formatReceitasBatidasDisplay,
  parseReceitasBatidasInput,
} from '@/lib/utils/number-utils';
import ProductionStepLayout from '@/components/Producao/ProductionStepLayout';
import ProductionFormActions from '@/components/Producao/ProductionFormActions';
import ProductionErrorAlert from '@/components/Producao/ProductionErrorAlert';
import PhotoUploader from '@/components/PhotoUploader';
import Accordion from '@/components/Accordion';
import {
  H_STEPPER_SHELL,
  H_STEPPER_BTN_LEFT,
  H_STEPPER_BTN_RIGHT,
  H_STEPPER_BTN_COMPACT_LEFT,
  H_STEPPER_BTN_COMPACT_RIGHT,
  H_STEPPER_MIDDLE,
  H_STEPPER_INPUT,
  FORM_SECTION_TITLE,
  FORM_FIELD_LABEL,
  PRODUCTION_STEP_DENSE_SHELL,
} from '@/components/Producao/production-step-form-classes';

interface MassaStepClientProps {
  ordemProducao: {
    id: string;
    lote_codigo: string;
    qtd_planejada: number;
    produto: {
      id: string;
      nome: string;
      unidadeNomeResumido: string | null; // nome_resumido da tabela unidades
      unidades_assadeira?: number | null;
      box_units?: number | null;
      receita_massa?: {
        quantidade_por_produto: number;
      } | null;
    };
  };
  initialLoteId?: string;
  embedded?: boolean;
  /** Só em modo embutido (modal): atualiza o título da barra superior externa. */
  onEmbeddedMainTitleChange?: (title: string) => void;
  onRequestClose?: () => void;
  onSaved?: () => void;
}

interface Masseira {
  id: string;
  nome: string;
  tempo_mistura_lenta_padrao: number | null;
  tempo_mistura_rapida_padrao: number | null;
}

interface IngredienteForm {
  id: string;
  insumo_id: string | null;
  ingrediente_nome: string;
  quantidade_padrao: number;
  quantidade_usada: number;
  unidade: string;
}

/** PostgREST pode devolver `insumos` como objeto ou array de uma linha. */
function nomeFromEmbeddedInsumos(insumos: unknown): string | null {
  if (insumos == null) return null;
  if (Array.isArray(insumos)) {
    const first = insumos[0];
    if (first && typeof first === 'object' && 'nome' in first) {
      const n = (first as { nome?: unknown }).nome;
      return typeof n === 'string' && n.trim() ? n.trim() : null;
    }
    return null;
  }
  if (typeof insumos === 'object' && 'nome' in insumos) {
    const n = (insumos as { nome?: unknown }).nome;
    return typeof n === 'string' && n.trim() ? n.trim() : null;
  }
  return null;
}

function insumoKey(id: string | null | undefined): string | null {
  if (!id || typeof id !== 'string') return null;
  const t = id.trim();
  return t ? t.toLowerCase() : null;
}

/** Minutos decimais (ex. cadastro / BD) → minutos inteiros para o formulário. */
function decimalMinutosParaInteiro(decimal: number): number {
  if (!Number.isFinite(decimal) || decimal <= 0) return 0;
  return Math.max(0, Math.round(decimal));
}

/** Campo decimal pt-BR no celular: vírgula, no máx. `maxFrac` casas após o separador. */
function sanitizeDecimalCampo(raw: string, maxFrac: number): string {
  const withComma = raw.replace(/\./g, ',');
  let out = '';
  let sep = false;
  let frac = 0;
  for (const c of withComma) {
    if (c === ',') {
      if (sep) break;
      sep = true;
      out += ',';
      continue;
    }
    if (c < '0' || c > '9') continue;
    if (sep) {
      if (frac >= maxFrac) break;
      frac += 1;
    }
    out += c;
  }
  return out;
}

function parseDecimalCampoPtBr(raw: string): number | null {
  const t = raw.trim().replace(',', '.');
  if (t === '' || t === '.') return null;
  const n = parseFloat(t);
  return Number.isNaN(n) ? null : n;
}

function numberToDecimalCampoPtBr(n: number, maxFrac: number): string {
  if (!Number.isFinite(n) || n < 0) return '';
  return n.toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxFrac,
    useGrouping: false,
  });
}

const DEFAULT_TEMPERATURA_CAMPO = '25';
const DEFAULT_TEMPERATURA_NUM = 25;
const TEMPERATURA_STEP_FINE = 0.1;
const PH_CAMPO_STEP_FINE = 0.1;
/** pH opcional: formulário novo começa vazio. */
const PH_CAMPO_VAZIO = '';
const TEMPO_MISTURA_MAX = 999;

const RECEITAS_BATIDAS_MIN = 0.5;
const RECEITAS_BATIDAS_STEP_FINE = 0.5;

/** Incrementa/decrementa receitas batidas em passos de 0,5; 0 = campo vazio; mínimo válido ao gravar 0,5. */
function bumpReceitasBatidasValor(base: number, delta: number): number {
  const next = base + delta;
  const snapped = Math.round(next * 2) / 2;
  if (snapped <= 0) return 0;
  return Math.max(RECEITAS_BATIDAS_MIN, snapped);
}

function bumpTemperaturaCampo(current: string, delta: number): string {
  const parsed = parseDecimalCampoPtBr(current);
  const base = parsed ?? DEFAULT_TEMPERATURA_NUM;
  const next = Math.round((base + delta) * 10) / 10;
  const clamped = Math.min(50, Math.max(0, next));
  return numberToDecimalCampoPtBr(clamped, 1);
}

function bumpPhCampo(current: string, delta: number): string {
  const parsed = parseDecimalCampoPtBr(current);
  const base = parsed ?? 0;
  const next = Math.round((base + delta) * 100) / 100;
  const clamped = Math.min(14, Math.max(0, next));
  if (clamped === 0) return PH_CAMPO_VAZIO;
  return numberToDecimalCampoPtBr(clamped, 2);
}

function bumpTempoMin(value: number, delta: number): number {
  const n = Math.floor(Number(value)) + delta;
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(TEMPO_MISTURA_MAX, n));
}

/** id da masseira chamada "1" / "Masseira 1" no cadastro (novo 1º lote). */
function findMasseira1Id(masseiras: { id: string; nome: string }[]): string | null {
  const norm = (s: string) => s.trim().toLowerCase();
  const byExact = masseiras.find((m) => {
    const n = norm(m.nome);
    return n === 'masseira 1' || n === 'masseira1' || n === '1';
  });
  if (byExact) return byExact.id;
  const byPrefix = masseiras.find((m) => /^masseira\s*1(?:\s|$)/i.test(m.nome.trim()));
  return byPrefix?.id ?? null;
}

export default function MassaStepClient({
  ordemProducao,
  initialLoteId,
  embedded = false,
  onEmbeddedMainTitleChange,
  onRequestClose,
  onSaved,
}: MassaStepClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lotes, setLotes] = useState<MassaLote[]>([]);
  const [showForm, setShowForm] = useState(!!initialLoteId);
  const [editingLoteId, setEditingLoteId] = useState<string | null>(initialLoteId || null);

  // Estados do formulário
  const [receitaId, setReceitaId] = useState<string>('');
  const [receitas, setReceitas] = useState<Array<{ id: string; nome: string; codigo: string }>>([]);
  const [ingredientes, setIngredientes] = useState<IngredienteForm[]>([]);
  const [masseiraId, setMasseiraId] = useState<string>('');
  const [masseiras, setMasseiras] = useState<Masseira[]>([]);
  const [receitasBatidas, setReceitasBatidas] = useState<number>(0);
  /** Texto do campo (vírgula como decimal pt-BR); vazio até o operador informar */
  const [receitasBatidasField, setReceitasBatidasField] = useState<string>('');
  const [tempoLentaMin, setTempoLentaMin] = useState<number>(0);
  const [tempoRapidaMin, setTempoRapidaMin] = useState<number>(0);
  /** Temperatura — texto para teclado decimal no celular e vírgula pt-BR */
  const [temperaturaInput, setTemperaturaInput] = useState<string>(DEFAULT_TEMPERATURA_CAMPO);
  /** pH opcional — texto para permitir vírgula */
  const [phMassa, setPhMassa] = useState<string>(PH_CAMPO_VAZIO);
  const [texturaOk, setTexturaOk] = useState(false);
  const [etapasLogId, setEtapasLogId] = useState<string>('');
  /** Após salvar um lote novo, pergunta se quer outro do mesmo produto antes de ir à fila */
  const [perguntaOutroLoteAposCriar, setPerguntaOutroLoteAposCriar] = useState(false);
  const [outroLoteEscolhaLoading, setOutroLoteEscolhaLoading] = useState(false);
  /** Nova foto selecionada; enviada após salvar. Obrigatório se o lote ainda não tiver foto no servidor. */
  const [lotePhotoFile, setLotePhotoFile] = useState<File | null>(null);
  /** Reinicia o PhotoUploader ao cancelar / após envio. */
  const [photoUploaderKey, setPhotoUploaderKey] = useState(0);
  const errorAlertRef = useRef<HTMLDivElement>(null);
  /** Evita sobrescrever ingredientes vindos do último lote (template) quando receitaId dispara o efeito */
  const skipIngredientReloadFromReceitaRef = useRef(false);
  /** Evita rescalar ingredientes por receitasBatidas logo após copiar quantidades do último lote */
  const skipReceitasBatidasIngredientScaleRef = useRef(false);
  const temperaturaInputRef = useRef<HTMLInputElement>(null);
  const phMassaInputRef = useRef<HTMLInputElement>(null);

  /** Inputs numéricos alteram o valor com a roda do mouse; impede isso na temperatura. */
  useEffect(() => {
    if (!showForm) return;
    const el = temperaturaInputRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => e.preventDefault();
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [showForm]);

  useEffect(() => {
    if (!showForm) return;
    const el = phMassaInputRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => e.preventDefault();
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [showForm]);

  /** Sem masseira escolhida: pré-seleciona "Masseira 1" (novo lote, template ou edição sem ID). */
  useEffect(() => {
    if (!showForm || masseiras.length === 0 || masseiraId) return;
    const idM1 = findMasseira1Id(masseiras);
    if (idM1) setMasseiraId(idM1);
  }, [showForm, masseiras, masseiraId]);

  // Função para formatar valor para exibição ao lado do input
  const formatarValorLateral = (valor: number, unidade: string): string | null => {
    if (valor <= 0) return null;
    
    const unidadeLower = unidade.toLowerCase().trim();
    const isKg = unidadeLower === 'kg' || unidadeLower === 'kilograma' || unidadeLower === 'kilogramas';
    
    // Se for kg e valor < 1, mostrar em gramas
    if (isKg && valor < 1) {
      return `${Math.round(valor * 1000)}g`;
    }
    
    // Caso contrário, formatar com a unidade
    // Remove espaços e formata: 13 L → 13L, 5 kg → 5kg
    const unidadeFormatada = unidade.replace(/\s+/g, '');
    return `${valor}${unidadeFormatada}`;
  };

  // Função para calcular gramas (usado no padrão)
  const calcularGramas = (valor: number, unidade: string): number | null => {
    const unidadeLower = unidade.toLowerCase().trim();
    if ((unidadeLower === 'kg' || unidadeLower === 'kilograma' || unidadeLower === 'kilogramas') && valor > 0 && valor < 1) {
      return Math.round(valor * 1000);
    }
    return null;
  };

  // Função para carregar dados do lote para edição (ou como modelo para novo lote)
  const loadLoteForEdit = useCallback(async (lote: MassaLote, opts?: { asTemplate?: boolean }) => {
    if (opts?.asTemplate) {
      skipIngredientReloadFromReceitaRef.current = true;
      skipReceitasBatidasIngredientScaleRef.current = true;
      setEditingLoteId(null);
    } else {
      setEditingLoteId(lote.id);
    }
    setReceitaId(lote.receita_id);
    setMasseiraId(lote.masseira_id || '');
    if (opts?.asTemplate) {
      setReceitasBatidas(0);
      setReceitasBatidasField('');
    } else {
      setReceitasBatidas(lote.receitas_batidas);
      setReceitasBatidasField(formatReceitasBatidasDisplay(lote.receitas_batidas));
    }
    setTemperaturaInput(
      lote.temperatura_final != null &&
        !Number.isNaN(lote.temperatura_final) &&
        lote.temperatura_final > 0
        ? numberToDecimalCampoPtBr(lote.temperatura_final, 1)
        : DEFAULT_TEMPERATURA_CAMPO,
    );
    if (opts?.asTemplate) {
      setTexturaOk(false);
    } else {
      setTexturaOk(lote.textura === 'ok');
    }
    if (lote.tempo_lenta != null && !Number.isNaN(lote.tempo_lenta)) {
      setTempoLentaMin(decimalMinutosParaInteiro(lote.tempo_lenta));
    } else {
      setTempoLentaMin(0);
    }
    if (lote.tempo_rapida != null && !Number.isNaN(lote.tempo_rapida)) {
      setTempoRapidaMin(decimalMinutosParaInteiro(lote.tempo_rapida));
    } else {
      setTempoRapidaMin(0);
    }
    if (lote.ph_massa != null && !Number.isNaN(lote.ph_massa)) {
      setPhMassa(
        String(lote.ph_massa).includes('.')
          ? String(lote.ph_massa).replace('.', ',')
          : String(lote.ph_massa),
      );
    } else {
      setPhMassa(PH_CAMPO_VAZIO);
    }

    // Nomes vêm direto de `insumos` (join da receita costuma falhar silenciosamente no embed).
    if (lote.ingredientes && lote.ingredientes.length > 0) {
      const ids = lote.ingredientes
        .map((i) => i.insumo_id)
        .filter((id): id is string => typeof id === 'string' && id.trim().length > 0);
      const rows = ids.length > 0 ? await getInsumosByIds(ids) : [];
      const byId = new Map(rows.map((r) => [r.id.toLowerCase(), r] as const));
      const ingredientesForm: IngredienteForm[] = lote.ingredientes.map((ing) => {
        const key = insumoKey(ing.insumo_id);
        const row = key ? byId.get(key) : undefined;
        return {
          id: ing.id,
          insumo_id: ing.insumo_id,
          ingrediente_nome: row?.nome?.trim() || 'Ingrediente sem nome',
          quantidade_padrao: ing.quantidade_padrao,
          quantidade_usada: ing.quantidade_usada,
          unidade:
            ing.unidade ||
            row?.unidades?.nome_resumido ||
            row?.unidades?.nome ||
            'un',
        };
      });
      setIngredientes(ingredientesForm);
    }

    setShowForm(true);
  }, []);

  // Carregar dados iniciais
  useEffect(() => {
    const loadData = async () => {
      // Buscar lotes existentes primeiro (define se é 1º lote ou próximo)
      const lotesResult = await getMassaLotesByOrder(ordemProducao.id);
      const lotesData = lotesResult.success && lotesResult.data ? lotesResult.data : [];
      setLotes(lotesData);

      let logResult:
        | Awaited<ReturnType<typeof ensureMassaStepLog>>
        | Awaited<ReturnType<typeof ensureMassaStepLogForNewLote>>
        | undefined;

      if (initialLoteId) {
        logResult = await ensureMassaStepLog(ordemProducao.id);
      } else if (lotesData.length > 0) {
        // Já existe lote salvo: formulário para próximo lote — não criar log na BD até gravar dados válidos
        setShowForm(true);
        const sorted = [...lotesData].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
        const ultimo = sorted[0];
        if (ultimo) {
          await loadLoteForEdit(ultimo, { asTemplate: true });
        }
      } else {
        logResult = await ensureMassaStepLog(ordemProducao.id);
        setShowForm(true);
      }

      if (logResult && logResult.success && logResult.data) {
        setEtapasLogId(logResult.data.id);
      }

      if (initialLoteId) {
        const loteToEdit = lotesData.find((l) => l.id === initialLoteId);
        if (loteToEdit) {
          await loadLoteForEdit(loteToEdit);
        } else {
          setShowForm(true);
        }
      }

      if (!lotesResult.success || !lotesResult.data) {
        setShowForm(true);
      }

      // Buscar receitas de massa vinculadas ao produto
      const receitasResult = await getReceitasMassaByProduto(ordemProducao.produto.id);
      if (receitasResult.success && receitasResult.data) {
        const receitasMapeadas = receitasResult.data
          .filter((r) => r != null)
          .map((r) => ({
            id: r.id,
            nome: r.nome,
            codigo: r.codigo || '',
          }));
        setReceitas(receitasMapeadas);
        // Só pré-seleciona receita única no 1º lote; edição/template já definem receitaId
        if (receitasMapeadas.length === 1 && !initialLoteId && lotesData.length === 0) {
          setReceitaId(receitasMapeadas[0].id);
        }
      }

      // Buscar masseiras
      const masseirasResult = await getMasseiras();
      if (masseirasResult.success && masseirasResult.data) {
        const lista = masseirasResult.data;
        setMasseiras(lista);
      }
    };

    loadData();
  }, [ordemProducao.id, ordemProducao.produto.id, initialLoteId, loadLoteForEdit]);

  // Carregar ingredientes quando receita for selecionada
  useEffect(() => {
    if (!receitaId) {
      setIngredientes([]);
      return;
    }
    if (skipIngredientReloadFromReceitaRef.current) {
      skipIngredientReloadFromReceitaRef.current = false;
      return;
    }

    const loadIngredientes = async () => {
      const result = await getReceitaDetalhes(receitaId);
      if (result && result.receita_ingredientes) {
        const base: IngredienteForm[] = result.receita_ingredientes
          .filter((ing) => ing !== null && ing !== undefined && ing.insumo_id !== null)
          .map((ing) => {
            const quantidadeCalculada = ing.quantidade_padrao * receitasBatidas;
            const quantidadeArredondada = Math.round(quantidadeCalculada * 1000) / 1000;
            const nomeEmbed =
              nomeFromEmbeddedInsumos((ing as { insumos?: unknown }).insumos) ||
              (ing as { insumos?: { nome?: string } | null }).insumos?.nome?.trim() ||
              null;
            const unidadeEmbed =
              (ing as { insumos?: { unidades?: { nome_resumido?: string; nome?: string } } | null })
                .insumos?.unidades?.nome_resumido ||
              (ing as { insumos?: { unidades?: { nome_resumido?: string; nome?: string } } | null })
                .insumos?.unidades?.nome ||
              'un';
            return {
              id: ing.id,
              insumo_id: ing.insumo_id!,
              ingrediente_nome: nomeEmbed || 'Ingrediente sem nome',
              quantidade_padrao: ing.quantidade_padrao,
              quantidade_usada: quantidadeArredondada,
              unidade: unidadeEmbed,
            };
          });

        const ids = base.map((i) => i.insumo_id).filter((id): id is string => Boolean(id));
        const rows = ids.length > 0 ? await getInsumosByIds(ids) : [];
        const byId = new Map(rows.map((r) => [r.id.toLowerCase(), r] as const));
        const ingredientesForm = base.map((item) => {
          const key = insumoKey(item.insumo_id);
          const row = key ? byId.get(key) : undefined;
          return {
            ...item,
            ingrediente_nome: row?.nome?.trim() || item.ingrediente_nome,
            unidade:
              item.unidade && item.unidade !== 'un'
                ? item.unidade
                : row?.unidades?.nome_resumido || row?.unidades?.nome || item.unidade,
          };
        });
        setIngredientes(ingredientesForm);
      }
    };

    loadIngredientes();
  }, [receitaId, receitasBatidas]);

  // Atualizar quantidades quando receitas batidas mudar
  useEffect(() => {
    if (skipReceitasBatidasIngredientScaleRef.current) {
      skipReceitasBatidasIngredientScaleRef.current = false;
      return;
    }
    if (receitasBatidas > 0 && ingredientes.length > 0) {
      setIngredientes((prev) =>
        prev.map((ing) => {
          const quantidadeCalculada = ing.quantidade_padrao * receitasBatidas;
          // Arredonda para 3 casas decimais
          const quantidadeArredondada = Math.round(quantidadeCalculada * 1000) / 1000;
          return {
            ...ing,
            quantidade_usada: quantidadeArredondada,
          };
        }),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receitasBatidas]);

  // Atualizar tempos quando masseira for selecionada (min + seg a partir do decimal padrão)
  useEffect(() => {
    if (!masseiraId) return;

    const masseira = masseiras.find((m) => m.id === masseiraId);
    if (masseira) {
      if (masseira.tempo_mistura_lenta_padrao != null) {
        setTempoLentaMin(decimalMinutosParaInteiro(masseira.tempo_mistura_lenta_padrao));
      }
      if (masseira.tempo_mistura_rapida_padrao != null) {
        setTempoRapidaMin(decimalMinutosParaInteiro(masseira.tempo_mistura_rapida_padrao));
      }
    }
  }, [masseiraId, masseiras]);

  useEffect(() => {
    if (!embedded || !onEmbeddedMainTitleChange) return;
    if (!showForm) {
      onEmbeddedMainTitleChange('Registro de massa');
      return;
    }
    onEmbeddedMainTitleChange(
      editingLoteId ? 'Editar Lote de Massa' : 'Novo Lote de Massa',
    );
  }, [embedded, showForm, editingLoteId, onEmbeddedMainTitleChange]);

  // Atualizar quantidade usada de um ingrediente
  const updateIngredienteQuantidade = (ingredienteId: string, quantidade: number) => {
    setIngredientes((prev) =>
      prev.map((ing) =>
        ing.id === ingredienteId ? { ...ing, quantidade_usada: quantidade } : ing,
      ),
    );
  };

  // Calcular produção estimada (assadeiras e unidades)
  const calcularProducaoEstimada = () => {
    if (!ordemProducao.produto.receita_massa) return null;
    
    const unidadesTotais = receitasBatidas * ordemProducao.produto.receita_massa.quantidade_por_produto;
    const unidadesArredondadas = Math.round(unidadesTotais);
    
    const partes: string[] = [];
    
    // Calcular assadeiras se disponível
    if (ordemProducao.produto.unidades_assadeira && ordemProducao.produto.unidades_assadeira > 0) {
      const assadeiras = unidadesTotais / ordemProducao.produto.unidades_assadeira;
      const unidadesPorAssadeira = ordemProducao.produto.unidades_assadeira;
      partes.push(`${formatNumberWithThousands(assadeiras, { minimumFractionDigits: 0, maximumFractionDigits: 1 })} LT c/ ${formatIntegerWithThousands(unidadesPorAssadeira)}`);
    }
    
    // Adicionar unidades arredondadas
    partes.push(`${formatIntegerWithThousands(unidadesArredondadas)} un`);
    
    return partes.join(' / ');
  };

  // Calcular receitas já batidas
  const receitasJaBatidas = lotes.reduce((sum, lote) => sum + lote.receitas_batidas, 0);

  const quantityInfo = getQuantityByStation('massa', ordemProducao.qtd_planejada, {
    unidadeNomeResumido: ordemProducao.produto.unidadeNomeResumido,
    unidades_assadeira: ordemProducao.produto.unidades_assadeira || null,
    box_units: ordemProducao.produto.box_units || null,
    receita_massa: ordemProducao.produto.receita_massa,
  });

  const receitasNecessarias = quantityInfo.receitas?.value || 0;
  const receitasRestantes = Math.max(0, receitasNecessarias - receitasJaBatidas);
  const pctReceitasOp =
    receitasNecessarias > 0
      ? Math.min(100, Math.max(0, (receitasJaBatidas / receitasNecessarias) * 100))
      : 0;

  // Função para cancelar edição/criação
  const cancelForm = () => {
    setShowForm(false);
    setEditingLoteId(null);
    setError(null);
    setReceitaId('');
    setIngredientes([]);
    setMasseiraId('');
    setReceitasBatidas(0);
    setReceitasBatidasField('');
    setTempoLentaMin(0);
    setTempoRapidaMin(0);
    setTemperaturaInput(DEFAULT_TEMPERATURA_CAMPO);
    setTexturaOk(false);
    setPhMassa(PH_CAMPO_VAZIO);
    setLotePhotoFile(null);
    setPhotoUploaderKey((k) => k + 1);
  };

  /** Abre o formulário de novo lote com os mesmos dados do último lote (ex.: após cancelar) */
  const startNewLoteFromList = async (): Promise<boolean> => {
    setError(null);
    /** Log de etapa só é criado ao gravar um lote válido — evita stub vazio na base. */
    setEtapasLogId('');
    const sorted = [...lotes].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    if (sorted[0]) {
      await loadLoteForEdit(sorted[0], { asTemplate: true });
    }
    setShowForm(true);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

      try {
      const receitasParaSalvar =
        parseReceitasBatidasInput(receitasBatidasField.trim()) ?? receitasBatidas;
      if (receitasParaSalvar < 0.5 || Number.isNaN(receitasParaSalvar)) {
        throw new Error('Informe a quantidade de receitas (mínimo 0,5), usando vírgula para decimais.');
      }

      if (!editingLoteId && (!receitaId || !String(receitaId).trim())) {
        throw new Error('Selecione a receita de massa.');
      }

      const temperaturaMedida = parseDecimalCampoPtBr(temperaturaInput);
      if (temperaturaMedida === null) {
        throw new Error('Informe a temperatura da massa ao sair da masseira (°C).');
      }
      if (temperaturaMedida < 0 || temperaturaMedida > 50) {
        throw new Error('Temperatura fora do intervalo aceito (0 a 50 °C).');
      }

      const phTrim = phMassa.trim();
      let phParsed: number | null = null;
      if (phTrim !== '') {
        const n = parseDecimalCampoPtBr(phTrim);
        if (n === null || n < 0 || n > 14) {
          throw new Error('pH inválido. Use um valor entre 0 e 14 (ex.: 5,5).');
        }
        phParsed = Math.round(n * 100) / 100;
      }

      const ingredientesData = ingredientes.map((ing) => ({
        insumo_id: ing.insumo_id || '',
        quantidade_padrao: ing.quantidade_padrao,
        quantidade_usada: ing.quantidade_usada,
        unidade: ing.unidade,
      }));

      if (!editingLoteId && ingredientesData.length === 0) {
        throw new Error('Não há ingredientes da receita para registrar. Verifique a receita selecionada.');
      }

      const loteSendoEditado = editingLoteId
        ? lotes.find((l) => l.id === editingLoteId)
        : undefined;
      const loteJaTemFotoNoServidor = (loteSendoEditado?.fotos?.length ?? 0) > 0;
      if (!lotePhotoFile && !loteJaTemFotoNoServidor) {
        throw new Error('Anexe uma foto da etapa massa (obrigatório).');
      }

      setReceitasBatidas(receitasParaSalvar);
      setReceitasBatidasField(formatReceitasBatidasDisplay(receitasParaSalvar));

      let logId = etapasLogId;
      if (editingLoteId) {
        if (!etapasLogId) {
          const logResult = await ensureMassaStepLog(ordemProducao.id);
          if (!logResult.success || !logResult.data) {
            throw new Error(
              logResult.error || 'Erro ao criar log de etapa. Por favor, recarregue a página e tente novamente.',
            );
          }
          logId = logResult.data.id;
          setEtapasLogId(logId);
        }
      } else {
        const logResult = await ensureMassaStepLogForNewLote(ordemProducao.id);
        if (!logResult.success || !logResult.data) {
          throw new Error(
            logResult.error ||
              'Erro ao preparar log de etapa para novo lote. Recarregue a página e tente novamente.',
          );
        }
        logId = logResult.data.id;
        setEtapasLogId(logId);
      }

      let result;
      if (editingLoteId) {
        // Atualiza o lote existente
        result = await updateMassaLote(editingLoteId, {
          receitas_batidas: receitasParaSalvar,
          temperatura_final: temperaturaMedida,
          textura: texturaOk ? 'ok' : 'rasga',
          tempo_lenta: Math.max(0, Math.floor(tempoLentaMin)),
          tempo_rapida: Math.max(0, Math.floor(tempoRapidaMin)),
          ph_massa: phParsed,
          ingredientes: ingredientesData,
        });
      } else {
        // Cria novo lote
        result = await createMassaLote({
          producao_etapas_log_id: logId,
          receita_id: receitaId,
          masseira_id: masseiraId || null,
          receitas_batidas: receitasParaSalvar,
          temperatura_final: temperaturaMedida,
          textura: texturaOk ? 'ok' : 'rasga',
          tempo_lenta: Math.max(0, Math.floor(tempoLentaMin)),
          tempo_rapida: Math.max(0, Math.floor(tempoRapidaMin)),
          ph_massa: phParsed,
          ingredientes: ingredientesData,
        });
      }

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Erro ao salvar lote');
      }

      const savedLote = result.data;
      const targetLogId = savedLote.id;

      let fotoWarning: string | null = null;
      if (lotePhotoFile) {
        try {
          const fd = new FormData();
          fd.append('photo', lotePhotoFile);
          fd.append('etapa', 'massa');
          fd.append('ordemProducaoId', ordemProducao.id);
          const res = await fetch('/api/upload/producao-photo', { method: 'POST', body: fd });
          const raw: { error?: string; photoUrl?: string } = await res.json();
          if (!res.ok) {
            throw new Error(typeof raw?.error === 'string' ? raw.error : 'Erro no upload da foto');
          }
          const photoUrl = raw.photoUrl;
          if (!photoUrl) {
            throw new Error('Resposta do servidor sem URL da foto');
          }
          const appendRes = await appendFotoToMassaStepLog(targetLogId, photoUrl);
          if (!appendRes.success) {
            throw new Error(appendRes.error || 'Erro ao vincular foto ao lote');
          }
        } catch (fe) {
          fotoWarning = fe instanceof Error ? fe.message : 'Foto não enviada';
        }
      }

      // Recarrega lotes
      const lotesResult = await getMassaLotesByOrder(ordemProducao.id);
      if (lotesResult.success && lotesResult.data) {
        setLotes(lotesResult.data);
      }

      // Limpa formulário
      cancelForm();

      if (fotoWarning) {
        setError(
          `Lote salvo, mas a foto obrigatória não foi anexada: ${fotoWarning} Edite o lote e envie novamente.`,
        );
      }

      if (editingLoteId) {
        router.refresh();
        onSaved?.();
        if (onRequestClose) {
          onRequestClose();
        } else {
          router.push(filaUrlForProductionStep('massa'));
        }
      } else {
        router.refresh();
        onSaved?.();
        setPerguntaOutroLoteAposCriar(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar');
      // Scroll para o erro após um pequeno delay para garantir que o DOM foi atualizado
      setTimeout(() => {
        errorAlertRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      }, 100);
    } finally {
      setLoading(false);
    }
  };

  const temperaturaMedidaVisual = parseDecimalCampoPtBr(temperaturaInput);

  const receitasBatidasValorAtual = (): number => {
    const parsed = parseReceitasBatidasInput(receitasBatidasField.trim());
    if (parsed !== null && !Number.isNaN(parsed) && parsed >= 0) return parsed;
    if (receitasBatidas >= 0) return receitasBatidas;
    return 0;
  };

  const aplicarDeltaReceitasBatidas = (delta: number) => {
    const next = bumpReceitasBatidasValor(receitasBatidasValorAtual(), delta);
    setReceitasBatidas(next);
    setReceitasBatidasField(formatReceitasBatidasDisplay(next));
  };

  const loteEmEdicao = editingLoteId ? lotes.find((l) => l.id === editingLoteId) : undefined;
  const loteJaTemFotoPersistida = (loteEmEdicao?.fotos?.length ?? 0) > 0;
  const fotoEtapaRequisitoOk = Boolean(lotePhotoFile) || loteJaTemFotoPersistida;

  return (
    <ProductionStepLayout
      etapaNome="Massa"
      loteCodigo={ordemProducao.lote_codigo}
      produtoNome={ordemProducao.produto.nome}
      showLoteProdutoSubtitle={false}
      omitHeader={embedded}
      backHref={embedded ? undefined : filaUrlForProductionStep('massa')}
      denseHeader
      {...(embedded
        ? {
            outerClassName: 'p-0',
            contentClassName: 'space-y-3 p-3 sm:space-y-4 sm:p-4',
          }
        : PRODUCTION_STEP_DENSE_SHELL)}
    >
      {quantityInfo.receitas && receitasNecessarias > 0 && (
        <div className="rounded-lg border border-slate-200 bg-slate-50/90 px-3 py-2 space-y-1.5 sm:rounded-xl sm:px-4 sm:py-3 sm:space-y-2">
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-slate-900 sm:text-sm">
                {ordemProducao.produto.nome}
              </p>
            </div>
            <p
              className={`shrink-0 text-right text-xs font-semibold tabular-nums sm:text-sm ${
                receitasRestantes > 0 ? 'text-slate-900' : 'text-emerald-700'
              }`}
            >
              {formatNumberWithThousands(receitasJaBatidas, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 1,
              })}{' '}
              de{' '}
              {formatNumberWithThousands(receitasNecessarias, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 1,
              })}{' '}
              receitas
            </p>
          </div>
          <div
            className="h-2 w-full rounded-full bg-slate-200 overflow-hidden sm:h-2.5"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(pctReceitasOp)}
            aria-valuetext={`${formatNumberWithThousands(receitasJaBatidas, {
              minimumFractionDigits: 0,
              maximumFractionDigits: 1,
            })} de ${formatNumberWithThousands(receitasNecessarias, {
              minimumFractionDigits: 0,
              maximumFractionDigits: 1,
            })} receitas`}
            aria-label="Progresso em receitas batidas na ordem"
          >
            <div
              className={`h-full rounded-full transition-all ${
                receitasRestantes === 0 ? 'bg-emerald-500' : 'bg-slate-600'
              }`}
              style={{ width: `${pctReceitasOp}%` }}
            />
          </div>
        </div>
      )}

      {/* Formulário para novo lote ou edição */}
      {showForm && (
            <div
              className={`border-t border-gray-200 ${embedded ? 'pt-2 sm:pt-3' : 'pt-3 sm:pt-5'}`}
            >
              {!embedded && (
                <h3 className="mb-3 text-lg font-bold leading-tight text-gray-900 sm:mb-4 sm:text-xl">
                  {editingLoteId ? 'Editar Lote de Massa' : 'Novo Lote de Massa'}
                </h3>
              )}

              <div ref={errorAlertRef}>
                <ProductionErrorAlert error={error} />
              </div>

              <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                {/* Quantidade de receitas batidas */}
                <div className="space-y-2 rounded-lg border border-gray-100 bg-white p-3 shadow-sm sm:rounded-xl sm:p-4">
                  <div>
                    <label htmlFor="receitas-batidas" className={FORM_SECTION_TITLE}>
                      Quantidade de receitas batidas
                    </label>
                    <span id="receitas-batidas-hint" className="sr-only">
                      Mínimo {RECEITAS_BATIDAS_MIN.toLocaleString('pt-BR')} receita. Os botões mais e menos
                      alteram de {RECEITAS_BATIDAS_STEP_FINE.toLocaleString('pt-BR')} em{' '}
                      {RECEITAS_BATIDAS_STEP_FINE.toLocaleString('pt-BR')} receita; você também pode digitar
                      livremente no campo.
                    </span>
                  </div>
                  <div
                    className={H_STEPPER_SHELL}
                    role="group"
                    aria-label="Ajustar quantidade de receitas batidas"
                  >
                    <button
                      type="button"
                      aria-label={`Diminuir ${RECEITAS_BATIDAS_STEP_FINE.toLocaleString('pt-BR')} receita`}
                      disabled={receitasBatidasValorAtual() <= 0}
                      onClick={() => aplicarDeltaReceitasBatidas(-RECEITAS_BATIDAS_STEP_FINE)}
                      className={H_STEPPER_BTN_LEFT}
                    >
                      −
                    </button>
                    <div className={H_STEPPER_MIDDLE}>
                      <input
                        id="receitas-batidas"
                        type="text"
                        name="receitas-batidas"
                        inputMode="decimal"
                        autoComplete="off"
                        aria-describedby="receitas-batidas-hint"
                        value={receitasBatidasField}
                        onChange={(e) => {
                          const raw = e.target.value;
                          if (raw.trim() === '') {
                            setReceitasBatidasField('');
                            setReceitasBatidas(0);
                            return;
                          }
                          setReceitasBatidasField(raw);
                          const parsed = parseReceitasBatidasInput(raw);
                          if (parsed !== null && !Number.isNaN(parsed) && parsed >= 0) {
                            setReceitasBatidas(parsed);
                          }
                        }}
                        onBlur={() => {
                          setReceitasBatidasField(formatReceitasBatidasDisplay(receitasBatidas));
                        }}
                        placeholder="0,5"
                        className={`${H_STEPPER_INPUT} px-12 sm:px-14`}
                      />
                      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-gray-500 sm:right-3 sm:text-xs">
                        receitas
                      </span>
                    </div>
                    <button
                      type="button"
                      aria-label={`Aumentar ${RECEITAS_BATIDAS_STEP_FINE.toLocaleString('pt-BR')} receita`}
                      onClick={() => aplicarDeltaReceitasBatidas(RECEITAS_BATIDAS_STEP_FINE)}
                      className={H_STEPPER_BTN_RIGHT}
                    >
                      +
                    </button>
                  </div>
                  {receitasBatidas > 0 && calcularProducaoEstimada() && (
                    <p className="text-xs text-gray-600 sm:text-sm">
                      Estimado: <strong>{calcularProducaoEstimada()}</strong>
                    </p>
                  )}
                </div>

                {/* Seleção de Receita - apenas para novo lote */}
                {!editingLoteId && (
                  <div className="space-y-1.5">
                    <label className={FORM_FIELD_LABEL}>Receita</label>
                    <div className="relative">
                      <select
                        value={receitaId}
                        onChange={(e) => setReceitaId(e.target.value)}
                        required
                        className="w-full rounded-lg border-2 border-gray-100 bg-gray-50 px-2.5 py-2 text-xs font-medium text-gray-900 transition-all appearance-none cursor-pointer focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/10 sm:px-3 sm:py-2.5 sm:text-sm"
                      >
                        <option value="">Selecione uma receita</option>
                        {receitas.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.codigo} - {r.nome}
                          </option>
                        ))}
                      </select>
                      <span className="material-icons absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                        expand_more
                      </span>
                    </div>
                  </div>
                )}

                {/* Seleção de Masseira - apenas para novo lote */}
                {!editingLoteId && (
                  <div className="space-y-1.5">
                    <label className={FORM_FIELD_LABEL}>Masseira</label>
                    <div className="relative">
                      <select
                        value={masseiraId}
                        onChange={(e) => setMasseiraId(e.target.value)}
                        required
                        className="w-full rounded-lg border-2 border-gray-100 bg-gray-50 px-2.5 py-2 text-xs font-medium text-gray-900 transition-all appearance-none cursor-pointer focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/10 sm:px-3 sm:py-2.5 sm:text-sm"
                      >
                        <option value="">Selecione uma masseira</option>
                        {masseiras.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.nome}
                          </option>
                        ))}
                      </select>
                      <span className="material-icons absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                        expand_more
                      </span>
                    </div>
                  </div>
                )}

                <span className="sr-only">
                  {!editingLoteId && !masseiraId
                    ? 'Selecione a masseira para editar os tempos de mistura sugeridos.'
                    : 'Tempos de mistura em minutos.'}
                </span>
                <div
                  className={`grid grid-cols-2 gap-2 sm:gap-4 ${!editingLoteId && !masseiraId ? 'opacity-60 pointer-events-none' : ''}`}
                  aria-disabled={!editingLoteId && !masseiraId ? true : undefined}
                  title={
                    !editingLoteId && !masseiraId ? 'Selecione a masseira para editar os tempos' : undefined
                  }
                >
                  <div className="min-w-0 space-y-2 rounded-lg border border-gray-100 bg-white p-2.5 shadow-sm sm:rounded-xl sm:p-4">
                    <label htmlFor="tempo-mistura-lenta" className={FORM_SECTION_TITLE}>
                      Lenta (min)
                    </label>
                    <div className={H_STEPPER_SHELL} role="group" aria-label="Tempo mistura lenta em minutos">
                      <button
                        type="button"
                        aria-label="Diminuir 1 minuto (lenta)"
                        disabled={(!editingLoteId && !masseiraId) || tempoLentaMin <= 0}
                        onClick={() => setTempoLentaMin((v) => bumpTempoMin(v, -1))}
                        className={H_STEPPER_BTN_COMPACT_LEFT}
                      >
                        −
                      </button>
                      <div className={H_STEPPER_MIDDLE}>
                        <input
                          id="tempo-mistura-lenta"
                          type="text"
                          name="tempo-mistura-lenta"
                          inputMode="numeric"
                          autoComplete="off"
                          value={tempoLentaMin > 0 ? String(tempoLentaMin) : ''}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/\D/g, '');
                            if (raw === '') {
                              setTempoLentaMin(0);
                              return;
                            }
                            const n = parseInt(raw, 10);
                            setTempoLentaMin(
                              Number.isNaN(n) ? 0 : Math.min(TEMPO_MISTURA_MAX, Math.max(0, n)),
                            );
                          }}
                          disabled={!editingLoteId && !masseiraId}
                          className={`${H_STEPPER_INPUT} pr-9 sm:pr-10`}
                        />
                        <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-gray-500 sm:right-3 sm:text-xs">
                          min
                        </span>
                      </div>
                      <button
                        type="button"
                        aria-label="Aumentar 1 minuto (lenta)"
                        disabled={(!editingLoteId && !masseiraId) || tempoLentaMin >= TEMPO_MISTURA_MAX}
                        onClick={() => setTempoLentaMin((v) => bumpTempoMin(v, 1))}
                        className={H_STEPPER_BTN_COMPACT_RIGHT}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="min-w-0 space-y-2 rounded-lg border border-gray-100 bg-white p-2.5 shadow-sm sm:rounded-xl sm:p-4">
                    <label htmlFor="tempo-mistura-rapida" className={FORM_SECTION_TITLE}>
                      Rápida (min)
                    </label>
                    <div className={H_STEPPER_SHELL} role="group" aria-label="Tempo mistura rápida em minutos">
                      <button
                        type="button"
                        aria-label="Diminuir 1 minuto (rápida)"
                        disabled={(!editingLoteId && !masseiraId) || tempoRapidaMin <= 0}
                        onClick={() => setTempoRapidaMin((v) => bumpTempoMin(v, -1))}
                        className={H_STEPPER_BTN_COMPACT_LEFT}
                      >
                        −
                      </button>
                      <div className={H_STEPPER_MIDDLE}>
                        <input
                          id="tempo-mistura-rapida"
                          type="text"
                          name="tempo-mistura-rapida"
                          inputMode="numeric"
                          autoComplete="off"
                          value={tempoRapidaMin > 0 ? String(tempoRapidaMin) : ''}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/\D/g, '');
                            if (raw === '') {
                              setTempoRapidaMin(0);
                              return;
                            }
                            const n = parseInt(raw, 10);
                            setTempoRapidaMin(
                              Number.isNaN(n) ? 0 : Math.min(TEMPO_MISTURA_MAX, Math.max(0, n)),
                            );
                          }}
                          disabled={!editingLoteId && !masseiraId}
                          className={`${H_STEPPER_INPUT} pr-9 sm:pr-10`}
                        />
                        <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-gray-500 sm:right-3 sm:text-xs">
                          min
                        </span>
                      </div>
                      <button
                        type="button"
                        aria-label="Aumentar 1 minuto (rápida)"
                        disabled={(!editingLoteId && !masseiraId) || tempoRapidaMin >= TEMPO_MISTURA_MAX}
                        onClick={() => setTempoRapidaMin((v) => bumpTempoMin(v, 1))}
                        className={H_STEPPER_BTN_COMPACT_RIGHT}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* Temperatura e pH — duas colunas em todas as larguras */}
                <div className="grid grid-cols-2 gap-2 sm:gap-4">
                  <div className="min-w-0 space-y-2 rounded-lg border border-gray-100 bg-white p-2.5 shadow-sm sm:rounded-xl sm:p-4">
                    <div>
                      <label htmlFor="temperatura-massa" className={FORM_SECTION_TITLE}>
                        Temperatura da massa
                      </label>
                      <span id="temperatura-massa-hint" className="sr-only">
                        Saída da masseira em graus Celsius. Ideal entre 26 e 28. Padrão {DEFAULT_TEMPERATURA_CAMPO}{' '}
                        graus. Os botões mais e menos alteram {TEMPERATURA_STEP_FINE.toLocaleString('pt-BR')} °C por
                        toque; você também pode digitar no campo.
                      </span>
                    </div>
                    <div
                      className={H_STEPPER_SHELL}
                      role="group"
                      aria-label="Ajustar temperatura da massa em graus Celsius"
                    >
                      <button
                        type="button"
                        aria-label={`Diminuir temperatura ${TEMPERATURA_STEP_FINE.toLocaleString('pt-BR')} °C`}
                        disabled={
                          (parseDecimalCampoPtBr(temperaturaInput) ?? DEFAULT_TEMPERATURA_NUM) <= 0
                        }
                        onClick={() =>
                          setTemperaturaInput((p) => bumpTemperaturaCampo(p, -TEMPERATURA_STEP_FINE))
                        }
                        className={H_STEPPER_BTN_COMPACT_LEFT}
                      >
                        −
                      </button>
                      <div className={H_STEPPER_MIDDLE}>
                        <input
                          id="temperatura-massa"
                          ref={temperaturaInputRef}
                          type="text"
                          name="temperatura-massa"
                          inputMode="decimal"
                          enterKeyHint="next"
                          autoComplete="off"
                          autoCorrect="off"
                          spellCheck={false}
                          aria-describedby="temperatura-massa-hint"
                          aria-required="true"
                          value={temperaturaInput}
                          onChange={(e) => setTemperaturaInput(sanitizeDecimalCampo(e.target.value, 1))}
                          placeholder="Ex.: 25,5"
                          className={`${H_STEPPER_INPUT} pr-8 sm:pr-10`}
                        />
                        <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-gray-500 sm:right-3 sm:text-xs">
                          °C
                        </span>
                      </div>
                      <button
                        type="button"
                        aria-label={`Aumentar temperatura ${TEMPERATURA_STEP_FINE.toLocaleString('pt-BR')} °C`}
                        disabled={
                          (parseDecimalCampoPtBr(temperaturaInput) ?? DEFAULT_TEMPERATURA_NUM) >= 50
                        }
                        onClick={() =>
                          setTemperaturaInput((p) => bumpTemperaturaCampo(p, TEMPERATURA_STEP_FINE))
                        }
                        className={H_STEPPER_BTN_COMPACT_RIGHT}
                      >
                        +
                      </button>
                    </div>
                    {temperaturaMedidaVisual != null &&
                      temperaturaMedidaVisual > 0 &&
                      (temperaturaMedidaVisual < 26 || temperaturaMedidaVisual > 28) && (
                        <p className="flex items-start gap-0.5 text-[10px] font-medium leading-tight text-amber-800 sm:text-sm sm:items-center sm:gap-1">
                          <span className="material-icons shrink-0 text-sm sm:text-base">warning</span>
                          <span>Fora de 26–28 °C</span>
                        </p>
                      )}
                  </div>

                  <div className="min-w-0 space-y-2 rounded-lg border border-gray-100 bg-white p-2.5 shadow-sm sm:rounded-xl sm:p-4">
                    <div>
                      <label htmlFor="ph-massa" className={FORM_SECTION_TITLE}>
                        pH <span className="text-xs font-medium text-gray-500 sm:text-sm">(opcional)</span>
                      </label>
                      <span id="ph-massa-hint" className="sr-only">
                        Opcional. Deixe vazio se não medir. Os botões mais e menos alteram{' '}
                        {PH_CAMPO_STEP_FINE.toLocaleString('pt-BR')} por toque; você também pode digitar no campo.
                      </span>
                    </div>
                    <div className={H_STEPPER_SHELL} role="group" aria-label="Ajustar pH da massa">
                      <button
                        type="button"
                        aria-label={`Diminuir pH ${PH_CAMPO_STEP_FINE.toLocaleString('pt-BR')}`}
                        disabled={(parseDecimalCampoPtBr(phMassa) ?? 0) <= 0}
                        onClick={() => setPhMassa((p) => bumpPhCampo(p, -PH_CAMPO_STEP_FINE))}
                        className={H_STEPPER_BTN_COMPACT_LEFT}
                      >
                        −
                      </button>
                      <div className={H_STEPPER_MIDDLE}>
                        <input
                          id="ph-massa"
                          ref={phMassaInputRef}
                          type="text"
                          name="ph-massa"
                          inputMode="decimal"
                          enterKeyHint="next"
                          autoComplete="off"
                          autoCorrect="off"
                          spellCheck={false}
                          aria-describedby="ph-massa-hint"
                          value={phMassa}
                          onChange={(e) => setPhMassa(sanitizeDecimalCampo(e.target.value, 2))}
                          placeholder="Ex.: 5,4"
                          className={`${H_STEPPER_INPUT} pr-8 sm:pr-10`}
                        />
                        <span className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-gray-500 sm:right-3 sm:text-xs">
                          pH
                        </span>
                      </div>
                      <button
                        type="button"
                        aria-label={`Aumentar pH ${PH_CAMPO_STEP_FINE.toLocaleString('pt-BR')}`}
                        disabled={(parseDecimalCampoPtBr(phMassa) ?? 0) >= 14}
                        onClick={() => setPhMassa((p) => bumpPhCampo(p, PH_CAMPO_STEP_FINE))}
                        className={H_STEPPER_BTN_COMPACT_RIGHT}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* Textura */}
                <div className="space-y-1.5">
                  <p className={FORM_SECTION_TITLE}>Textura</p>
                  <div className="rounded-lg border-2 border-gray-100 bg-gray-50 px-3 py-2 sm:px-4 sm:py-2.5">
                    <label className="flex cursor-pointer items-center gap-2 sm:gap-3">
                      <input
                        type="checkbox"
                        checked={texturaOk}
                        onChange={(e) => setTexturaOk(e.target.checked)}
                        required
                        aria-label="Textura OK: mole, estica, não rasga"
                        className="h-5 w-5 shrink-0 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0"
                      />
                      <span className="text-sm font-semibold text-gray-900 sm:text-base">Macio</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-2 rounded-lg border border-gray-100 bg-gray-50/80 p-3 sm:p-4">
                  <p className={FORM_SECTION_TITLE}>
                    Foto{' '}
                    <span className="text-xs font-semibold text-red-600 sm:text-sm" aria-hidden="true">
                      *
                    </span>
                    <span className="sr-only">obrigatório</span>
                  </p>
                  {loteJaTemFotoPersistida && !lotePhotoFile && (
                    <p className="text-xs text-gray-600 sm:text-sm">
                      Este lote já possui foto registrada. Envie outra apenas se quiser substituir ou complementar.
                    </p>
                  )}
                  <span className="sr-only">
                    Obrigatório para novo lote; em edição, obrigatório se ainda não houver foto no sistema. Câmera ou
                    arquivo. Enviada ao salvar o lote.
                  </span>
                  <PhotoUploader
                    key={photoUploaderKey}
                    loading={loading}
                    disabled={loading}
                    onPhotoSelect={(file) => setLotePhotoFile(file)}
                    onPhotoRemove={() => setLotePhotoFile(null)}
                  />
                </div>

                {/* Ingredientes (referência / ajuste fino) — por último */}
                {ingredientes.length > 0 && (
                  <Accordion title="Ingredientes" defaultOpen={false}>
                    <div className="space-y-2 sm:space-y-3">
                      {ingredientes.map((ing) => (
                        <div
                          key={ing.id}
                          className="rounded-lg border-2 border-gray-200 bg-white px-3 py-2 sm:rounded-xl sm:px-4 sm:py-3"
                        >
                          <div className="mb-1.5 flex items-center justify-between sm:mb-2">
                            <span className="text-xs font-medium text-gray-900 sm:text-sm">
                              {ing.ingrediente_nome}
                            </span>
                            <span className="text-xs text-gray-500">
                              Padrão:{' '}
                              {(() => {
                                const gramas = calcularGramas(ing.quantidade_padrao, ing.unidade);
                                if (gramas !== null) {
                                  return (
                                    <>
                                      {ing.quantidade_padrao}{ing.unidade} / <span className="text-blue-600 font-medium">{gramas}g</span>
                                    </>
                                  );
                                }
                                return `${ing.quantidade_padrao} ${ing.unidade}`;
                              })()}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="relative group flex-1">
                              <input
                                type="number"
                                min="0"
                                step="0.001"
                                value={ing.quantidade_usada || ''}
                                onChange={(e) =>
                                  updateIngredienteQuantidade(ing.id, parseFloat(e.target.value) || 0)
                                }
                                className="w-full rounded-lg border-2 border-gray-200 bg-white px-3 py-2 pr-14 text-xs font-medium text-gray-900 transition-all focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 sm:px-4 sm:py-2.5 sm:pr-16 sm:text-sm md:text-base [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400 pointer-events-none sm:text-sm">
                                {ing.unidade}
                              </span>
                            </div>
                            {(() => {
                              const valorFormatado = formatarValorLateral(ing.quantidade_usada, ing.unidade);
                              return valorFormatado ? (
                                <span className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium whitespace-nowrap flex-shrink-0">
                                  {valorFormatado}
                                </span>
                              ) : null;
                            })()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </Accordion>
                )}

                 <ProductionFormActions
                   onCancel={cancelForm}
                   submitLabel="Salvar Lote"
                   cancelLabel="Cancelar"
                   loading={loading}
                   disabled={
                     !texturaOk ||
                     !fotoEtapaRequisitoOk ||
                     (!editingLoteId && (!receitaId || !masseiraId))
                   }
                   compact
                 />
              </form>
            </div>
          )}

      {/* Quando o formulário está fechado: novo lote (com cópia do último) ou voltar */}
      {!showForm && (
        <div className="space-y-1.5 pt-1.5 sm:space-y-2 sm:pt-3">
          {error && !perguntaOutroLoteAposCriar && (
            <div ref={errorAlertRef}>
              <ProductionErrorAlert error={error} />
            </div>
          )}
          {lotes.length > 0 && (
            <button
              type="button"
              onClick={() => void startNewLoteFromList()}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-gray-900 px-3 py-2 text-xs font-semibold text-white shadow-md shadow-gray-900/20 transition-all hover:bg-black sm:px-5 sm:py-2.5 sm:text-sm"
            >
              <span className="material-icons text-base">add</span>
              Novo lote
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              if (onRequestClose) {
                onRequestClose();
              } else {
                router.back();
              }
            }}
            className="w-full rounded-lg border-2 border-gray-100 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition-all hover:border-gray-200 hover:bg-gray-50 sm:px-5 sm:py-2.5 sm:text-sm"
          >
            {embedded ? 'Fechar' : 'Voltar'}
          </button>
        </div>
      )}

      {perguntaOutroLoteAposCriar && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4 bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-labelledby="massa-pergunta-outro-lote-titulo"
        >
          <div className="w-full max-w-lg space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl sm:space-y-4 sm:p-5">
            <h2
              id="massa-pergunta-outro-lote-titulo"
              className="text-base font-bold leading-snug text-slate-900 sm:text-lg"
            >
              Outro lote?
            </h2>
            <p className="text-xs leading-snug text-slate-600 sm:text-sm">
              Mais um lote de <strong>{ordemProducao.produto.nome}</strong> agora ou voltar à fila?
            </p>
            {error && <ProductionErrorAlert error={error} />}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={outroLoteEscolhaLoading}
                onClick={() => {
                  setError(null);
                  setPerguntaOutroLoteAposCriar(false);
                  router.refresh();
                  onSaved?.();
                  if (onRequestClose) {
                    onRequestClose();
                  } else {
                    router.push(filaUrlForProductionStep('massa'));
                  }
                }}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-60 sm:px-4 sm:py-2.5 sm:text-base"
              >
                À fila
              </button>
              <button
                type="button"
                disabled={outroLoteEscolhaLoading}
                onClick={() => {
                  void (async () => {
                    setOutroLoteEscolhaLoading(true);
                    setError(null);
                    try {
                      const ok = await startNewLoteFromList();
                      if (ok) {
                        setPerguntaOutroLoteAposCriar(false);
                        router.refresh();
                      }
                    } finally {
                      setOutroLoteEscolhaLoading(false);
                    }
                  })();
                }}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 sm:gap-2 sm:px-4 sm:py-2.5 sm:text-base"
              >
                {outroLoteEscolhaLoading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    …
                  </>
                ) : (
                  <>
                    <span className="material-icons text-base sm:text-lg">add</span>
                    Novo lote
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </ProductionStepLayout>
  );
}
