// GitHub API Types

export interface GitHubIssue {
  title: string;
  number: number;
  state: 'OPEN' | 'CLOSED';
  assignees: {
    nodes: Array<{
      login: string;
      name: string | null;
    }>;
  };
  createdAt: string;
  updatedAt: string;
  repository: {
    name: string;
    nameWithOwner: string;
  };
}

export interface GitHubPullRequest {
  title: string;
  number: number;
  state: 'OPEN' | 'CLOSED' | 'MERGED';
  assignees: {
    nodes: Array<{
      login: string;
      name: string | null;
    }>;
  };
  createdAt: string;
  updatedAt: string;
  repository: {
    name: string;
    nameWithOwner: string;
  };
}

export interface GitHubDraftIssue {
  title: string;
  body: string;
}

export type GitHubContent = GitHubIssue | GitHubPullRequest | GitHubDraftIssue;

export interface ProjectV2ItemFieldValue {
  __typename: string;
  field?: {
    name: string;
  };
  text?: string;
  date?: string;
  name?: string;
  number?: number;
}

export interface ProjectV2Item {
  id: string;
  fieldValues: {
    nodes: ProjectV2ItemFieldValue[];
  };
  content: GitHubContent | null;
}

export interface ProjectV2 {
  id: string;
  title: string;
  number: number;
  items: {
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string | null;
    };
    nodes: ProjectV2Item[];
  };
}

export interface ProjectV2Field {
  id: string;
  name: string;
  dataType?: string;
  options?: Array<{
    id: string;
    name: string;
  }>;
}

export interface ProjectV2FieldsResponse {
  fields: {
    nodes: ProjectV2Field[];
  };
}
