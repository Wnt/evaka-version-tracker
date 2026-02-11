import nock from 'nock';
import { fetchInstanceVersion } from '../../src/api/status';

describe('fetchInstanceVersion', () => {
  beforeAll(() => {
    nock.disableNetConnect();
  });

  afterAll(() => {
    nock.enableNetConnect();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  it('should return the apiVersion from the status endpoint', async () => {
    const domain = 'espoonvarhaiskasvatus.fi';
    const expectedSha = 'test-sha-123';

    nock(`https://${domain}`)
      .get('/api/citizen/auth/status')
      .reply(200, { apiVersion: expectedSha });

    const result = await fetchInstanceVersion(domain);
    expect(result).toBe(expectedSha);
  });

  it('should throw an error if the request fails', async () => {
    const domain = 'espoonvarhaiskasvatus.fi';

    nock(`https://${domain}`)
      .get('/api/citizen/auth/status')
      .reply(500);

    await expect(fetchInstanceVersion(domain)).rejects.toThrow();
  });

  it('should handle different domains', async () => {
    const domain = 'varhaiskasvatus.tampere.fi';
    const expectedSha = 'tampere-commit-abc';

    nock(`https://${domain}`)
      .get('/api/citizen/auth/status')
      .reply(200, { apiVersion: expectedSha });

    const result = await fetchInstanceVersion(domain);
    expect(result).toBe(expectedSha);
  });
});
