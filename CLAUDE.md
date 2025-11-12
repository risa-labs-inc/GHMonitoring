# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This project provides visibility into GitHub tasks (issues/pull requests) and tracks which ones were picked up and completed by the tech team. The goal is to monitor task assignment, progress, and completion status.

## Project Architecture

This is a monorepo project with a backend API and frontend dashboard:

```
GHMonitoring/
├── backend/          # Node.js + TypeScript + Express API
│   ├── src/
│   │   ├── api/         # REST API routes
│   │   ├── config/      # Configuration management
│   │   ├── database/    # Database schema & migrations
│   │   ├── services/    # Business logic (fetcher, processor, polling)
│   │   ├── types/       # TypeScript type definitions
│   │   └── utils/       # Helper utilities (GraphQL, logger)
│   └── package.json
└── frontend/         # React + TypeScript + Vite
    ├── src/
    │   ├── components/  # React components (StatsCard, TasksTable, TrendChart)
    │   ├── services/    # API client
    │   └── types/       # TypeScript interfaces
    └── package.json
```

### Technology Stack

- **Backend**: Node.js, TypeScript, Express, node-cron, winston
- **Database**: PostgreSQL
- **GitHub API**: GraphQL via `gh` CLI
- **Frontend**: React, TypeScript, Vite, Recharts
- **Deployment**: Configurable via environment variables

### Core Components

1. **GitHub API Integration** (`backend/src/utils/github-graphql.ts`)
   - Uses GitHub Projects v2 GraphQL API via `gh api graphql`
   - Fetches project items with pagination
   - Extracts issues, PRs, status, due dates, assignees

2. **Data Processing** (`backend/src/services/`)
   - `GitHubFetcherService`: Transforms GitHub data to internal Task format
   - `TaskProcessorService`: Calculates stats, segregates tasks, identifies overdue items
   - `PollingService`: Scheduled data fetching with node-cron

3. **Data Storage** (`backend/src/database/`)
   - PostgreSQL tables: tasks, task_assignments, task_snapshots, daily_statistics
   - Historical tracking for trend analysis
   - Repository pattern for data access

4. **REST API** (`backend/src/api/routes.ts`)
   - GET /api/stats - Current task statistics
   - GET /api/tasks - All tasks with filters
   - GET /api/tasks/overdue - Overdue tasks
   - GET /api/history - Historical data
   - POST /api/refresh - Manual data refresh

5. **Frontend Dashboard** (`frontend/src/`)
   - Statistics cards showing totals, open, closed, overdue
   - Trend chart with historical data
   - Sortable/filterable tasks table
   - Auto-refresh every 30 seconds

## Setup Instructions

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- GitHub CLI (`gh`) authenticated with `read:project` scope

### Initial Setup

1. **Clone and install dependencies:**
   ```bash
   # Backend
   cd backend
   npm install

   # Frontend
   cd ../frontend
   npm install
   ```

2. **Configure environment:**
   ```bash
   # Backend: Copy and edit .env file
   cd backend
   cp .env.example .env
   # Edit .env with your database URL and GitHub org/project details
   ```

3. **Update GitHub auth scopes:**
   ```bash
   gh auth refresh -h github.com -s read:project
   ```

4. **Set up database:**
   ```bash
   # Create PostgreSQL database
   createdb ghmonitoring

   # Run migrations
   cd backend
   npm run db:migrate
   ```

### Running the Application

**Development Mode:**

```bash
# Terminal 1: Start backend (with auto-reload)
cd backend
npm run dev

# Terminal 2: Start frontend (with auto-reload)
cd frontend
npm run dev
```

**Production Mode:**

```bash
# Build backend
cd backend
npm run build
npm start

# Build frontend
cd frontend
npm run build
npm run preview
```

### Common Commands

**Backend:**
- `npm run dev` - Start development server with auto-reload
- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Run compiled JavaScript
- `npm run db:migrate` - Run database migrations

**Frontend:**
- `npm run dev` - Start Vite dev server (http://localhost:3000)
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Configuration

### Backend Environment Variables

- `PORT` - API server port (default: 3001)
- `DATABASE_URL` - PostgreSQL connection string
- `GITHUB_ORG` - GitHub organization (e.g., risa-labs-inc)
- `GITHUB_PROJECT_NUMBER` - Project board number
- `POLLING_CRON_SCHEDULE` - Cron schedule for data fetching (default: "0 * * * *")

### Frontend Environment Variables

- `VITE_API_URL` - Backend API URL (default: http://localhost:3001/api)

## GitHub API Integration

This project uses GitHub Projects v2 GraphQL API accessed via `gh api graphql`:

- **Authentication**: Uses `gh` CLI authentication (requires `read:project` scope)
- **Project Access**: Fetches items from organization ProjectV2
- **Data Fetched**: Issues, PRs, status, due dates, assignees, custom fields
- **Pagination**: Automatically handles pagination for large projects
- **Rate Limits**: Respects GitHub GraphQL rate limits (5000 points/hour)

## Database Schema

- **tasks**: Stores all GitHub issues/PRs with metadata
- **task_assignments**: Tracks assignee history
- **task_snapshots**: Daily snapshots for historical analysis
- **daily_statistics**: Aggregated daily metrics for charts

See `backend/src/database/schema.sql` for full schema.
