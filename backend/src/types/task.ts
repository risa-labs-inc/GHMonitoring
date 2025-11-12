// Internal Task Types

export interface Task {
  id: string;
  githubId: string;
  title: string;
  number: number;
  type: 'ISSUE' | 'PULL_REQUEST' | 'DRAFT_ISSUE';
  state: 'OPEN' | 'CLOSED' | 'MERGED';
  status: string | null; // Project status field (e.g., "In Progress", "Done")
  repository: string | null;
  assignees: string[]; // Array of GitHub usernames
  createdAt: Date;
  updatedAt: Date;
  dueDate: Date | null;
  addedToProjectAt: Date | null;
}

export interface TaskStats {
  total: number;
  open: number;
  closed: number;
  overdue: number;
  overdueList: Task[];
}

export interface TaskSnapshot {
  id?: number;
  snapshotDate: Date;
  taskId: string;
  state: string;
  status: string | null;
}

export interface TaskAssignment {
  id?: number;
  taskId: string;
  assignee: string;
  assignedAt: Date;
  unassignedAt: Date | null;
}

export interface HistoricalData {
  date: string;
  totalTasks: number;
  openTasks: number;
  closedTasks: number;
  overdueTasks: number;
}
