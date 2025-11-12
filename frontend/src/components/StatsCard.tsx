import React from 'react';

interface StatsCardProps {
  title: string;
  value: number;
  label: string;
  type: 'total' | 'open' | 'closed' | 'overdue';
}

export const StatsCard: React.FC<StatsCardProps> = ({ title, value, label, type }) => {
  return (
    <div className={`stat-card ${type}`}>
      <h3>{title}</h3>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
};
