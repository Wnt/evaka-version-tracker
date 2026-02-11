import axios from 'axios';
import { withRetry } from '../utils/retry';

export interface AuthStatusResponse {
  apiVersion: string;
}

export async function fetchInstanceVersion(domain: string): Promise<string> {
  const url = `https://${domain}/api/citizen/auth/status`;
  const response = await withRetry(() =>
    axios.get<AuthStatusResponse>(url, {
      timeout: 10000,
    })
  );
  return response.data.apiVersion;
}
