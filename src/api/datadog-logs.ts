import axios from 'axios';
import { VersionInfo } from '../types';

export interface DatadogLogEntry {
  ddsource: string;
  ddtags: string;
  hostname: string;
  service: string;
  message: string;
  instance_name: string;
  instance_domain: string;
  custom_repo: string;
  custom_commit: string;
  custom_date: string;
  custom_message: string;
  custom_author: string;
  core_repo: string;
  core_commit: string;
  core_date: string;
  core_message: string;
  core_author: string;
}

export function buildLogEntry(versionInfo: VersionInfo): DatadogLogEntry {
  const { instance, customization, core } = versionInfo;

  return {
    ddsource: 'evaka-monitor',
    ddtags: 'env:production',
    hostname: 'github-actions',
    service: 'evaka-version-monitor',
    message: `Version info for ${instance.name}`,
    instance_name: instance.name,
    instance_domain: instance.domain,
    custom_repo: instance.repository,
    custom_commit: customization.sha.substring(0, 7),
    custom_date: customization.date,
    custom_message: customization.message,
    custom_author: customization.author,
    core_repo: 'espoon-voltti/evaka',
    core_commit: core.sha.substring(0, 7),
    core_date: core.date,
    core_message: core.message,
    core_author: core.author,
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
