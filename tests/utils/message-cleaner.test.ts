import { cleanCommitMessage } from '../../src/utils/message-cleaner';

describe('cleanCommitMessage', () => {
  describe('merge PR pattern', () => {
    it('should extract PR title from merge commit', () => {
      const message = 'Merge pull request #8499 from espoon-voltti/add-placement-type\n\nLisätään sijoitusmuoto EO-poissaoloraportille';
      expect(cleanCommitMessage(message)).toBe('Lisätään sijoitusmuoto EO-poissaoloraportille');
    });

    it('should handle PR title with nested dependency update', () => {
      const message = 'Merge pull request #2002 from Tampere/dependabot/submodules/evaka-2baa196\n\nBump evaka from `029446b` to `2baa196`';
      expect(cleanCommitMessage(message)).toBe('bump: evaka (029446b → 2baa196)');
    });

    it('should handle PR title with nested dependency update pattern', () => {
      const message = 'Merge pull request #8504 from espoon-voltti/renovate/cryptography\n\nUpdate dependency cryptography to v46.0.5';
      expect(cleanCommitMessage(message)).toBe('bump: cryptography v46.0.5');
    });
  });

  describe('dependency update pattern', () => {
    it('should simplify dependency update message', () => {
      const message = 'Update dependency cryptography to v46.0.5 [SECURITY] (#8504)';
      expect(cleanCommitMessage(message)).toBe('bump: cryptography v46.0.5');
    });

    it('should handle dependency update without security tag', () => {
      const message = 'Update dependency axios to v1.13.5';
      expect(cleanCommitMessage(message)).toBe('bump: axios v1.13.5');
    });

    it('should handle scoped package names', () => {
      const message = 'Update dependency com.datadoghq:dd-java-agent to v1.59.0';
      expect(cleanCommitMessage(message)).toBe('bump: com.datadoghq:dd-java-agent v1.59.0');
    });
  });

  describe('submodule bump pattern', () => {
    it('should simplify evaka bump message', () => {
      const message = 'Bump evaka from `029446b13ed1e841dd0b2b73c61062f63962badc` to `2baa1961f98e679e0af4f82fa8b56098344adab7`';
      expect(cleanCommitMessage(message)).toBe('bump: evaka (029446b → 2baa196)');
    });

    it('should handle short hashes', () => {
      const message = 'Bump evaka from `029446b` to `2baa196`';
      expect(cleanCommitMessage(message)).toBe('bump: evaka (029446b → 2baa196)');
    });
  });

  describe('co-authored-by removal', () => {
    it('should remove Co-authored-by lines', () => {
      const message = 'Update dependency axios to v1.13.5\n\nCo-authored-by: renovate[bot] <29139614+renovate[bot]@users.noreply.github.com>';
      expect(cleanCommitMessage(message)).toBe('bump: axios v1.13.5');
    });
  });

  describe('fallback behavior', () => {
    it('should return first line for regular commits', () => {
      const message = 'Add placement type to absence report tests';
      expect(cleanCommitMessage(message)).toBe('Add placement type to absence report tests');
    });

    it('should truncate long messages', () => {
      const message = 'This is a very long commit message that exceeds eighty characters and should be truncated with ellipsis';
      expect(cleanCommitMessage(message)).toBe('This is a very long commit message that exceeds eighty characters and should ...');
      expect(cleanCommitMessage(message).length).toBe(80);
    });

    it('should handle empty message', () => {
      expect(cleanCommitMessage('')).toBe('');
    });

    it('should handle multiline message without patterns', () => {
      const message = 'Fix bug in API\n\nThis fixes a critical issue with the authentication flow.';
      expect(cleanCommitMessage(message)).toBe('Fix bug in API');
    });
  });
});
