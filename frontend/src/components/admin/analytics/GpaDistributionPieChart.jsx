import React from 'react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
} from 'recharts';
import EmptyState from '../EmptyState';
import { BarChart2 } from 'lucide-react';

const SEGMENTS = [
  { key: 'high',   label: 'High GPA (≥3.5)',      color: '#22c55e' },
  { key: 'medium', label: 'Medium GPA (2.0–3.49)', color: '#f59e0b' },
  { key: 'low',    label: 'Low GPA (<2.0)',         color: '#ef4444' },
];

export { SEGMENTS };

export default function GpaDistributionPieChart({ data = {} }) {
  const chartData = SEGMENTS.map((s) => ({ name: s.label, value: data[s.key] ?? 0, color: s.color }));
  const total = chartData.reduce((sum, d) => sum + d.value, 0);

  if (total === 0) {
    return <EmptyState icon={BarChart2} message="No GPA data available." />;
  }

  return (
    <div data-testid="gpa-pie-chart">
      <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="45%"
          outerRadius={90}
          label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
          labelLine={false}
        >
          {chartData.map((entry) => (
            <Cell key={entry.name} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
          formatter={(v, name) => [v, name]}
        />
        <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: '12px' }} />
      </PieChart>
    </ResponsiveContainer>
    </div>
  );
}
