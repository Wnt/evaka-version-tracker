import { resolveVersionInfo } from '../../src/service/resolver';
import { fetchInstanceVersion } from '../../src/api/status';
import { getCommitDetails, getSubmoduleHash } from '../../src/api/github';
import { InstanceConfig, CommitDetails } from '../../src/types';

jest.mock('../../src/api/status');
jest.mock('../../src/api/github');

const mockFetchInstanceVersion = fetchInstanceVersion as jest.MockedFunction<typeof fetchInstanceVersion>;
const mockGetCommitDetails = getCommitDetails as jest.MockedFunction<typeof getCommitDetails>;
const mockGetSubmoduleHash = getSubmoduleHash as jest.MockedFunction<typeof getSubmoduleHash>;

describe('resolveVersionInfo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Core instance (Espoo)', () => {
    const espooConfig: InstanceConfig = {
      name: 'Espoo',
      domain: 'espoonvarhaiskasvatus.fi',
      repository: 'espoon-voltti/evaka',
      type: 'Core',
    };

    const mockCommitDetails: CommitDetails = {
      sha: 'abc123def456',
      message: 'feat: Add new feature',
      date: '2024-01-15T10:30:00Z',
      author: 'developer',
    };

    it('should resolve version info with 2 API calls (status + commit)', async () => {
      mockFetchInstanceVersion.mockResolvedValue('abc123def456');
      mockGetCommitDetails.mockResolvedValue(mockCommitDetails);

      const result = await resolveVersionInfo(espooConfig);

      // Verify correct API calls were made
      expect(mockFetchInstanceVersion).toHaveBeenCalledTimes(1);
      expect(mockFetchInstanceVersion).toHaveBeenCalledWith('espoonvarhaiskasvatus.fi');

      expect(mockGetCommitDetails).toHaveBeenCalledTimes(1);
      expect(mockGetCommitDetails).toHaveBeenCalledWith('espoon-voltti/evaka', 'abc123def456');

      // Submodule should NOT be called for Core
      expect(mockGetSubmoduleHash).not.toHaveBeenCalled();

      // Verify result structure
      expect(result).toEqual({
        instance: espooConfig,
        customization: mockCommitDetails,
        core: mockCommitDetails, // Same as customization for Core
      });
    });

    it('should have matching customization and core for Core instances', async () => {
      mockFetchInstanceVersion.mockResolvedValue('abc123def456');
      mockGetCommitDetails.mockResolvedValue(mockCommitDetails);

      const result = await resolveVersionInfo(espooConfig);

      expect(result.customization).toBe(result.core);
    });
  });

  describe('Wrapper instance (Tampere)', () => {
    const tampereConfig: InstanceConfig = {
      name: 'Tampere',
      domain: 'varhaiskasvatus.tampere.fi',
      repository: 'Tampere/trevaka',
      type: 'Wrapper',
    };

    const mockWrapperCommit: CommitDetails = {
      sha: 'wrapper123',
      message: 'chore: Update Tampere customizations',
      date: '2024-01-20T14:00:00Z',
      author: 'tampere-dev',
    };

    const mockCoreCommit: CommitDetails = {
      sha: 'core456abc',
      message: 'fix: Important bugfix',
      date: '2024-01-18T09:00:00Z',
      author: 'espoo-dev',
    };

    it('should resolve version info with 4 API calls (status + wrapper commit + submodule + core commit)', async () => {
      mockFetchInstanceVersion.mockResolvedValue('wrapper123');
      mockGetCommitDetails
        .mockResolvedValueOnce(mockWrapperCommit)
        .mockResolvedValueOnce(mockCoreCommit);
      mockGetSubmoduleHash.mockResolvedValue('core456abc');

      const result = await resolveVersionInfo(tampereConfig);

      // Verify correct API calls were made
      expect(mockFetchInstanceVersion).toHaveBeenCalledTimes(1);
      expect(mockFetchInstanceVersion).toHaveBeenCalledWith('varhaiskasvatus.tampere.fi');

      expect(mockGetCommitDetails).toHaveBeenCalledTimes(2);
      expect(mockGetCommitDetails).toHaveBeenNthCalledWith(1, 'Tampere/trevaka', 'wrapper123');
      expect(mockGetCommitDetails).toHaveBeenNthCalledWith(2, 'espoon-voltti/evaka', 'core456abc');

      expect(mockGetSubmoduleHash).toHaveBeenCalledTimes(1);
      expect(mockGetSubmoduleHash).toHaveBeenCalledWith('Tampere/trevaka', 'wrapper123', 'evaka');

      // Verify result structure
      expect(result).toEqual({
        instance: tampereConfig,
        customization: mockWrapperCommit,
        core: mockCoreCommit,
      });
    });

    it('should have different customization and core for Wrapper instances', async () => {
      mockFetchInstanceVersion.mockResolvedValue('wrapper123');
      mockGetCommitDetails
        .mockResolvedValueOnce(mockWrapperCommit)
        .mockResolvedValueOnce(mockCoreCommit);
      mockGetSubmoduleHash.mockResolvedValue('core456abc');

      const result = await resolveVersionInfo(tampereConfig);

      expect(result.customization).not.toBe(result.core);
      expect(result.customization.sha).toBe('wrapper123');
      expect(result.core.sha).toBe('core456abc');
    });
  });

  describe('Error handling', () => {
    const testConfig: InstanceConfig = {
      name: 'Test',
      domain: 'test.example.fi',
      repository: 'test/repo',
      type: 'Wrapper',
    };

    it('should propagate status fetch errors', async () => {
      mockFetchInstanceVersion.mockRejectedValue(new Error('Network error'));

      await expect(resolveVersionInfo(testConfig)).rejects.toThrow('Network error');
    });

    it('should propagate commit details errors', async () => {
      mockFetchInstanceVersion.mockResolvedValue('test-sha');
      mockGetCommitDetails.mockRejectedValue(new Error('Commit not found'));

      await expect(resolveVersionInfo(testConfig)).rejects.toThrow('Commit not found');
    });

    it('should propagate submodule hash errors', async () => {
      mockFetchInstanceVersion.mockResolvedValue('test-sha');
      mockGetCommitDetails.mockResolvedValue({
        sha: 'test-sha',
        message: 'Test',
        date: '2024-01-01T00:00:00Z',
        author: 'test',
      });
      mockGetSubmoduleHash.mockRejectedValue(new Error('Submodule not found'));

      await expect(resolveVersionInfo(testConfig)).rejects.toThrow('Submodule not found');
    });
  });
});
