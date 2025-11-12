// Frontend types matching backend API responses

export interface Task {
  id: string;
  githubId: string;
  title: string;
  number: number;
  type: 'ISSUE' | 'PULL_REQUEST' | 'DRAFT_ISSUE';
  state: 'OPEN' | 'CLOSED' | 'MERGED';
  status: string | null;
  repository: string | null;
  assignees: string[];
  createdAt: string;
  updatedAt: string;
  dueDate: string | null;
  addedToProjectAt: string | null;
}

export interface TaskStats {
  total: number;
  open: number;
  closed: number;
  overdue: number;
}

export interface StatsResponse {
  stats: TaskStats;
  breakdown: {
    byRepository: { [key: string]: number };
    byAssignee: { [key: string]: number };
    byStatus: { [key: string]: number };
  };
}

export interface TasksResponse {
  count: number;
  tasks: Task[];
}

export interface HistoricalDataPoint {
  date: string;
  totalTasks: number;
  openTasks: number;
  closedTasks: number;
  overdueTasks: number;
}

export interface HistoryResponse {
  days: number;
  data: HistoricalDataPoint[];
}

export interface PollingStatus {
  isRunning: boolean;
  isScheduled: boolean;
  cronSchedule: string;
  lastRunTime: string | null;
  lastRunStatus: 'success' | 'error' | null;
  lastRunError: string | null;
}
