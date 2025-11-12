import {
  getProjectNodeId,
  getProjectFields,
  fetchAllProjectItems,
} from '../utils/github-graphql';
import {
  ProjectV2Item,
  ProjectV2ItemFieldValue,
  GitHubIssue,
  GitHubPullRequest,
} from '../types/github';
import { Task } from '../types/task';

/**
 * Extract field value by field name from project item
 */
function getFieldValue(
  fieldValues: ProjectV2ItemFieldValue[],
  fieldName: string
): string | null {
  const field = fieldValues.find(
    (fv) => fv.field?.name.toLowerCase() === fieldName.toLowerCase()
  );

  if (!field) return null;

  // Handle different field types
  if (field.__typename === 'ProjectV2ItemFieldTextValue') {
    return field.text || null;
  } else if (field.__typename === 'ProjectV2ItemFieldDateValue') {
    return field.date || null;
  } else if (field.__typename === 'ProjectV2ItemFieldSingleSelectValue') {
    return field.name || null;
  } else if (field.__typename === 'ProjectV2ItemFieldNumberValue') {
    return field.number?.toString() || null;
  }

  return null;
}

/**
 * Check if content is an Issue
 */
function isIssue(content: any): content is GitHubIssue {
  return content.__typename === 'Issue';
}

/**
 * Check if content is a PullRequest
 */
function isPullRequest(content: any): content is GitHubPullRequest {
  return content.__typename === 'PullRequest';
}

/**
 * Transform ProjectV2Item to internal Task format
 */
function transformItemToTask(item: ProjectV2Item): Task | null {
  const { content, fieldValues } = item;

  if (!content) {
    return null; // Skip items without content
  }

  // Only process Issues and Pull Requests (skip Draft Issues for now)
  if (!isIssue(content) && !isPullRequest(content)) {
    return null;
  }

  const fieldValueNodes = fieldValues.nodes;

  // Extract field values
  const status = getFieldValue(fieldValueNodes, 'Status');
  const dueDate = getFieldValue(fieldValueNodes, 'Production ETA') ||
                  getFieldValue(fieldValueNodes, 'Due Date') ||
                  getFieldValue(fieldValueNodes, 'Due') ||
                  getFieldValue(fieldValueNodes, 'DueDate');

  // Extract assignees
  const assignees = content.assignees.nodes.map((a) => a.login);

  // Determine task type
  const type = isPullRequest(content) ? 'PULL_REQUEST' : 'ISSUE';

  // Map state
  let state: 'OPEN' | 'CLOSED' | 'MERGED' = content.state as any;
  if (isPullRequest(content) && content.state === 'MERGED') {
    state = 'MERGED';
  }

  const task: Task = {
    id: item.id,
    githubId: `${content.repository.nameWithOwner}#${content.number}`,
    title: content.title,
    number: content.number,
    type,
    state,
    status,
    repository: content.repository.nameWithOwner,
    assignees,
    createdAt: new Date(content.createdAt),
    updatedAt: new Date(content.updatedAt),
    dueDate: dueDate ? new Date(dueDate) : null,
    addedToProjectAt: new Date(content.createdAt), // Approximate
  };

  return task;
}

/**
 * Main service to fetch and transform GitHub project data
 */
export class GitHubFetcherService {
  private org: string;
  private projectNumber: number;
  private projectId: string | null = null;

  constructor(org: string, projectNumber: number) {
    this.org = org;
    this.projectNumber = projectNumber;
  }

  /**
   * Initialize the service by fetching project ID
   */
  async initialize(): Promise<void> {
    this.projectId = await getProjectNodeId(this.org, this.projectNumber);
    console.log(`Initialized GitHubFetcherService with project ID: ${this.projectId}`);
  }

  /**
   * Fetch all tasks from the GitHub project
   */
  async fetchTasks(): Promise<Task[]> {
    if (!this.projectId) {
      throw new Error('Service not initialized. Call initialize() first.');
    }

    console.log('Fetching project items...');
    const items = await fetchAllProjectItems(this.projectId);

    console.log('Transforming items to tasks...');
    const tasks = items
      .map(transformItemToTask)
      .filter((task): task is Task => task !== null);

    console.log(`Successfully transformed ${tasks.length} tasks`);
    return tasks;
  }

  /**
   * Get project fields (useful for debugging/understanding the project structure)
   */
  async getFields(): Promise<any> {
    if (!this.projectId) {
      throw new Error('Service not initialized. Call initialize() first.');
    }

    return await getProjectFields(this.projectId);
  }
}
