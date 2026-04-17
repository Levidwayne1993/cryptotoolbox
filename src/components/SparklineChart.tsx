'use client';

import { LineChart, Line, ResponsiveContainer } from 'recharts';

export default function SparklineChart({ data, isUp }: { data: number[]; isUp: boolean }) {
  const sampled = data.filter((_, i) => i % 4 === 0).map((price, i) => ({ i, price }));

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={sampled}>
        <Line
          type="monotone"
          dataKey="price"
          stroke={isUp ? '#10b981' : '#ef4444'}
          strokeWidth={1.5}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
