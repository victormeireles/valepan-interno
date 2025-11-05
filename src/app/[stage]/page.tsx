import { notFound } from 'next/navigation';
import { getStageConfig, isValidStage, STAGES_CONFIG } from '@/config/stages';
import GenericStageForm from '@/components/GenericStageForm';

// Configurar rota como dinâmica
export const dynamic = 'force-dynamic';

interface StagePageProps {
  params: Promise<{ stage: string }>;
}

// Gerar parâmetros estáticos para build
export async function generateStaticParams() {
  return Object.keys(STAGES_CONFIG).map((stage) => ({
    stage,
  }));
}

export default async function StagePage({ params }: StagePageProps) {
  const { stage } = await params;

  // Validar se a etapa existe
  if (!isValidStage(stage)) {
    notFound();
  }

  const config = getStageConfig(stage);
  if (!config) {
    notFound();
  }

  return (
    <GenericStageForm
      stage={stage}
      stageName={config.name}
      stageDescription={config.description}
      fields={config.fields}
    />
  );
}

// Gerar metadados dinâmicos para cada etapa
export async function generateMetadata({ params }: StagePageProps) {
  const { stage } = await params;
  
  if (!isValidStage(stage)) {
    return {
      title: 'Etapa não encontrada',
    };
  }

  const config = getStageConfig(stage);
  if (!config) {
    return {
      title: 'Etapa não encontrada',
    };
  }

  return {
    title: `${config.name} - Sistema de Produção Valepan`,
    description: config.description,
  };
}
