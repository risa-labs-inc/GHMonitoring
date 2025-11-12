import express from 'express';
import cors from 'cors';
import { config } from './config';
import { testConnection } from './database/connection';
import { PollingService } from './services/polling-service';
import routes, { setPollingService } from './api/routes';
import logger from './utils/logger';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api', routes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'GitHub Monitoring API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      stats: '/api/stats',
      tasks: '/api/tasks',
      overdue: '/api/tasks/overdue',
      history: '/api/history',
      refresh: 'POST /api/refresh',
      pollingStatus: '/api/polling/status',
    },
  });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
  });
});

// Initialize and start server
async function start() {
  try {
    console.log('🚀 Starting GitHub Monitoring Server...\n');

    // Test database connection
    console.log('1. Testing database connection...');
    const dbConnected = await testConnection();
    if (!dbConnected) {
      throw new Error('Database connection failed');
    }
    console.log('   ✓ Database connected\n');

    // Initialize polling service
    console.log('2. Initializing polling service...');
    const pollingService = new PollingService();
    await pollingService.initialize();
    setPollingService(pollingService);
    console.log('   ✓ Polling service initialized\n');

    // Start scheduled polling
    console.log('3. Starting scheduled polling...');
    pollingService.start();
    console.log('   ✓ Scheduled polling started\n');

    // Start HTTP server
    app.listen(config.port, () => {
      console.log('========================================');
      console.log(`✓ Server running on port ${config.port}`);
      console.log(`✓ Environment: ${config.nodeEnv}`);
      console.log(`✓ API: http://localhost:${config.port}/api`);
      console.log('========================================\n');
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('\nSIGTERM received, shutting down gracefully...');
      pollingService.stop();
      process.exit(0);
    });

    process.on('SIGINT', () => {
      console.log('\nSIGINT received, shutting down gracefully...');
      pollingService.stop();
      process.exit(0);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
start();
