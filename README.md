# GitHub Monitoring - OneRISA Project

A comprehensive monitoring system for tracking GitHub Project tasks (issues and pull requests), providing visibility into task assignment, progress, and completion status.

## Features

- 📊 **Real-time Statistics**: Track total, open, closed, and overdue tasks
- 📈 **Trend Analysis**: Visualize task trends over time with historical data
- 🔍 **Advanced Filtering**: Sort and filter tasks by state, repository, assignee
- ⚠️ **Overdue Tracking**: Highlight tasks beyond their due date
- 🔄 **Scheduled Polling**: Automatic data synchronization via configurable cron schedule
- 📱 **Responsive Dashboard**: Clean, modern UI built with React

## Architecture

This is a full-stack TypeScript application consisting of:

- **Backend**: Node.js + Express API with PostgreSQL database
- **Frontend**: React dashboard with real-time updates
- **GitHub Integration**: GraphQL API via GitHub CLI

### Technology Stack

| Component | Technology |
|-----------|------------|
| Backend | Node.js, TypeScript, Express |
| Database | PostgreSQL |
| Frontend | React, TypeScript, Vite |
| Styling | CSS3 |
| Charts | Recharts |
| GitHub API | GraphQL via `gh` CLI |
| Scheduling | node-cron |
| Logging | winston |

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18+ and npm
- **PostgreSQL** 14+
- **GitHub CLI** (`gh`) - [Installation guide](https://cli.github.com/)

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/anisrisa/GHMonitoring.git
cd GHMonitoring
```

### 2. Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 3. Configure GitHub Authentication

Update your GitHub CLI authentication to include project access:

```bash
gh auth refresh -h github.com -s read:project
```

Verify the authentication:

```bash
gh auth status
```

You should see `read:project` in the token scopes.

### 4. Set Up the Database

Create a PostgreSQL database:

```bash
createdb ghmonitoring
```

### 5. Configure Environment Variables

**Backend:**

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` with your configuration:

```env
PORT=3001
NODE_ENV=development
DATABASE_URL=postgresql://username:password@localhost:5432/ghmonitoring
GITHUB_ORG=risa-labs-inc
GITHUB_PROJECT_NUMBER=3
POLLING_CRON_SCHEDULE="0 * * * *"
LOG_LEVEL=info
```

**Frontend:**

```bash
cd frontend
cp .env.example .env
```

Edit `frontend/.env` if needed:

```env
VITE_API_URL=http://localhost:3001/api
```

### 6. Run Database Migrations

```bash
cd backend
npm run db:migrate
```

## Usage

### Development Mode

Start both backend and frontend in development mode with auto-reload:

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

The API will be available at `http://localhost:3001`

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

The dashboard will be available at `http://localhost:3000`

### Production Mode

**Build and run backend:**
```bash
cd backend
npm run build
npm start
```

**Build and serve frontend:**
```bash
cd frontend
npm run build
npm run preview
```

## API Endpoints

The backend exposes the following REST API endpoints:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/stats` | Current task statistics |
| GET | `/api/tasks` | All tasks (supports filters) |
| GET | `/api/tasks/overdue` | Overdue tasks only |
| GET | `/api/history?days=30` | Historical data |
| POST | `/api/refresh` | Trigger manual data refresh |
| GET | `/api/polling/status` | Polling service status |

### Query Parameters for `/api/tasks`

- `state` - Filter by state (OPEN, CLOSED, MERGED)
- `overdue` - Show only overdue tasks (true)
- `repository` - Filter by repository name
- `assignee` - Filter by assignee username

## Dashboard Features

### Statistics Cards

The dashboard displays four key metrics:

1. **Total Tasks** - All tasks in the project
2. **Open Tasks** - Currently open tasks
3. **Closed Tasks** - Completed tasks
4. **Overdue Tasks** - Tasks past their due date

### Trend Chart

Visualizes task trends over the last 30 days:
- Total tasks
- Open tasks
- Closed tasks
- Overdue tasks

### Tasks Table

Features include:
- **Sorting** - Click column headers to sort
- **Filtering** - Filter by state (All, Open, Closed, Merged)
- **Overdue Highlighting** - Tasks past due date are highlighted in red
- **Assignee Display** - Shows all assigned team members
- **Repository Info** - Full repository path

### Auto-Refresh

The dashboard automatically refreshes data every 30 seconds. You can also manually trigger a refresh using the "Refresh Now" button.

## Configuration

### Polling Schedule

The backend uses node-cron for scheduled data fetching. Configure the schedule in `backend/.env`:

```env
POLLING_CRON_SCHEDULE="0 * * * *"  # Every hour
```

Cron format: `minute hour day month weekday`

Examples:
- `"0 * * * *"` - Every hour
- `"*/30 * * * *"` - Every 30 minutes
- `"0 0 * * *"` - Daily at midnight
- `"0 */6 * * *"` - Every 6 hours

### GitHub Project Configuration

Update the GitHub organization and project number in `backend/.env`:

```env
GITHUB_ORG=your-org-name
GITHUB_PROJECT_NUMBER=your-project-number
```

To find your project number, check the URL of your GitHub Project:
`https://github.com/orgs/YOUR_ORG/projects/PROJECT_NUMBER`

## Database Schema

The application uses PostgreSQL with the following tables:

- **tasks** - Stores all GitHub issues and PRs
- **task_assignments** - Tracks assignee history
- **task_snapshots** - Daily snapshots for historical analysis
- **daily_statistics** - Aggregated daily metrics

## Development

### Project Structure

```
GHMonitoring/
├── backend/
│   ├── src/
│   │   ├── api/          # REST API routes
│   │   ├── config/       # Configuration management
│   │   ├── database/     # Schema, migrations, repository
│   │   ├── services/     # Business logic
│   │   ├── types/        # TypeScript types
│   │   └── utils/        # Utilities (GraphQL, logger)
│   └── package.json
└── frontend/
    ├── src/
    │   ├── components/   # React components
    │   ├── services/     # API client
    │   ├── types/        # TypeScript interfaces
    │   └── App.tsx       # Main application
    └── package.json
```

### Backend Commands

```bash
npm run dev          # Start development server with auto-reload
npm run build        # Compile TypeScript
npm start            # Run compiled code
npm run db:migrate   # Run database migrations
```

### Frontend Commands

```bash
npm run dev          # Start Vite dev server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

## Troubleshooting

### Database Connection Issues

If you encounter database connection errors:

1. Verify PostgreSQL is running:
   ```bash
   pg_isready
   ```

2. Check your `DATABASE_URL` in `backend/.env`

3. Test the connection:
   ```bash
   psql -d ghmonitoring
   ```

### GitHub API Errors

If you get GitHub API errors:

1. Verify authentication:
   ```bash
   gh auth status
   ```

2. Ensure you have the `read:project` scope

3. Check that you have access to the specified organization and project

### Port Already in Use

If port 3001 or 3000 is already in use:

1. Change the port in `backend/.env` (PORT=3002)
2. Update `frontend/.env` to match (VITE_API_URL=http://localhost:3002/api)

## Contributing

We use a branch-based Git workflow with automated quality checks on pull requests.

### Git Workflow

#### Branch Naming Convention

Use descriptive branch names with prefixes:

- `feature/description` - New features (e.g., `feature/dashboard-filters`)
- `fix/description` - Bug fixes (e.g., `fix/overdue-tasks-display`)
- `chore/description` - Maintenance tasks (e.g., `chore/update-dependencies`)
- `docs/description` - Documentation updates (e.g., `docs/api-guide`)

#### Development Workflow

**For Bug Fixes:**

1. **Create a branch** from main:
   ```bash
   git checkout main
   git pull origin main
   git checkout -b fix/bug-description
   ```

2. **Make your changes** and commit with descriptive messages:
   ```bash
   git add .
   git commit -m "Fix: Description of what was fixed"
   ```

3. **Test locally**:
   ```bash
   # Backend
   cd backend
   npm run build
   npm run dev

   # Frontend
   cd frontend
   npm run build
   npm run dev
   ```

4. **Push your branch**:
   ```bash
   git push origin fix/bug-description
   ```

5. **Create a Pull Request**:
   - Via GitHub UI: https://github.com/risa-labs-inc/GHMonitoring/pulls
   - Or via GitHub CLI:
     ```bash
     gh pr create --title "Fix: Bug description" --body "Details about the fix"
     ```

6. **Automated checks** will run:
   - TypeScript compilation
   - ESLint (frontend)
   - Build verification
   - All checks must pass before merging

7. **Review and merge** the PR

8. **Deploy manually** when ready:
   ```bash
   # Deploy to Firebase/Cloud Run as needed
   firebase deploy
   ```

**For New Features:**

Follow the same process, but use `feature/` prefix:

```bash
git checkout -b feature/feature-name
# Make changes, commit, push
git push origin feature/feature-name
gh pr create --title "Feature: Feature name" --body "Description"
```

#### Commit Message Conventions

Use clear, descriptive commit messages with prefixes:

- `Fix:` - Bug fixes (e.g., "Fix: Correct overdue task calculation")
- `Feature:` - New features (e.g., "Feature: Add task priority filter")
- `Update:` - Updates to existing features (e.g., "Update: Improve error handling")
- `Refactor:` - Code refactoring (e.g., "Refactor: Simplify API routes")
- `Docs:` - Documentation (e.g., "Docs: Update API endpoint list")
- `Chore:` - Maintenance (e.g., "Chore: Update dependencies")

#### Deployment Process

After merging to main:

1. **Backend deployment** (Firebase App Hosting or Cloud Run):
   ```bash
   cd backend
   npm run build
   firebase deploy  # or your deployment command
   ```

2. **Frontend deployment**:
   ```bash
   cd frontend
   npm run build
   # Deploy built files as needed
   ```

3. **Verify deployment**:
   - Check that the application is running
   - Test the changes in production
   - Monitor logs for any errors

#### Pull Request Guidelines

When creating a pull request:

- **Fill out the PR template** completely
- **Describe your changes** clearly
- **List testing steps** for reviewers
- **Note any deployment requirements** (migrations, env vars, etc.)
- **Include screenshots** for UI changes
- **Ensure all automated checks pass**

#### Quick Reference

```bash
# Start new work
git checkout main && git pull
git checkout -b feature/my-feature

# Save your work
git add .
git commit -m "Feature: Description"

# Share your work
git push origin feature/my-feature
gh pr create

# After PR is merged
git checkout main
git pull origin main
git branch -d feature/my-feature  # Clean up local branch
```

## License

This project is licensed under the MIT License.

## Support

For issues or questions:
- Open an issue on GitHub
- Check the [CLAUDE.md](CLAUDE.md) file for architecture details

## Acknowledgments

- Built for monitoring the OneRISA Project tasks
- Uses GitHub Projects v2 GraphQL API
- Designed for real-time visibility into team task management
