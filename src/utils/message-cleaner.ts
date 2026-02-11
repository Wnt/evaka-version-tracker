/**
 * Cleans commit messages to show the essential information.
 * Strips boilerplate from merge commits, dependency updates, etc.
 */
export function cleanCommitMessage(message: string): string {
  if (!message) return '';

  // Remove trailing Co-authored-by lines
  let cleaned = message.replace(/\n\nCo-authored-by:.+$/s, '');

  // Try merge PR pattern: extract title after \n\n
  const mergePRMatch = cleaned.match(/^Merge pull request #\d+ from .+\n\n(.+)$/s);
  if (mergePRMatch) {
    return cleanCommitMessage(mergePRMatch[1]); // Recursive for nested patterns
  }

  // Try dependency update pattern: Update dependency <pkg> to <ver>
  const depMatch = cleaned.match(/^Update dependency (.+) to (v[\d.]+)/);
  if (depMatch) {
    const [, pkg, ver] = depMatch;
    return `bump: ${pkg} ${ver}`;
  }

  // Try submodule bump pattern: Bump evaka from `x` to `y`
  const bumpMatch = cleaned.match(/^Bump evaka from `([a-f0-9]+)` to `([a-f0-9]+)`/);
  if (bumpMatch) {
    return `bump: evaka (${bumpMatch[1].slice(0, 7)} → ${bumpMatch[2].slice(0, 7)})`;
  }

  // Fallback: first line, truncated to 80 chars
  const firstLine = cleaned.split('\n')[0];
  return firstLine.length > 80 ? firstLine.slice(0, 77) + '...' : firstLine;
}
