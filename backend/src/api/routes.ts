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

export default router;
