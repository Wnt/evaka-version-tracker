import nock from 'nock';
import { instances } from '../../src/config';
import { main } from '../../src/index';

describe('E2E: Monitor Full Flow', () => {
  const mockCommitData = new Map<string, { sha: string; coreSubmoduleSha?: string }>();

  beforeAll(() => {
    nock.disableNetConnect();
  });

  afterAll(() => {
    nock.enableNetConnect();
    nock.restore();
  });

  beforeEach(() => {
    nock.cleanAll();
    mockCommitData.clear();
    process.env.DATADOG_API_KEY = 'test-api-key';
    process.env.DD_SITE = 'datadoghq.eu';
  });

  afterEach(() => {
    delete process.env.DATADOG_API_KEY;
    delete process.env.DD_SITE;
  });

  function setupMocksForInstance(
    instance: typeof instances[0],
    customSha: string,
    coreSha?: string
  ) {
    mockCommitData.set(instance.domain, {
      sha: customSha,
      coreSubmoduleSha: coreSha,
    });

    // Mock status endpoint
    nock(`https://${instance.domain}`)
      .get('/api/citizen/auth/status')
      .reply(200, { apiVersion: customSha });

    // Mock GitHub commit details for custom repo
    const [owner, repo] = instance.repository.split('/');
    nock('https://api.github.com')
      .get(`/repos/${instance.repository}/commits/${customSha}`)
      .reply(200, {
        sha: customSha,
        commit: {
          message: `Commit message for ${instance.name}\n\nDetailed description`,
          committer: { date: '2026-02-10T12:00:00Z' },
          author: { name: 'test-author' },
        },
        author: { login: 'test-author' },
      });

    if (instance.type === 'Wrapper' && coreSha) {
      // Mock submodule lookup
      nock('https://api.github.com')
        .get(`/repos/${instance.repository}/contents/evaka`)
        .query({ ref: customSha })
        .reply(200, {
          type: 'submodule',
          sha: coreSha,
        });

      // Mock core commit details
      nock('https://api.github.com')
        .get(`/repos/espoon-voltti/evaka/commits/${coreSha}`)
        .reply(200, {
          sha: coreSha,
          commit: {
            message: `Core commit for ${instance.name} deployment\n\nCore details`,
            committer: { date: '2026-02-09T10:00:00Z' },
            author: { name: 'core-author' },
          },
          author: { login: 'core-author' },
        });
    }
  }

  function setupDatadogMock(): nock.Scope {
    return nock('https://http-intake.logs.datadoghq.eu')
      .post('/api/v2/logs')
      .times(12)
      .reply(202, { status: 'ok' });
  }

  it('should process all 12 instances and send events to Datadog', async () => {
    // Setup mocks for all instances
    instances.forEach((instance, index) => {
      const customSha = `custom-sha-${index.toString().padStart(3, '0')}-abc123def`;
      const coreSha = instance.type === 'Wrapper' 
        ? `core-sha-${index.toString().padStart(3, '0')}-xyz789ghi`
        : undefined;
      setupMocksForInstance(instance, customSha, coreSha);
    });

    const datadogScope = setupDatadogMock();

    // Suppress console output during test
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    await main();

    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();

    // Verify all Datadog events were sent
    expect(datadogScope.isDone()).toBe(true);
    // Verify all nocks were consumed
    expect(nock.pendingMocks()).toHaveLength(0);
  });

  it('should send correct data for a Core instance (Espoo)', async () => {
    const espoo = instances.find(i => i.name === 'Espoo')!;
    const customSha = 'espoo-core-sha-abc123def456';

    // Setup only Espoo mock
    nock(`https://${espoo.domain}`)
      .get('/api/citizen/auth/status')
      .reply(200, { apiVersion: customSha });

    nock('https://api.github.com')
      .get(`/repos/${espoo.repository}/commits/${customSha}`)
      .reply(200, {
        sha: customSha,
        commit: {
          message: 'feat: New Espoo feature',
          committer: { date: '2026-02-10T14:30:00Z' },
          author: { name: 'espoo-dev' },
        },
        author: { login: 'espoo-dev' },
      });

    // Setup other instances to avoid errors (they will fail but that's ok)
    instances.filter(i => i.name !== 'Espoo').forEach(instance => {
      nock(`https://${instance.domain}`)
        .get('/api/citizen/auth/status')
        .reply(500);
    });

    let capturedPayload: any = null;
    nock('https://http-intake.logs.datadoghq.eu')
      .post('/api/v2/logs', (body) => {
        if (Array.isArray(body) && body.some(log => log.instance_name === 'Espoo')) {
          capturedPayload = body.find(log => log.instance_name === 'Espoo');
        }
        return true;
      })
      .times(12)
      .reply(202, { status: 'ok' });

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    
    // Allow exit code 1 since other instances will fail
    const originalExit = process.exit;
    process.exit = jest.fn() as any;

    await main();

    process.exit = originalExit;
    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();

    // Verify Espoo payload (Core type - same commit for custom and core)
    expect(capturedPayload).not.toBeNull();
    expect(capturedPayload.instance_name).toBe('Espoo');
    expect(capturedPayload.custom_message).toBe('feat: New Espoo feature');
    expect(capturedPayload.instance_domain).toBe('espoonvarhaiskasvatus.fi');
    expect(capturedPayload.custom_repo).toBe('espoon-voltti/evaka');
    expect(capturedPayload.core_repo).toBe('espoon-voltti/evaka');
  });

  it('should send correct data for a Wrapper instance (Tampere)', async () => {
    const tampere = instances.find(i => i.name === 'Tampere')!;
    const wrapperSha = 'tampere-wrapper-sha-abc123';
    const coreSha = 'core-evaka-sha-xyz789';

    // Setup only Tampere mock
    nock(`https://${tampere.domain}`)
      .get('/api/citizen/auth/status')
      .reply(200, { apiVersion: wrapperSha });

    nock('https://api.github.com')
      .get(`/repos/${tampere.repository}/commits/${wrapperSha}`)
      .reply(200, {
        sha: wrapperSha,
        commit: {
          message: 'feat: Tampere customization',
          committer: { date: '2026-02-10T15:00:00Z' },
          author: { name: 'tampere-dev' },
        },
        author: { login: 'tampere-dev' },
      });

    nock('https://api.github.com')
      .get(`/repos/${tampere.repository}/contents/evaka`)
      .query({ ref: wrapperSha })
      .reply(200, {
        type: 'submodule',
        sha: coreSha,
      });

    nock('https://api.github.com')
      .get(`/repos/espoon-voltti/evaka/commits/${coreSha}`)
      .reply(200, {
        sha: coreSha,
        commit: {
          message: 'fix: Core bug fix',
          committer: { date: '2026-02-08T10:00:00Z' },
          author: { name: 'core-dev' },
        },
        author: { login: 'core-dev' },
      });

    // Setup other instances to fail
    instances.filter(i => i.name !== 'Tampere').forEach(instance => {
      nock(`https://${instance.domain}`)
        .get('/api/citizen/auth/status')
        .reply(500);
    });

    let capturedPayload: any = null;
    nock('https://http-intake.logs.datadoghq.eu')
      .post('/api/v2/logs', (body) => {
        if (Array.isArray(body) && body.some(log => log.instance_name === 'Tampere')) {
          capturedPayload = body.find(log => log.instance_name === 'Tampere');
        }
        return true;
      })
      .times(12)
      .reply(202, { status: 'ok' });

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    
    const originalExit = process.exit;
    process.exit = jest.fn() as any;

    await main();

    process.exit = originalExit;
    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();

    // Verify Tampere payload (Wrapper type - different custom and core commits)
    expect(capturedPayload).not.toBeNull();
    expect(capturedPayload.instance_name).toBe('Tampere');
    expect(capturedPayload.custom_message).toBe('feat: Tampere customization');
    expect(capturedPayload.core_message).toBe('fix: Core bug fix');
    expect(capturedPayload.instance_domain).toBe('varhaiskasvatus.tampere.fi');
    expect(capturedPayload.custom_repo).toBe('Tampere/trevaka');
    expect(capturedPayload.core_repo).toBe('espoon-voltti/evaka');
    expect(capturedPayload.custom_commit).toBe(wrapperSha.substring(0, 7));
    expect(capturedPayload.core_commit).toBe(coreSha.substring(0, 7));
  });

  it('should continue processing when one instance fails', async () => {
    // First instance (Espoo) will fail
    nock(`https://${instances[0].domain}`)
      .get('/api/citizen/auth/status')
      .reply(500);

    // Setup remaining 11 instances
    instances.slice(1).forEach((instance, index) => {
      const customSha = `sha-${index + 1}-abc123`;
      const coreSha = instance.type === 'Wrapper' ? `core-${index + 1}-xyz789` : undefined;
      setupMocksForInstance(instance, customSha, coreSha);
    });

    const datadogScope = nock('https://http-intake.logs.datadoghq.eu')
      .post('/api/v2/logs')
      .times(11) // Only 11 logs expected
      .reply(202, { status: 'ok' });

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    
    const originalExit = process.exit;
    process.exit = jest.fn() as any;

    await main();

    process.exit = originalExit;
    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();

    // Verify 11 Datadog logs were sent (1 failed)
    expect(datadogScope.isDone()).toBe(true);
  });

  it('should correctly report success count', async () => {
    // Setup all instances to succeed
    instances.forEach((instance, index) => {
      const customSha = `sha-${index}-success`;
      const coreSha = instance.type === 'Wrapper' ? `core-${index}-success` : undefined;
      setupMocksForInstance(instance, customSha, coreSha);
    });

    nock('https://http-intake.logs.datadoghq.eu')
      .post('/api/v2/logs')
      .times(12)
      .reply(202, { status: 'ok' });

    const logMessages: string[] = [];
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation((msg) => {
      logMessages.push(msg);
    });
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    await main();

    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();

    // Check summary message
    const summaryMessage = logMessages.find(msg => msg.includes('Completed:'));
    expect(summaryMessage).toContain('12 succeeded');
    expect(summaryMessage).toContain('0 failed');
  });
});
