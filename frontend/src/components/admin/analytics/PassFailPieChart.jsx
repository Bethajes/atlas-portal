import React from 'react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
} from 'recharts';
import EmptyState from '../EmptyState';
import { BarChart2 } from 'lucide-react';

const COLORS = { pass: '#22c55e', fail: '#ef4444' };

export default function PassFailPieChart({ data = {} }) {
  const chartData = [
    { name: 'Pass', value: data.pass ?? 0, color: COLORS.pass },
    { name: 'Fail', value: data.fail ?? 0, color: COLORS.fail },
  ];
  const total = chartData.reduce((sum, d) => sum + d.value, 0);

  if (total === 0) {
    return <EmptyState icon={BarChart2} message="No graded enrollments yet." />;
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="45%"
          outerRadius={90}
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
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
  );
}
