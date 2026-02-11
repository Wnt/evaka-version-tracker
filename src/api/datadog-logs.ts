import axios from 'axios';
import { VersionInfo } from '../types';
import { cleanCommitMessage } from '../utils/message-cleaner';

export interface DatadogLogEntry {
  ddsource: string;
  ddtags: string;
  hostname: string;
  service: string;
  message: string;
  log_timestamp: number;
  instance_name: string;
  instance_domain: string;
  custom_repo: string;
  custom_commit: string;
  custom_date: string;
  custom_message: string;
  custom_author: string;
  custom_age: string;
  custom_age_days: number;
  core_repo: string;
  core_commit: string;
  core_date: string;
  core_message: string;
  core_author: string;
  core_age: string;
  core_age_days: number;
}

export function getAgeDays(dateString: string): number {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export function formatAge(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  
  const minutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  
  if (months >= 1) return `${months} month${months > 1 ? 's' : ''}`;
  if (weeks >= 1) return `${weeks} week${weeks > 1 ? 's' : ''}`;
  if (days >= 1) return `${days} day${days > 1 ? 's' : ''}`;
  if (hours >= 1) return `${hours} hour${hours > 1 ? 's' : ''}`;
  return `${minutes} min${minutes !== 1 ? 's' : ''}`;
}

export function buildLogEntry(versionInfo: VersionInfo): DatadogLogEntry {
  const { instance, customization, core } = versionInfo;

  return {
    ddsource: 'evaka-monitor',
    ddtags: 'env:production',
    hostname: 'github-actions',
    service: 'evaka-version-monitor',
    message: `Version info for ${instance.name}`,
    log_timestamp: Date.now(),
    instance_name: instance.name,
    instance_domain: instance.domain,
    custom_repo: instance.repository,
    custom_commit: customization.sha.substring(0, 7),
    custom_date: customization.date,
    custom_message: cleanCommitMessage(customization.message),
    custom_author: customization.author,
    custom_age: formatAge(customization.date),
    custom_age_days: getAgeDays(customization.date),
    core_repo: 'espoon-voltti/evaka',
    core_commit: core.sha.substring(0, 7),
    core_date: core.date,
    core_message: cleanCommitMessage(core.message),
    core_author: core.author,
    core_age: formatAge(core.date),
    core_age_days: getAgeDays(core.date),
  };
}

export async function sendVersionLog(versionInfo: VersionInfo): Promise<void> {
  const apiKey = process.env.DATADOG_API_KEY;
  const ddSite = process.env.DD_SITE || 'datadoghq.com';

  if (!apiKey) {
    throw new Error('DATADOG_API_KEY environment variable is not set');
  }

  const logEntry = buildLogEntry(versionInfo);
  const url = `https://http-intake.logs.${ddSite}/api/v2/logs`;

  await axios.post(url, [logEntry], {
    headers: {
      'Content-Type': 'application/json',
      'DD-API-KEY': apiKey,
    },
  });
}
