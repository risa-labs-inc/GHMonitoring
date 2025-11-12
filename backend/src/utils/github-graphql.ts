import { exec } from 'child_process';
import { promisify } from 'util';
import {
  ProjectV2,
  ProjectV2FieldsResponse,
  ProjectV2Item,
} from '../types/github';

const execAsync = promisify(exec);

/**
 * Execute a GraphQL query using gh CLI
 */
async function executeGraphQL<T>(
  query: string,
  variables: Record<string, any> = {}
): Promise<T> {
  const variableArgs = Object.entries(variables)
    .map(([key, value]) => {
      if (typeof value === 'string') {
        return `-F ${key}="${value}"`;
      }
      return `-F ${key}=${value}`;
    })
    .join(' ');

  const command = `gh api graphql -f query='${query.replace(/'/g, "\\'")}' ${variableArgs}`;

  try {
    const { stdout, stderr } = await execAsync(command);

    if (stderr) {
      console.error('GraphQL stderr:', stderr);
    }

    const response = JSON.parse(stdout);

    if (response.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(response.errors)}`);
    }

    return response.data;
  } catch (error) {
    console.error('GraphQL execution error:', error);
    throw error;
  }
}

/**
 * Get the Project V2 node ID
 */
export async function getProjectNodeId(
  org: string,
  projectNumber: number
): Promise<string> {
  const query = `
    query($org: String!, $num: Int!) {
      organization(login: $org) {
        projectV2(number: $num) {
          id
          title
        }
      }
    }
  `;

  const data = await executeGraphQL<{
    organization: { projectV2: { id: string; title: string } };
  }>(query, { org, num: projectNumber });

  if (!data.organization?.projectV2) {
    throw new Error(`Project ${projectNumber} not found in organization ${org}`);
  }

  console.log(`Found project: ${data.organization.projectV2.title} (ID: ${data.organization.projectV2.id})`);

  return data.organization.projectV2.id;
}

/**
 * Get all custom fields for a project
 */
export async function getProjectFields(
  projectId: string
): Promise<ProjectV2FieldsResponse> {
  const query = `
    query($projectId: ID!) {
      node(id: $projectId) {
        ... on ProjectV2 {
          fields(first: 20) {
            nodes {
              ... on ProjectV2Field {
                id
                name
                dataType
              }
              ... on ProjectV2SingleSelectField {
                id
                name
                options {
                  id
                  name
                }
              }
              ... on ProjectV2IterationField {
                id
                name
                configuration {
                  iterations {
                    id
                    startDate
                    duration
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  const data = await executeGraphQL<{ node: ProjectV2FieldsResponse }>(
    query,
    { projectId }
  );

  return data.node;
}

/**
 * Fetch project items with pagination
 */
export async function fetchProjectItems(
  projectId: string,
  after: string | null = null
): Promise<ProjectV2> {
  const query = `
    query($projectId: ID!, $after: String) {
      node(id: $projectId) {
        ... on ProjectV2 {
          id
          title
          number
          items(first: 50, after: $after) {
            pageInfo {
              hasNextPage
              endCursor
            }
            nodes {
              id
              fieldValues(first: 20) {
                nodes {
                  __typename
                  ... on ProjectV2ItemFieldTextValue {
                    text
                    field {
                      ... on ProjectV2Field {
                        name
                      }
                    }
                  }
                  ... on ProjectV2ItemFieldDateValue {
                    date
                    field {
                      ... on ProjectV2Field {
                        name
                      }
                    }
                  }
                  ... on ProjectV2ItemFieldSingleSelectValue {
                    name
                    field {
                      ... on ProjectV2SingleSelectField {
                        name
                      }
                    }
                  }
                  ... on ProjectV2ItemFieldNumberValue {
                    number
                    field {
                      ... on ProjectV2Field {
                        name
                      }
                    }
                  }
                }
              }
              content {
                __typename
                ... on Issue {
                  title
                  number
                  state
                  assignees(first: 10) {
                    nodes {
                      login
                      name
                    }
                  }
                  createdAt
                  updatedAt
                  repository {
                    name
                    nameWithOwner
                  }
                }
                ... on PullRequest {
                  title
                  number
                  state
                  assignees(first: 10) {
                    nodes {
                      login
                      name
                    }
                  }
                  createdAt
                  updatedAt
                  repository {
                    name
                    nameWithOwner
                  }
                }
                ... on DraftIssue {
                  title
                  body
                }
              }
            }
          }
        }
      }
    }
  `;

  const data = await executeGraphQL<{ node: ProjectV2 }>(query, {
    projectId,
    after: after || 'null',
  });

  return data.node;
}

/**
 * Fetch all project items (handle pagination automatically)
 */
export async function fetchAllProjectItems(
  projectId: string
): Promise<ProjectV2Item[]> {
  const allItems: ProjectV2Item[] = [];
  let hasNextPage = true;
  let cursor: string | null = null;

  while (hasNextPage) {
    const project = await fetchProjectItems(projectId, cursor);
    allItems.push(...project.items.nodes);

    hasNextPage = project.items.pageInfo.hasNextPage;
    cursor = project.items.pageInfo.endCursor;

    console.log(`Fetched ${allItems.length} items so far...`);
  }

  console.log(`Total items fetched: ${allItems.length}`);
  return allItems;
}
