import axios from 'axios';
import { VersionInfo } from '../types';

export interface DatadogEventPayload {
  title: string;
  text: string;
  tags: string[];
  alert_type?: 'info' | 'warning' | 'error' | 'success';
  source_type_name?: string;
}

export async function sendDeploymentEvent(versionInfo: VersionInfo): Promise<void> {
  const apiKey = process.env.DATADOG_API_KEY;
  const ddSite = process.env.DD_SITE || 'datadoghq.com';

  if (!apiKey) {
    throw new Error('DATADOG_API_KEY environment variable is not set');
  }

  const { instance, customization, core } = versionInfo;

  const title = `Deployment detected for ${instance.name}`;
  const text = `Customization: ${customization.message} (${customization.sha.substring(0, 7)})\nCore: ${core.message} (${core.sha.substring(0, 7)})`;

  const tags = [
    `instance:${instance.domain}`,
    `source:evaka-monitor`,
    `repo_custom:${instance.repository}`,
    `commit_custom:${customization.sha.substring(0, 7)}`,
    `date_custom:${customization.date}`,
    `repo_core:espoon-voltti/evaka`,
    `commit_core:${core.sha.substring(0, 7)}`,
    `date_core:${core.date}`,
  ];

  const payload: DatadogEventPayload = {
    title,
    text,
    tags,
    alert_type: 'info',
    source_type_name: 'evaka-monitor',
  };

  const url = `https://api.${ddSite}/api/v1/events`;

  await axios.post(url, payload, {
    headers: {
      'Content-Type': 'application/json',
      'DD-API-KEY': apiKey,
    },
  });
}
