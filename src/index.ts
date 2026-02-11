import { instances } from './config';
import { resolveVersionInfo } from './service/resolver';
import { sendDeploymentEvent } from './api/datadog';
import { VersionInfo } from './types';

const DRY_RUN = process.env.DRY_RUN === 'true';

async function processInstance(instance: typeof instances[0]): Promise<{ success: boolean; name: string; error?: string }> {
  try {
    const versionInfo = await resolveVersionInfo(instance);
    
    if (DRY_RUN) {
      console.log(`[DRY_RUN] ${instance.name}:`);
      console.log(`  Customization: ${versionInfo.customization.sha.substring(0, 7)} - ${versionInfo.customization.message}`);
      console.log(`  Core: ${versionInfo.core.sha.substring(0, 7)} - ${versionInfo.core.message}`);
    } else {
      await sendDeploymentEvent(versionInfo);
      console.log(`✓ ${instance.name}: Sent to Datadog`);
    }
    
    return { success: true, name: instance.name };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`✗ ${instance.name}: ${errorMessage}`);
    return { success: false, name: instance.name, error: errorMessage };
  }
}

export async function main(): Promise<void> {
  console.log(`eVaka Version Monitor - Processing ${instances.length} instances${DRY_RUN ? ' (DRY RUN)' : ''}`);
  console.log('---');

  const results = await Promise.allSettled(
    instances.map(instance => processInstance(instance))
  );

  const processed = results.map(result => 
    result.status === 'fulfilled' ? result.value : { success: false, name: 'unknown', error: 'Promise rejected' }
  );

  const succeeded = processed.filter(r => r.success).length;
  const failed = processed.filter(r => !r.success).length;

  console.log('---');
  console.log(`Completed: ${succeeded} succeeded, ${failed} failed`);

  if (failed > 0) {
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}
