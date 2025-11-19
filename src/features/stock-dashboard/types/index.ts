import { EstoqueRecord } from '@/domain/types/inventario';

export interface ChartDataPoint {
  name: string;
  value: number;
  subValue?: number; // Secundário (ex: kg)
  details?: Record<string, unknown>;
}

export interface DashboardData {
  totalStockByClient: ChartDataPoint[];
  totalStockByProduct: ChartDataPoint[];
  rawData: EstoqueRecord[];
}

export type MetricType = 'caixas' | 'kg' | 'unidades' | 'pacotes';

