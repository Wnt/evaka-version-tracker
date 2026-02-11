import nock from 'nock';
import { sendDeploymentEvent } from '../../src/api/datadog';
import { VersionInfo } from '../../src/types';

describe('Datadog API', () => {
  const mockVersionInfo: VersionInfo = {
    instance: {
      name: 'Tampere',
      domain: 'varhaiskasvatus.tampere.fi',
      repository: 'Tampere/trevaka',
      type: 'Wrapper',
    },
    customization: {
      sha: 'abc1234567890def',
      message: 'feat: Add new feature',
      date: '2026-02-10T12:00:00Z',
      author: 'developer',
    },
    core: {
      sha: 'def7890123456abc',
      message: 'fix: Bug fix in core',
      date: '2026-02-09T10:00:00Z',
      author: 'core-dev',
    },
  };

  beforeEach(() => {
    nock.cleanAll();
    process.env.DATADOG_API_KEY = 'test-api-key';
    process.env.DD_SITE = 'datadoghq.eu';
  });

  afterEach(() => {
    delete process.env.DATADOG_API_KEY;
    delete process.env.DD_SITE;
  });

  afterAll(() => {
    nock.restore();
  });

  it('should send deployment event with correct payload', async () => {
    const scope = nock('https://api.datadoghq.eu')
      .post('/api/v1/events', (body) => {
        expect(body.title).toBe('Deployment detected for Tampere');
        expect(body.text).toContain('Customization: feat: Add new feature (abc1234)');
        expect(body.text).toContain('Core: fix: Bug fix in core (def7890)');
        expect(body.alert_type).toBe('info');
        expect(body.source_type_name).toBe('evaka-monitor');
        return true;
      })
      .matchHeader('DD-API-KEY', 'test-api-key')
      .matchHeader('Content-Type', 'application/json')
      .reply(202, { status: 'ok' });

    await sendDeploymentEvent(mockVersionInfo);

    expect(scope.isDone()).toBe(true);
  });

  it('should include all required tags', async () => {
    const scope = nock('https://api.datadoghq.eu')
      .post('/api/v1/events', (body) => {
        const tags = body.tags as string[];
        expect(tags).toContain('instance:varhaiskasvatus.tampere.fi');
        expect(tags).toContain('source:evaka-monitor');
        expect(tags).toContain('repo_custom:Tampere/trevaka');
        expect(tags).toContain('commit_custom:abc1234');
        expect(tags).toContain('date_custom:2026-02-10T12:00:00Z');
        expect(tags).toContain('repo_core:espoon-voltti/evaka');
        expect(tags).toContain('commit_core:def7890');
        expect(tags).toContain('date_core:2026-02-09T10:00:00Z');
        return true;
      })
      .reply(202, { status: 'ok' });

    await sendDeploymentEvent(mockVersionInfo);

    expect(scope.isDone()).toBe(true);
  });

  it('should use default DD_SITE when not set', async () => {
    delete process.env.DD_SITE;

    const scope = nock('https://api.datadoghq.com')
      .post('/api/v1/events')
      .reply(202, { status: 'ok' });

    await sendDeploymentEvent(mockVersionInfo);

    expect(scope.isDone()).toBe(true);
  });

  it('should throw error when DATADOG_API_KEY is not set', async () => {
    delete process.env.DATADOG_API_KEY;

    await expect(sendDeploymentEvent(mockVersionInfo)).rejects.toThrow(
      'DATADOG_API_KEY environment variable is not set'
    );
  });

  it('should throw error on API failure', async () => {
    nock('https://api.datadoghq.eu')
      .post('/api/v1/events')
      .reply(403, { errors: ['Forbidden'] });

    await expect(sendDeploymentEvent(mockVersionInfo)).rejects.toThrow();
  });
});
