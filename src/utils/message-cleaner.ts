/**
 * Cleans commit messages to show the essential information.
 * Strips boilerplate from merge commits, dependency updates, etc.
 */
export function cleanCommitMessage(message: string): string {
  if (!message) return '';

  // Remove trailing Co-authored-by lines
  let cleaned = message.replace(/\n\nCo-authored-by:.+$/s, '');

  // Try merge PR pattern with title: extract title after \n\n
  const mergePRWithTitleMatch = cleaned.match(/^Merge pull request #\d+ from .+\n\n(.+)$/s);
  if (mergePRWithTitleMatch) {
    return cleanCommitMessage(mergePRWithTitleMatch[1]); // Recursive for nested patterns
  }

  // Try merge PR pattern without title (dependabot submodule bumps)
  const mergePRSubmoduleMatch = cleaned.match(/^Merge pull request #\d+ from .+\/dependabot\/submodules\/evaka-([a-f0-9]+)$/);
  if (mergePRSubmoduleMatch) {
    return `bump: evaka (→ ${mergePRSubmoduleMatch[1].slice(0, 7)})`;
  }

  // Try merge PR pattern without title (other branches) - extract branch name
  const mergePRNoTitleMatch = cleaned.match(/^Merge pull request #(\d+) from [^/]+\/(.+)$/);
  if (mergePRNoTitleMatch) {
    const branchName = mergePRNoTitleMatch[2];
    // Convert branch-name-style to readable text
    return branchName.replace(/-/g, ' ').replace(/\//g, ' ');
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
