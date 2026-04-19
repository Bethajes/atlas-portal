import React from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import EmptyState from '../EmptyState';
import { GraduationCap } from 'lucide-react';

export default function EnrollmentBarChart({ data = [] }) {
  if (!data.length) {
    return <EmptyState icon={GraduationCap} message="No enrollment data available." />;
  }

  return (
    <div data-testid="enrollment-bar-chart">
      <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 60 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11 }}
          angle={-35}
          textAnchor="end"
          interval={0}
        />
        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
        <Tooltip
          contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
          formatter={(v) => [v, 'Students']}
        />
        <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
    </div>
  );
}
