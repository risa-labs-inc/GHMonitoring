import React, { useState, useEffect } from 'react';
import { StatsCard } from './components/StatsCard';
import { TasksTable } from './components/TasksTable';
import { TrendChart } from './components/TrendChart';
import { AssigneeBreakdown } from './components/AssigneeBreakdown';
import { apiService } from './services/api';
import {
  StatsResponse,
  TasksResponse,
  HistoryResponse,
  PollingStatus,
} from './types';
import './index.css';

function App() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [tasks, setTasks] = useState<TasksResponse | null>(null);
  const [overdueTasks, setOverdueTasks] = useState<TasksResponse | null>(null);
  const [history, setHistory] = useState<HistoryResponse | null>(null);
  const [pollingStatus, setPollingStatus] = useState<PollingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = async () => {
    try {
      setError(null);
      const [statsData, tasksData, overdueData, historyData, pollingData] = await Promise.all([
        apiService.getStats(),
        apiService.getTasks(),
        apiService.getOverdueTasks(),
        apiService.getHistory(30),
        apiService.getPollingStatus(),
      ]);

      setStats(statsData);
      setTasks(tasksData);
      setOverdueTasks(overdueData);
      setHistory(historyData);
      setPollingStatus(pollingData);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await apiService.triggerRefresh();
      // Wait a bit for the backend to fetch data
      setTimeout(() => {
        fetchData();
        setRefreshing(false);
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to trigger refresh');
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="header">
        <h1>GitHub Task Monitoring - OneRISA Project</h1>
        <p>Track tasks from GitHub Projects and monitor completion status</p>
      </div>

      {error && (
        <div className="error">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Polling Status */}
      {pollingStatus && (
        <div className="card" style={{ marginBottom: '20px', fontSize: '0.875rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong>Polling Status:</strong>{' '}
              {pollingStatus.isScheduled ? (
                <span style={{ color: '#16a34a' }}>
                  Active ({pollingStatus.cronSchedule})
                </span>
              ) : (
                <span style={{ color: '#dc2626' }}>Inactive</span>
              )}
              {pollingStatus.lastRunTime && (
                <span style={{ marginLeft: '20px', color: '#6b7280' }}>
                  Last run: {new Date(pollingStatus.lastRunTime).toLocaleString()} -{' '}
                  {pollingStatus.lastRunStatus === 'success' ? '✓' : '✗'}
                </span>
              )}
            </div>
            <button
              className="btn btn-primary"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              {refreshing ? 'Refreshing...' : 'Refresh Now'}
            </button>
          </div>
        </div>
      )}

      {/* Statistics Cards */}
      {stats && (
        <div className="stats-grid">
          <StatsCard
            title="Total Tasks"
            value={stats.stats.total}
            label="All tasks in project"
            type="total"
          />
          <StatsCard
            title="Open Tasks"
            value={stats.stats.open}
            label="Currently open"
            type="open"
          />
          <StatsCard
            title="Closed Tasks"
            value={stats.stats.closed}
            label="Completed tasks"
            type="closed"
          />
          <StatsCard
            title="Overdue Tasks"
            value={stats.stats.overdue}
            label="Beyond due date"
            type="overdue"
          />
        </div>
      )}

      {/* Task Owner Breakdown */}
      {tasks && tasks.tasks.length > 0 && (
        <AssigneeBreakdown tasks={tasks.tasks} />
      )}

      {/* Trend Chart */}
      {history && history.data.length > 0 && (
        <div className="card">
          <h2>Task Trends (Last 30 Days)</h2>
          <TrendChart data={history.data} />
        </div>
      )}

      {/* Overdue Tasks */}
      {overdueTasks && overdueTasks.count > 0 && (
        <div className="card">
          <h2>⚠️ Overdue Tasks ({overdueTasks.count})</h2>
          <TasksTable tasks={overdueTasks.tasks} showOverdueOnly={true} />
        </div>
      )}

      {/* All Tasks */}
      {tasks && (
        <div className="card">
          <h2>All Tasks ({tasks.count})</h2>
          <TasksTable tasks={tasks.tasks} />
        </div>
      )}

      {lastUpdated && (
        <div className="last-updated" style={{ textAlign: 'center', marginTop: '20px' }}>
          Last updated: {lastUpdated.toLocaleString()}
        </div>
      )}
    </div>
  );
}

export default App;
