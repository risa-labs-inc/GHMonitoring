import { Router, Request, Response } from 'express';
import { TaskRepository } from '../database/task-repository';
import { TaskProcessorService } from '../services/task-processor';
import { PollingService } from '../services/polling-service';

const router = Router();
const taskRepository = new TaskRepository();
const taskProcessor = new TaskProcessorService();

// Polling service instance (will be injected)
let pollingService: PollingService | null = null;

export function setPollingService(service: PollingService) {
  pollingService = service;
}

/**
 * GET /api/health
 * Health check endpoint
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/stats
 * Get current task statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const tasks = await taskRepository.getTasksWithAssignees();
    const stats = taskProcessor.calculateStats(tasks);
    const summary = taskProcessor.getSummaryReport(tasks);

    res.json({
      stats: {
        total: stats.total,
        open: stats.open,
        closed: stats.closed,
        overdue: stats.overdue,
        noTechHandoffETA: stats.noTechHandoffETA,
        noTechHandoffETAByPriority: {
          p0: stats.noTechHandoffETAByPriority.p0,
          p1: stats.noTechHandoffETAByPriority.p1,
          noPriority: stats.noTechHandoffETAByPriority.noPriority,
        },
        unassignedByPriority: {
          p0: stats.unassignedByPriority.p0,
          p1: stats.unassignedByPriority.p1,
          noPriority: stats.unassignedByPriority.noPriority,
        },
      },
      breakdown: {
        byRepository: summary.byRepository,
        byAssignee: summary.byAssignee,
        byStatus: summary.byStatus,
      },
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      error: 'Failed to fetch statistics',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /api/tasks
 * Get all tasks with optional filters
 */
router.get('/tasks', async (req: Request, res: Response) => {
  try {
    const { state, overdue, repository, assignee } = req.query;

    let tasks = await taskRepository.getTasksWithAssignees();

    // Apply filters
    if (state) {
      tasks = tasks.filter((t) => t.state === state);
    }

    if (overdue === 'true') {
      tasks = tasks.filter((t) => {
        return (
          t.dueDate &&
          t.dueDate < new Date() &&
          t.state === 'OPEN'
        );
      });
    }

    if (repository) {
      tasks = tasks.filter((t) => t.repository === repository);
    }

    if (assignee) {
      tasks = tasks.filter((t) => t.assignees.includes(assignee as string));
    }

    res.json({
      count: tasks.length,
      tasks,
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({
      error: 'Failed to fetch tasks',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /api/tasks/overdue
 * Get all overdue tasks
 */
router.get('/tasks/overdue', async (req: Request, res: Response) => {
  try {
    const tasks = await taskRepository.getTasksWithAssignees();
    const stats = taskProcessor.calculateStats(tasks);

    res.json({
      count: stats.overdue,
      tasks: stats.overdueList,
    });
  } catch (error) {
    console.error('Error fetching overdue tasks:', error);
    res.status(500).json({
      error: 'Failed to fetch overdue tasks',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /api/history
 * Get historical data for trend analysis
 */
router.get('/history', async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const history = await taskRepository.getHistoricalData(days);

    res.json({
      days,
      data: history,
    });
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({
      error: 'Failed to fetch historical data',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /api/refresh
 * Manually trigger a data refresh
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    if (!pollingService) {
      return res.status(500).json({
        error: 'Polling service not initialized',
      });
    }

    // Trigger poll asynchronously
    pollingService.poll().catch((error) => {
      console.error('Error in manual refresh:', error);
    });

    res.json({
      message: 'Refresh triggered successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error triggering refresh:', error);
    res.status(500).json({
      error: 'Failed to trigger refresh',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /api/polling/status
 * Get polling service status
 */
router.get('/polling/status', (req: Request, res: Response) => {
  try {
    if (!pollingService) {
      return res.status(500).json({
        error: 'Polling service not initialized',
      });
    }

    const status = pollingService.getStatus();
    res.json(status);
  } catch (error) {
    console.error('Error fetching polling status:', error);
    res.status(500).json({
      error: 'Failed to fetch polling status',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /api/debug/raw-github-data
 * Debug endpoint to see raw GitHub data
 */
router.get('/debug/raw-github-data', async (req: Request, res: Response) => {
  try {
    if (!pollingService) {
      return res.status(500).json({
        error: 'Polling service not initialized',
      });
    }

    const fetcherService = (pollingService as any).fetcherService;
    if (!fetcherService || !fetcherService.projectId) {
      return res.status(500).json({
        error: 'Fetcher service not initialized',
      });
    }

    const { fetchAllProjectItems } = await import('../utils/github-graphql');
    const items = await fetchAllProjectItems(fetcherService.projectId);

    // Return first 3 items for inspection
    res.json({
      totalItems: items.length,
      sampleItems: items.slice(0, 3).map((item: any) => ({
        id: item.id,
        contentType: item.content?.__typename,
        hasContent: !!item.content,
        fieldValuesCount: item.fieldValues?.nodes?.length || 0,
        firstThreeFields: item.fieldValues?.nodes?.slice(0, 3),
        content: item.content ? {
          type: item.content.__typename,
          title: item.content.title,
          hasRepository: !!item.content.repository,
          hasAssignees: !!item.content.assignees,
        } : null,
      })),
    });
  } catch (error) {
    console.error('Error fetching raw GitHub data:', error);
    res.status(500).json({
      error: 'Failed to fetch raw GitHub data',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /api/debug/backfill-history
 * Debug endpoint to manually trigger historical data backfill
 * This generates synthetic historical data for the past 30 days based on task creation dates
 */
router.post('/debug/backfill-history', async (req: Request, res: Response) => {
  try {
    console.log('Manual historical backfill triggered');

    // Import and run the backfill function
    const { backfillHistory } = await import('../database/backfill-history');
    await backfillHistory();

    res.json({
      message: 'Historical data backfill completed successfully',
      daysGenerated: 31, // 30 days ago + today
    });
  } catch (error) {
    console.error('Error backfilling historical data:', error);
    res.status(500).json({
      error: 'Failed to backfill historical data',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /api/debug/database-status
 * Debug endpoint to check what's in the database
 */
router.get('/debug/database-status', async (req: Request, res: Response) => {
  try {
    const { query } = await import('../database/connection');

    // Check task_snapshots
    const snapshotsResult = await query(`
      SELECT
        COUNT(*) as total_snapshots,
        MIN(snapshot_date) as earliest_date,
        MAX(snapshot_date) as latest_date,
        COUNT(DISTINCT snapshot_date) as distinct_dates
      FROM task_snapshots
    `);

    // Check daily_statistics
    const statsResult = await query(`
      SELECT
        COUNT(*) as total_records,
        MIN(snapshot_date) as earliest_date,
        MAX(snapshot_date) as latest_date
      FROM daily_statistics
    `);

    // Get sample of recent daily_statistics
    const recentStats = await query(`
      SELECT snapshot_date, total_tasks, open_tasks, closed_tasks, overdue_tasks
      FROM daily_statistics
      ORDER BY snapshot_date DESC
      LIMIT 10
    `);

    res.json({
      task_snapshots: snapshotsResult.rows[0],
      daily_statistics: statsResult.rows[0],
      recent_statistics: recentStats.rows,
    });
  } catch (error) {
    console.error('Error checking database status:', error);
    res.status(500).json({
      error: 'Failed to check database status',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;
