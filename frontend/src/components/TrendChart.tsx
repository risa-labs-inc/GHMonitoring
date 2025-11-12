import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { HistoricalDataPoint } from '../types';

interface TrendChartProps {
  data: HistoricalDataPoint[];
}

export const TrendChart: React.FC<TrendChartProps> = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 12 }}
          tickFormatter={(value) => {
            const date = new Date(value);
            return `${date.getMonth() + 1}/${date.getDate()}`;
          }}
        />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip
          labelFormatter={(value) => {
            const date = new Date(value);
            return date.toLocaleDateString();
          }}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="totalTasks"
          stroke="#2563eb"
          name="Total"
          strokeWidth={2}
        />
        <Line
          type="monotone"
          dataKey="openTasks"
          stroke="#ea580c"
          name="Open"
          strokeWidth={2}
        />
        <Line
          type="monotone"
          dataKey="closedTasks"
          stroke="#16a34a"
          name="Closed"
          strokeWidth={2}
        />
        <Line
          type="monotone"
          dataKey="overdueTasks"
          stroke="#dc2626"
          name="Overdue"
          strokeWidth={2}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};
