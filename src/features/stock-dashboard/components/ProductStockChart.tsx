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
  title?: string;
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088FE', '#00C49F'];

export const ProductStockChart: React.FC<Props> = ({ data, metricLabel, title }) => {
  // Altura dinâmica: Mínimo 400px ou 30px por item (produtos podem ser muitos)
  const dynamicHeight = Math.max(400, data.length * 30);

  return (
    <div className="w-full bg-white p-4 rounded-lg shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">
        {title || 'Estoque por Produto'}
      </h3>
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
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
             {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
            ))}
          </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

