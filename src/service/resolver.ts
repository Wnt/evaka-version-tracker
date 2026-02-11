import { InstanceConfig, VersionInfo, CommitDetails } from '../types';
import { CORE_REPOSITORY } from '../config';
import { fetchInstanceVersion } from '../api/status';
import { getCommitDetails, getSubmoduleHash } from '../api/github';

export async function resolveVersionInfo(instance: InstanceConfig): Promise<VersionInfo> {
  // Step 1: Fetch the current deployed version (commit hash)
  const apiVersion = await fetchInstanceVersion(instance.domain);

  // Step 2: Fetch commit details for the customization repo
  const customization = await getCommitDetails(instance.repository, apiVersion);

  let core: CommitDetails;

  if (instance.type === 'Core') {
    // For Core instances, customization and core are the same
    core = customization;
  } else {
    // For Wrapper instances, resolve the core submodule hash
    const coreHash = await getSubmoduleHash(instance.repository, apiVersion, 'evaka');
    core = await getCommitDetails(CORE_REPOSITORY, coreHash);
  }

  return {
    instance,
    customization,
    core,
  };
}
