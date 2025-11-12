import cron from 'node-cron';
import { GitHubFetcherService } from './github-fetcher';
import { TaskProcessorService } from './task-processor';
import { TaskRepository } from '../database/task-repository';
import { config } from '../config';

/**
 * Service to handle scheduled polling of GitHub data
 */
export class PollingService {
  private cronJob: cron.ScheduledTask | null = null;
  private isRunning = false;
  private lastRunTime: Date | null = null;
  private lastRunStatus: 'success' | 'error' | null = null;
  private lastRunError: string | null = null;

  private githubFetcher: GitHubFetcherService;
  private taskProcessor: TaskProcessorService;
  private taskRepository: TaskRepository;

  constructor() {
    this.githubFetcher = new GitHubFetcherService(
      config.github.org,
      config.github.projectNumber
    );
    this.taskProcessor = new TaskProcessorService();
    this.taskRepository = new TaskRepository();
  }

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    await this.githubFetcher.initialize();
    console.log('✓ Polling service initialized');
  }

  /**
   * Run a single polling cycle
   */
  async poll(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠ Polling already in progress, skipping this cycle');
      return;
    }

    this.isRunning = true;
    this.lastRunTime = new Date();
    console.log(`\n========================================`);
    console.log(`Starting polling cycle at ${this.lastRunTime.toISOString()}`);
    console.log(`========================================\n`);

    try {
      // Fetch tasks from GitHub
      console.log('1. Fetching tasks from GitHub...');
      const tasks = await this.githubFetcher.fetchTasks();
      console.log(`   ✓ Fetched ${tasks.length} tasks`);

      // Calculate statistics
      console.log('\n2. Calculating statistics...');
      const stats = this.taskProcessor.calculateStats(tasks);
      console.log(`   ✓ Total: ${stats.total}`);
      console.log(`   ✓ Open: ${stats.open}`);
      console.log(`   ✓ Closed: ${stats.closed}`);
      console.log(`   ✓ Overdue: ${stats.overdue}`);

      // Save to database
      console.log('\n3. Saving to database...');
      await this.taskRepository.upsertTasks(tasks);

      // Sync task assignments
      console.log('\n4. Syncing task assignments...');
      for (const task of tasks) {
        if (task.assignees.length > 0) {
          await this.taskRepository.syncTaskAssignments(
            task.githubId,
            task.assignees
          );
        }
      }
      console.log('   ✓ Assignments synced');

      // Create snapshot
      console.log('\n5. Creating snapshot...');
      await this.taskRepository.createSnapshot();

      // Save daily statistics
      console.log('\n6. Saving daily statistics...');
      await this.taskRepository.saveDailyStatistics(
        stats.total,
        stats.open,
        stats.closed,
        stats.overdue
      );

      this.lastRunStatus = 'success';
      this.lastRunError = null;

      console.log(`\n========================================`);
      console.log(`✓ Polling cycle completed successfully`);
      console.log(`========================================\n`);
    } catch (error) {
      this.lastRunStatus = 'error';
      this.lastRunError = error instanceof Error ? error.message : String(error);

      console.error(`\n========================================`);
      console.error(`✗ Polling cycle failed:`, error);
      console.error(`========================================\n`);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Start scheduled polling
   */
  start(): void {
    if (this.cronJob) {
      console.log('⚠ Polling already started');
      return;
    }

    console.log(`Starting scheduled polling with cron: ${config.polling.cronSchedule}`);

    this.cronJob = cron.schedule(config.polling.cronSchedule, () => {
      this.poll().catch((error) => {
        console.error('Error in scheduled poll:', error);
      });
    });

    console.log('✓ Scheduled polling started');

    // Run immediately on start
    this.poll().catch((error) => {
      console.error('Error in initial poll:', error);
    });
  }

  /**
   * Stop scheduled polling
   */
  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      console.log('✓ Scheduled polling stopped');
    }
  }

  /**
   * Get polling status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      isScheduled: this.cronJob !== null,
      cronSchedule: config.polling.cronSchedule,
      lastRunTime: this.lastRunTime,
      lastRunStatus: this.lastRunStatus,
      lastRunError: this.lastRunError,
    };
  }
}
