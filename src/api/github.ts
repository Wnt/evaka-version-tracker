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
  return {
    sha: response.data.sha,
    message: commit.message.split('\n')[0], // First line only
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
