import React, { useState, useMemo } from 'react';
import { Task } from '../types';

interface TasksTableProps {
  tasks: Task[];
  showOverdueOnly?: boolean;
}

export const TasksTable: React.FC<TasksTableProps> = ({ tasks, showOverdueOnly = false }) => {
  const [sortField, setSortField] = useState<keyof Task>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [filterState, setFilterState] = useState<string>('all');

  const isOverdue = (task: Task): boolean => {
    if (!task.dueDate || task.state !== 'OPEN') return false;
    return new Date(task.dueDate) < new Date();
  };

  const filteredTasks = useMemo(() => {
    let filtered = tasks;

    if (showOverdueOnly) {
      filtered = filtered.filter(isOverdue);
    }

    if (filterState !== 'all') {
      filtered = filtered.filter((task) => task.state === filterState);
    }

    return filtered;
  }, [tasks, filterState, showOverdueOnly]);

  const sortedTasks = useMemo(() => {
    return [...filteredTasks].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      // Handle null values
      if (aVal === null) return 1;
      if (bVal === null) return -1;

      // Convert dates to timestamps for comparison
      if (sortField === 'createdAt' || sortField === 'updatedAt' || sortField === 'dueDate') {
        aVal = new Date(aVal as string).getTime();
        bVal = new Date(bVal as string).getTime();
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredTasks, sortField, sortDirection]);

  const handleSort = (field: keyof Task) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString();
  };

  return (
    <div>
      {!showOverdueOnly && (
        <div className="toolbar">
          <div>
            <label style={{ marginRight: '10px' }}>Filter by state:</label>
            <select
              value={filterState}
              onChange={(e) => setFilterState(e.target.value)}
              style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid #e5e7eb' }}
            >
              <option value="all">All</option>
              <option value="OPEN">Open</option>
              <option value="CLOSED">Closed</option>
              <option value="MERGED">Merged</option>
            </select>
          </div>
          <div style={{ color: '#6b7280' }}>
            Showing {sortedTasks.length} of {tasks.length} tasks
          </div>
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th onClick={() => handleSort('title')} style={{ cursor: 'pointer' }}>
                Title {sortField === 'title' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('type')} style={{ cursor: 'pointer' }}>
                Type {sortField === 'type' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('state')} style={{ cursor: 'pointer' }}>
                State {sortField === 'state' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('status')} style={{ cursor: 'pointer' }}>
                Status {sortField === 'status' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('repository')} style={{ cursor: 'pointer' }}>
                Repository {sortField === 'repository' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th>Assignees</th>
              <th onClick={() => handleSort('dueDate')} style={{ cursor: 'pointer' }}>
                Due Date {sortField === 'dueDate' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
              <th onClick={() => handleSort('createdAt')} style={{ cursor: 'pointer' }}>
                Created {sortField === 'createdAt' && (sortDirection === 'asc' ? '↑' : '↓')}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedTasks.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                  No tasks found
                </td>
              </tr>
            ) : (
              sortedTasks.map((task) => (
                <tr key={task.id}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{task.title}</div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>#{task.number}</div>
                  </td>
                  <td>
                    <span className="badge">{task.type.replace('_', ' ')}</span>
                  </td>
                  <td>
                    <span className={`badge ${task.state.toLowerCase()}`}>
                      {task.state}
                    </span>
                  </td>
                  <td>{task.status || '-'}</td>
                  <td style={{ fontSize: '0.875rem' }}>{task.repository || '-'}</td>
                  <td>
                    {task.assignees.length > 0 ? (
                      <div style={{ fontSize: '0.875rem' }}>
                        {task.assignees.map((a, i) => (
                          <div key={i}>@{a}</div>
                        ))}
                      </div>
                    ) : (
                      <span style={{ color: '#6b7280' }}>Unassigned</span>
                    )}
                  </td>
                  <td>
                    {task.dueDate ? (
                      <span className={isOverdue(task) ? 'badge overdue' : ''}>
                        {formatDate(task.dueDate)}
                        {isOverdue(task) && ' (Overdue)'}
                      </span>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td style={{ fontSize: '0.875rem' }}>{formatDate(task.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
