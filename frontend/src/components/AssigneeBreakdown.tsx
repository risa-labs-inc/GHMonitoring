import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Task } from '../types';

interface AssigneeBreakdownProps {
  tasks: Task[];
}

const COLORS = [
  '#2563eb', // Blue
  '#16a34a', // Green
  '#ea580c', // Orange
  '#dc2626', // Red
  '#9333ea', // Purple
  '#0891b2', // Cyan
  '#c026d3', // Magenta
  '#65a30d', // Lime
  '#db2777', // Pink
  '#f59e0b', // Amber
];

const UNASSIGNED_COLOR = '#9ca3af'; // Gray

export const AssigneeBreakdown: React.FC<AssigneeBreakdownProps> = ({ tasks }) => {
  const data = useMemo(() => {
    // Filter only OPEN tasks
    const openTasks = tasks.filter((task) => task.state === 'OPEN');

    // Group tasks by assignee
    const assigneeMap = new Map<string, number>();

    for (const task of openTasks) {
      if (task.assignees.length === 0) {
        // Unassigned
        assigneeMap.set('Unassigned', (assigneeMap.get('Unassigned') || 0) + 1);
      } else {
        // For tasks with multiple assignees, count it for each
        for (const assignee of task.assignees) {
          assigneeMap.set(assignee, (assigneeMap.get(assignee) || 0) + 1);
        }
      }
    }

    // Convert to array and sort by count (descending)
    const chartData = Array.from(assigneeMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return chartData;
  }, [tasks]);

  const totalOpenTasks = useMemo(() => {
    return tasks.filter((task) => task.state === 'OPEN').length;
  }, [tasks]);

  if (data.length === 0) {
    return (
      <div className="card">
        <h2>Open Tasks by Assignee</h2>
        <p style={{ color: '#6b7280', textAlign: 'center', padding: '40px' }}>
          No open tasks found
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>Open Tasks by Assignee</h2>
      <div style={{ display: 'flex', alignItems: 'center', gap: '40px' }}>
        {/* Pie Chart */}
        <div style={{ flex: '0 0 400px' }}>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) =>
                  `${name}: ${(percent * 100).toFixed(0)}%`
                }
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      entry.name === 'Unassigned'
                        ? UNASSIGNED_COLOR
                        : COLORS[index % COLORS.length]
                    }
                  />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => [`${value} tasks`, 'Count']} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Stats Table */}
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: '0.875rem',
              color: '#6b7280',
              marginBottom: '12px',
            }}
          >
            Total Open Tasks: <strong>{totalOpenTasks}</strong>
          </div>
          <table style={{ width: '100%', fontSize: '0.875rem' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '8px' }}>Assignee</th>
                <th style={{ textAlign: 'right', padding: '8px' }}>Tasks</th>
                <th style={{ textAlign: 'right', padding: '8px' }}>%</th>
              </tr>
            </thead>
            <tbody>
              {data.map((entry, index) => {
                const percentage = ((entry.value / totalOpenTasks) * 100).toFixed(1);
                return (
                  <tr key={entry.name}>
                    <td style={{ padding: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div
                        style={{
                          width: '12px',
                          height: '12px',
                          borderRadius: '2px',
                          backgroundColor:
                            entry.name === 'Unassigned'
                              ? UNASSIGNED_COLOR
                              : COLORS[index % COLORS.length],
                        }}
                      />
                      {entry.name === 'Unassigned' ? (
                        <span style={{ color: '#9ca3af' }}>{entry.name}</span>
                      ) : (
                        <span>@{entry.name}</span>
                      )}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600 }}>
                      {entry.value}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right', color: '#6b7280' }}>
                      {percentage}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
