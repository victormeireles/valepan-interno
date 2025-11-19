'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { ChartDataPoint } from '../types';

interface Props {
  data: ChartDataPoint[];
  metricLabel: string;
  onBarClick?: (data: ChartDataPoint | null) => void;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export const ClientStockChart: React.FC<Props> = ({ data, metricLabel, onBarClick }) => {
  // Altura dinâmica: Mínimo 400px ou 40px por item
  const dynamicHeight = Math.max(400, data.length * 40);

  return (
    <div className="w-full bg-white p-4 rounded-lg shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">Estoque por Cliente</h3>
      <div className="w-full" style={{ height: dynamicHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={data}
            margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e5e7eb" />
            <XAxis 
              type="number" 
              stroke="#374151" 
              tick={{ fill: '#374151', fontSize: 10 }} 
              width={40}
            />
            <YAxis 
              dataKey="name" 
              type="category" 
              width={80}
              tick={{ fontSize: 10, fill: '#374151' }}
              stroke="#374151"
            />
            <Tooltip 
              cursor={{ fill: '#f3f4f6' }}
              contentStyle={{ 
                backgroundColor: '#ffffff',
                color: '#1f2937',
                borderRadius: '8px', 
                border: '1px solid #e5e7eb', 
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' 
              }}
              itemStyle={{ color: '#1f2937' }}
              labelStyle={{ color: '#111827', fontWeight: 'bold' }}
              formatter={(value: number) => [`${value} ${metricLabel}`, 'Quantidade']}
            />
            <Bar 
              dataKey="value" 
              radius={[0, 4, 4, 0]} 
              onClick={(data) => {
                if (data && 'payload' in data && data.payload) {
                  onBarClick?.(data.payload as ChartDataPoint);
                }
              }}
              cursor="pointer"
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={COLORS[index % COLORS.length]} 
                  className="hover:opacity-80 transition-opacity cursor-pointer"
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-gray-500 mt-2 text-center italic">
        * Clique em uma barra para filtrar os produtos deste cliente
      </p>
    </div>
  );
};

