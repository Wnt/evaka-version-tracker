import nock from 'nock';
import { sendVersionLog, buildLogEntry } from '../../src/api/datadog-logs';
import { VersionInfo } from '../../src/types';

describe('Datadog Logs API', () => {
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

  describe('buildLogEntry', () => {
    it('should build log entry with correct structure', () => {
      const entry = buildLogEntry(mockVersionInfo);

      expect(entry.ddsource).toBe('evaka-monitor');
      expect(entry.ddtags).toBe('env:production');
      expect(entry.hostname).toBe('github-actions');
      expect(entry.service).toBe('evaka-version-monitor');
      expect(entry.message).toBe('Version info for Tampere');
      expect(entry.instance_name).toBe('Tampere');
      expect(entry.instance_domain).toBe('varhaiskasvatus.tampere.fi');
      expect(entry.custom_repo).toBe('Tampere/trevaka');
      expect(entry.custom_commit).toBe('abc1234');
      expect(entry.custom_date).toBe('2026-02-10T12:00:00Z');
      expect(entry.custom_message).toBe('feat: Add new feature');
      expect(entry.custom_author).toBe('developer');
      expect(entry.core_repo).toBe('espoon-voltti/evaka');
      expect(entry.core_commit).toBe('def7890');
      expect(entry.core_date).toBe('2026-02-09T10:00:00Z');
      expect(entry.core_message).toBe('fix: Bug fix in core');
      expect(entry.core_author).toBe('core-dev');
    });
  });

  describe('sendVersionLog', () => {
    it('should send log to correct endpoint with proper payload', async () => {
      const scope = nock('https://http-intake.logs.datadoghq.eu')
        .post('/api/v2/logs', (body) => {
          expect(Array.isArray(body)).toBe(true);
          expect(body).toHaveLength(1);
          const log = body[0];
          expect(log.ddsource).toBe('evaka-monitor');
          expect(log.service).toBe('evaka-version-monitor');
          expect(log.instance_name).toBe('Tampere');
          expect(log.custom_commit).toBe('abc1234');
          expect(log.core_commit).toBe('def7890');
          return true;
        })
        .matchHeader('DD-API-KEY', 'test-api-key')
        .matchHeader('Content-Type', 'application/json')
        .reply(202, { status: 'ok' });

      await sendVersionLog(mockVersionInfo);

      expect(scope.isDone()).toBe(true);
    });

    it('should use default DD_SITE when not set', async () => {
      delete process.env.DD_SITE;

      const scope = nock('https://http-intake.logs.datadoghq.com')
        .post('/api/v2/logs')
        .reply(202, { status: 'ok' });

      await sendVersionLog(mockVersionInfo);

      expect(scope.isDone()).toBe(true);
    });

    it('should throw error when DATADOG_API_KEY is not set', async () => {
      delete process.env.DATADOG_API_KEY;

      await expect(sendVersionLog(mockVersionInfo)).rejects.toThrow(
        'DATADOG_API_KEY environment variable is not set'
      );
    });

    it('should throw error on API failure', async () => {
      nock('https://http-intake.logs.datadoghq.eu')
        .post('/api/v2/logs')
        .reply(403, { errors: ['Forbidden'] });

      await expect(sendVersionLog(mockVersionInfo)).rejects.toThrow();
    });
  });
});
