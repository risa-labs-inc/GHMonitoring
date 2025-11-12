import { query, getClient } from './connection';
import { Task, TaskSnapshot, TaskAssignment, HistoricalData } from '../types/task';

/**
 * Repository for task-related database operations
 */
export class TaskRepository {
  /**
   * Upsert a task (insert or update if exists)
   */
  async upsertTask(task: Task): Promise<void> {
    const sql = `
      INSERT INTO tasks (
        github_id, project_item_id, title, number, type, state, status,
        repository, created_at, updated_at, due_date, added_to_project_at, last_synced_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
      ON CONFLICT (github_id)
      DO UPDATE SET
        title = EXCLUDED.title,
        state = EXCLUDED.state,
        status = EXCLUDED.status,
        updated_at = EXCLUDED.updated_at,
        due_date = EXCLUDED.due_date,
        last_synced_at = NOW()
    `;

    await query(sql, [
      task.githubId,
      task.id, // project_item_id
      task.title,
      task.number,
      task.type,
      task.state,
      task.status,
      task.repository,
      task.createdAt,
      task.updatedAt,
      task.dueDate,
      task.addedToProjectAt,
    ]);
  }

  /**
   * Upsert multiple tasks in a transaction
   */
  async upsertTasks(tasks: Task[]): Promise<void> {
    const client = await getClient();

    try {
      await client.query('BEGIN');

      for (const task of tasks) {
        const sql = `
          INSERT INTO tasks (
            github_id, project_item_id, title, number, type, state, status,
            repository, created_at, updated_at, due_date, added_to_project_at, last_synced_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
          ON CONFLICT (github_id)
          DO UPDATE SET
            title = EXCLUDED.title,
            state = EXCLUDED.state,
            status = EXCLUDED.status,
            updated_at = EXCLUDED.updated_at,
            due_date = EXCLUDED.due_date,
            last_synced_at = NOW()
        `;

        await client.query(sql, [
          task.githubId,
          task.id,
          task.title,
          task.number,
          task.type,
          task.state,
          task.status,
          task.repository,
          task.createdAt,
          task.updatedAt,
          task.dueDate,
          task.addedToProjectAt,
        ]);
      }

      await client.query('COMMIT');
      console.log(`✓ Upserted ${tasks.length} tasks`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error upserting tasks:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Sync task assignments
   */
  async syncTaskAssignments(githubId: string, assignees: string[]): Promise<void> {
    const client = await getClient();

    try {
      await client.query('BEGIN');

      // Get task database ID
      const taskResult = await client.query(
        'SELECT id FROM tasks WHERE github_id = $1',
        [githubId]
      );

      if (taskResult.rows.length === 0) {
        throw new Error(`Task not found: ${githubId}`);
      }

      const taskId = taskResult.rows[0].id;

      // Get current assignments
      const currentAssignmentsResult = await client.query(
        'SELECT assignee FROM task_assignments WHERE task_id = $1 AND unassigned_at IS NULL',
        [taskId]
      );

      const currentAssignees = new Set(
        currentAssignmentsResult.rows.map((r) => r.assignee)
      );

      const newAssignees = new Set(assignees);

      // Mark removed assignees as unassigned
      for (const assignee of currentAssignees) {
        if (!newAssignees.has(assignee)) {
          await client.query(
            'UPDATE task_assignments SET unassigned_at = NOW() WHERE task_id = $1 AND assignee = $2 AND unassigned_at IS NULL',
            [taskId, assignee]
          );
        }
      }

      // Add new assignees
      for (const assignee of newAssignees) {
        if (!currentAssignees.has(assignee)) {
          await client.query(
            'INSERT INTO task_assignments (task_id, assignee) VALUES ($1, $2)',
            [taskId, assignee]
          );
        }
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error syncing assignments:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get all tasks
   */
  async getAllTasks(): Promise<Task[]> {
    const sql = `
      SELECT
        project_item_id as id,
        github_id,
        title,
        number,
        type,
        state,
        status,
        repository,
        created_at,
        updated_at,
        due_date,
        added_to_project_at
      FROM tasks
      ORDER BY created_at DESC
    `;

    const result = await query(sql);

    return result.rows.map((row) => ({
      id: row.id,
      githubId: row.github_id,
      title: row.title,
      number: row.number,
      type: row.type,
      state: row.state,
      status: row.status,
      repository: row.repository,
      assignees: [], // Will be populated separately if needed
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      dueDate: row.due_date ? new Date(row.due_date) : null,
      addedToProjectAt: row.added_to_project_at
        ? new Date(row.added_to_project_at)
        : null,
    }));
  }

  /**
   * Get tasks with assignees
   */
  async getTasksWithAssignees(): Promise<Task[]> {
    const sql = `
      SELECT
        t.project_item_id as id,
        t.github_id,
        t.title,
        t.number,
        t.type,
        t.state,
        t.status,
        t.repository,
        t.created_at,
        t.updated_at,
        t.due_date,
        t.added_to_project_at,
        COALESCE(
          json_agg(ta.assignee) FILTER (WHERE ta.assignee IS NOT NULL AND ta.unassigned_at IS NULL),
          '[]'
        ) as assignees
      FROM tasks t
      LEFT JOIN task_assignments ta ON t.id = ta.task_id AND ta.unassigned_at IS NULL
      GROUP BY t.id, t.github_id, t.project_item_id, t.title, t.number, t.type, t.state,
               t.status, t.repository, t.created_at, t.updated_at, t.due_date, t.added_to_project_at
      ORDER BY t.created_at DESC
    `;

    const result = await query(sql);

    return result.rows.map((row) => ({
      id: row.id,
      githubId: row.github_id,
      title: row.title,
      number: row.number,
      type: row.type,
      state: row.state,
      status: row.status,
      repository: row.repository,
      assignees: Array.isArray(row.assignees) ? row.assignees : [],
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      dueDate: row.due_date ? new Date(row.due_date) : null,
      addedToProjectAt: row.added_to_project_at
        ? new Date(row.added_to_project_at)
        : null,
    }));
  }

  /**
   * Create a snapshot of all tasks
   */
  async createSnapshot(): Promise<void> {
    const sql = `
      INSERT INTO task_snapshots (task_id, state, status, is_overdue)
      SELECT
        id,
        state,
        status,
        (due_date < NOW() AND state = 'OPEN') as is_overdue
      FROM tasks
      ON CONFLICT DO NOTHING
    `;

    await query(sql);
    console.log('✓ Task snapshot created');
  }

  /**
   * Save daily statistics
   */
  async saveDailyStatistics(
    total: number,
    open: number,
    closed: number,
    overdue: number
  ): Promise<void> {
    const sql = `
      INSERT INTO daily_statistics (snapshot_date, total_tasks, open_tasks, closed_tasks, overdue_tasks)
      VALUES (CURRENT_DATE, $1, $2, $3, $4)
      ON CONFLICT (snapshot_date)
      DO UPDATE SET
        total_tasks = EXCLUDED.total_tasks,
        open_tasks = EXCLUDED.open_tasks,
        closed_tasks = EXCLUDED.closed_tasks,
        overdue_tasks = EXCLUDED.overdue_tasks,
        created_at = NOW()
    `;

    await query(sql, [total, open, closed, overdue]);
    console.log('✓ Daily statistics saved');
  }

  /**
   * Get historical data for charts
   */
  async getHistoricalData(days: number = 30): Promise<HistoricalData[]> {
    const sql = `
      SELECT
        snapshot_date::text as date,
        total_tasks,
        open_tasks,
        closed_tasks,
        overdue_tasks
      FROM daily_statistics
      WHERE snapshot_date >= CURRENT_DATE - make_interval(days => $1::int)
      ORDER BY snapshot_date ASC
    `;

    const result = await query(sql, [days]);

    return result.rows.map((row) => ({
      date: row.date,
      totalTasks: row.total_tasks,
      openTasks: row.open_tasks,
      closedTasks: row.closed_tasks,
      overdueTasks: row.overdue_tasks,
    }));
  }
}
