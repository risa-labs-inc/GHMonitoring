import axios from 'axios';
import {
  StatsResponse,
  TasksResponse,
  HistoryResponse,
  PollingStatus,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const apiService = {
  /**
   * Get current statistics
   */
  async getStats(): Promise<StatsResponse> {
    const response = await api.get<StatsResponse>('/stats');
    return response.data;
  },

  /**
   * Get all tasks with optional filters
   */
  async getTasks(filters?: {
    state?: string;
    overdue?: boolean;
    repository?: string;
    assignee?: string;
  }): Promise<TasksResponse> {
    const params = new URLSearchParams();
    if (filters?.state) params.append('state', filters.state);
    if (filters?.overdue) params.append('overdue', 'true');
    if (filters?.repository) params.append('repository', filters.repository);
    if (filters?.assignee) params.append('assignee', filters.assignee);

    const response = await api.get<TasksResponse>(`/tasks?${params.toString()}`);
    return response.data;
  },

  /**
   * Get overdue tasks
   */
  async getOverdueTasks(): Promise<TasksResponse> {
    const response = await api.get<TasksResponse>('/tasks/overdue');
    return response.data;
  },

  /**
   * Get historical data
   */
  async getHistory(days: number = 30): Promise<HistoryResponse> {
    const response = await api.get<HistoryResponse>(`/history?days=${days}`);
    return response.data;
  },

  /**
   * Trigger manual refresh
   */
  async triggerRefresh(): Promise<{ message: string; timestamp: string }> {
    const response = await api.post('/refresh');
    return response.data;
  },

  /**
   * Get polling status
   */
  async getPollingStatus(): Promise<PollingStatus> {
    const response = await api.get<PollingStatus>('/polling/status');
    return response.data;
  },
};
