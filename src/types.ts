export interface InstanceConfig {
  name: string;
  domain: string;
  repository: string;
  type: 'Core' | 'Wrapper';
}

export interface CommitDetails {
  sha: string;
  message: string;
  date: string;
  author: string;
}

export interface VersionInfo {
  instance: InstanceConfig;
  customization: CommitDetails;
  core: CommitDetails;
}
