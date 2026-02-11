import axios from 'axios';
import { CommitDetails } from '../types';

const GITHUB_API_BASE = 'https://api.github.com';

function getAuthHeaders(): Record<string, string> {
  const token = process.env.GH_TOKEN;
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

/**
 * Extracts PR number from a merge commit message.
 * Returns null if not a merge commit.
 */
export function extractPRNumber(message: string): number | null {
  const match = message.match(/^Merge pull request #(\d+) from/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Fetches the PR title from GitHub API.
 */
export async function getPRTitle(repo: string, prNumber: number): Promise<string | null> {
  try {
    const url = `${GITHUB_API_BASE}/repos/${repo}/pulls/${prNumber}`;
    const response = await axios.get(url, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        ...getAuthHeaders(),
      },
      timeout: 10000,
    });
    return response.data.title;
  } catch {
    // If PR lookup fails, return null (will fall back to commit message)
    return null;
  }
}

export async function getCommitDetails(repo: string, sha: string): Promise<CommitDetails> {
  const url = `${GITHUB_API_BASE}/repos/${repo}/commits/${sha}`;
  const response = await axios.get(url, {
    headers: {
      Accept: 'application/vnd.github.v3+json',
      ...getAuthHeaders(),
    },
    timeout: 10000,
  });

  const { commit, author } = response.data;
  const fullMessage = commit.message;
  const firstLine = fullMessage.split('\n')[0];
  
  // Check if this is a merge commit and try to get PR title
  const prNumber = extractPRNumber(firstLine);
  let message = firstLine;
  
  if (prNumber) {
    const prTitle = await getPRTitle(repo, prNumber);
    if (prTitle) {
      message = prTitle;
    }
  }
  
  return {
    sha: response.data.sha,
    message,
    date: commit.committer.date,
    author: author?.login || commit.author.name,
  };
}

export async function getSubmoduleHash(repo: string, ref: string, path: string): Promise<string> {
  const url = `${GITHUB_API_BASE}/repos/${repo}/contents/${path}`;
  const response = await axios.get(url, {
    headers: {
      Accept: 'application/vnd.github.v3+json',
      ...getAuthHeaders(),
    },
    params: { ref },
    timeout: 10000,
  });

  // For submodules, GitHub returns an object with type "submodule" and sha
  if (response.data.type !== 'submodule') {
    throw new Error(`Expected submodule at path '${path}', got type '${response.data.type}'`);
  }

  return response.data.sha;
}
