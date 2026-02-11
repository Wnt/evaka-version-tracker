import nock from 'nock';
import { getCommitDetails, getSubmoduleHash } from '../../src/api/github';

describe('GitHub API Client', () => {
  beforeEach(() => {
    nock.cleanAll();
  });

  afterAll(() => {
    nock.restore();
  });

  describe('getCommitDetails', () => {
    it('should fetch commit details from GitHub API', async () => {
      const mockCommit = {
        sha: 'abc123def456',
        commit: {
          message: 'feat: Add new feature\n\nMore details here',
          author: { name: 'Test Author' },
          committer: { date: '2024-01-15T10:30:00Z' },
        },
        author: { login: 'testuser' },
      };

      nock('https://api.github.com')
        .get('/repos/espoon-voltti/evaka/commits/abc123def456')
        .reply(200, mockCommit);

      const result = await getCommitDetails('espoon-voltti/evaka', 'abc123def456');

      expect(result).toEqual({
        sha: 'abc123def456',
        message: 'feat: Add new feature',
        date: '2024-01-15T10:30:00Z',
        author: 'testuser',
      });
    });

    it('should use commit author name when GitHub login is not available', async () => {
      const mockCommit = {
        sha: 'abc123def456',
        commit: {
          message: 'Fix bug',
          author: { name: 'Local Author' },
          committer: { date: '2024-01-15T10:30:00Z' },
        },
        author: null,
      };

      nock('https://api.github.com')
        .get('/repos/espoon-voltti/evaka/commits/abc123def456')
        .reply(200, mockCommit);

      const result = await getCommitDetails('espoon-voltti/evaka', 'abc123def456');

      expect(result.author).toBe('Local Author');
    });

    it('should include auth header when GH_TOKEN is set', async () => {
      process.env.GH_TOKEN = 'test-token';

      const mockCommit = {
        sha: 'abc123',
        commit: {
          message: 'Test',
          author: { name: 'Author' },
          committer: { date: '2024-01-15T10:30:00Z' },
        },
        author: { login: 'user' },
      };

      nock('https://api.github.com')
        .get('/repos/test/repo/commits/abc123')
        .matchHeader('Authorization', 'Bearer test-token')
        .reply(200, mockCommit);

      await getCommitDetails('test/repo', 'abc123');

      delete process.env.GH_TOKEN;
    });

    it('should throw error on API failure', async () => {
      nock('https://api.github.com')
        .get('/repos/test/repo/commits/notfound')
        .reply(404, { message: 'Not Found' });

      await expect(getCommitDetails('test/repo', 'notfound')).rejects.toThrow();
    });
  });

  describe('getSubmoduleHash', () => {
    it('should fetch submodule SHA from GitHub contents API', async () => {
      const mockSubmodule = {
        type: 'submodule',
        sha: 'core-commit-sha-789',
        name: 'evaka',
        path: 'evaka',
      };

      nock('https://api.github.com')
        .get('/repos/Tampere/trevaka/contents/evaka')
        .query({ ref: 'wrapper-sha-123' })
        .reply(200, mockSubmodule);

      const result = await getSubmoduleHash('Tampere/trevaka', 'wrapper-sha-123', 'evaka');

      expect(result).toBe('core-commit-sha-789');
    });

    it('should throw error when path is not a submodule', async () => {
      const mockFile = {
        type: 'file',
        sha: 'file-sha',
        name: 'README.md',
      };

      nock('https://api.github.com')
        .get('/repos/test/repo/contents/README.md')
        .query({ ref: 'main' })
        .reply(200, mockFile);

      await expect(getSubmoduleHash('test/repo', 'main', 'README.md')).rejects.toThrow(
        "Expected submodule at path 'README.md', got type 'file'"
      );
    });

    it('should include ref parameter in the request', async () => {
      const mockSubmodule = {
        type: 'submodule',
        sha: 'submodule-sha',
      };

      nock('https://api.github.com')
        .get('/repos/Tampere/trevaka/contents/evaka')
        .query({ ref: 'specific-commit-hash' })
        .reply(200, mockSubmodule);

      await getSubmoduleHash('Tampere/trevaka', 'specific-commit-hash', 'evaka');
    });
  });
});
