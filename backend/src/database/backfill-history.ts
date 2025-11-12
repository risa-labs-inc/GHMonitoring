import { getPool, closePool, testConnection } from './connection';
import { TaskRepository } from './task-repository';

/**
 * Backfill historical data for the last 30 days
 * Creates synthetic historical snapshots based on current data
 */
async function backfillHistory() {
  console.log('Starting historical data backfill...\n');

  // Test connection first
  const connected = await testConnection();
  if (!connected) {
    console.error('Failed to connect to database. Exiting.');
    process.exit(1);
  }

  try {
    const taskRepo = new TaskRepository();
    const pool = getPool();

    // Get current statistics
    const tasks = await taskRepo.getTasksWithAssignees();
    console.log(`Found ${tasks.length} total tasks`);

    const currentStats = {
      total: tasks.length,
      open: tasks.filter((t) => t.state === 'OPEN').length,
      closed: tasks.filter((t) => t.state === 'CLOSED' || t.state === 'MERGED').length,
      overdue: tasks.filter((t) => {
        if (!t.dueDate || t.state !== 'OPEN') return false;
        return new Date(t.dueDate) < new Date();
      }).length,
    };

    console.log('Current statistics:', currentStats);
    console.log('');

    // Generate historical data for the past 30 days
    const daysToBackfill = 30;
    console.log(`Generating historical data for the past ${daysToBackfill} days...\n`);

    for (let daysAgo = daysToBackfill; daysAgo >= 0; daysAgo--) {
      const snapshotDate = new Date();
      snapshotDate.setDate(snapshotDate.getDate() - daysAgo);
      const dateStr = snapshotDate.toISOString().split('T')[0];

      // Calculate synthetic stats based on task creation dates
      // Filter tasks to only those that existed at that point in time
      const tasksAtThatTime = tasks.filter((task) => {
        const createdDate = new Date(task.createdAt);
        return createdDate <= snapshotDate;
      });

      const totalAtTime = tasksAtThatTime.length;

      // For each task, determine if it was closed at that snapshot date
      const closedAtTime = tasksAtThatTime.filter((task) => {
        const updatedDate = new Date(task.updatedAt);
        // If task is currently closed and was updated before or at snapshot date
        if ((task.state === 'CLOSED' || task.state === 'MERGED') && updatedDate <= snapshotDate) {
          return true;
        }
        return false;
      }).length;

      const openAtTime = totalAtTime - closedAtTime;

      // Calculate overdue at that time
      const overdueAtTime = tasksAtThatTime.filter((task) => {
        if (!task.dueDate) return false;
        const dueDate = new Date(task.dueDate);
        // Was it open and past due at that snapshot date?
        const wasOpen = !(task.state === 'CLOSED' || task.state === 'MERGED') ||
                        new Date(task.updatedAt) > snapshotDate;
        return wasOpen && dueDate < snapshotDate;
      }).length;

      // Insert into daily_statistics
      const sql = `
        INSERT INTO daily_statistics (snapshot_date, total_tasks, open_tasks, closed_tasks, overdue_tasks, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        ON CONFLICT (snapshot_date)
        DO UPDATE SET
          total_tasks = EXCLUDED.total_tasks,
          open_tasks = EXCLUDED.open_tasks,
          closed_tasks = EXCLUDED.closed_tasks,
          overdue_tasks = EXCLUDED.overdue_tasks,
          created_at = NOW()
      `;

      await pool.query(sql, [
        dateStr,
        totalAtTime,
        openAtTime,
        closedAtTime,
        overdueAtTime,
      ]);

      console.log(
        `✓ ${dateStr}: Total=${totalAtTime}, Open=${openAtTime}, Closed=${closedAtTime}, Overdue=${overdueAtTime}`
      );
    }

    console.log('\n========================================');
    console.log('✓ Historical data backfill completed!');
    console.log(`✓ Generated ${daysToBackfill + 1} days of historical data`);
    console.log('========================================\n');
  } catch (error) {
    console.error('Backfill failed:', error);
    process.exit(1);
  } finally {
    await closePool();
  }
}

// Run backfill if this file is executed directly
if (require.main === module) {
  backfillHistory().catch((error) => {
    console.error('Fatal error during backfill:', error);
    process.exit(1);
  });
}

export { backfillHistory };
