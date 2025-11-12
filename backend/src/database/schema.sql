-- GitHub Monitoring Database Schema

-- Tasks table: stores all GitHub issues and PRs from the project
CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  github_id VARCHAR(255) UNIQUE NOT NULL, -- e.g., "risa-labs-inc/repo#123"
  project_item_id VARCHAR(255) UNIQUE NOT NULL, -- GitHub ProjectV2Item ID
  title TEXT NOT NULL,
  number INTEGER NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('ISSUE', 'PULL_REQUEST', 'DRAFT_ISSUE')),
  state VARCHAR(50) NOT NULL CHECK (state IN ('OPEN', 'CLOSED', 'MERGED')),
  status VARCHAR(100), -- Project status column (e.g., "In Progress", "Done")
  repository VARCHAR(255),
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  due_date TIMESTAMP,
  added_to_project_at TIMESTAMP,
  last_synced_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_github_id UNIQUE (github_id)
);

-- Task assignments table: tracks who picked up which tasks
CREATE TABLE IF NOT EXISTS task_assignments (
  id SERIAL PRIMARY KEY,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  assignee VARCHAR(100) NOT NULL,
  assigned_at TIMESTAMP DEFAULT NOW(),
  unassigned_at TIMESTAMP,
  CONSTRAINT fk_task FOREIGN KEY (task_id) REFERENCES tasks(id)
);

-- Task snapshots table: historical tracking of task states
CREATE TABLE IF NOT EXISTS task_snapshots (
  id SERIAL PRIMARY KEY,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  state VARCHAR(50) NOT NULL,
  status VARCHAR(100),
  is_overdue BOOLEAN DEFAULT FALSE,
  CONSTRAINT fk_task_snapshot FOREIGN KEY (task_id) REFERENCES tasks(id)
);

-- Daily statistics table: aggregated daily metrics
CREATE TABLE IF NOT EXISTS daily_statistics (
  id SERIAL PRIMARY KEY,
  snapshot_date DATE NOT NULL UNIQUE,
  total_tasks INTEGER NOT NULL,
  open_tasks INTEGER NOT NULL,
  closed_tasks INTEGER NOT NULL,
  overdue_tasks INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_state ON tasks(state);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_repository ON tasks(repository);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_task_assignments_task_id ON task_assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_assignee ON task_assignments(assignee);
CREATE INDEX IF NOT EXISTS idx_task_snapshots_task_id ON task_snapshots(task_id);
CREATE INDEX IF NOT EXISTS idx_task_snapshots_date ON task_snapshots(snapshot_date);
CREATE INDEX IF NOT EXISTS idx_daily_statistics_date ON daily_statistics(snapshot_date);
