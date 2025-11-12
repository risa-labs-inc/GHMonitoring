import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/ghmonitoring',
  },
  github: {
    org: process.env.GITHUB_ORG || 'risa-labs-inc',
    projectNumber: parseInt(process.env.GITHUB_PROJECT_NUMBER || '3', 10),
  },
  polling: {
    cronSchedule: process.env.POLLING_CRON_SCHEDULE || '0 * * * *', // Every hour
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
};
