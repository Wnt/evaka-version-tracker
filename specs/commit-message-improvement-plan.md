# Implementation Plan: Improved Commit Messages

## Problem Statement

Current commit messages in the dashboard are often verbose and repetitive, making it hard to see the actual content. Examples:

**Before (current):**
- `Merge pull request #8499 from espoon-voltti/add-placement-type-to-absence-report\n\nLisätään sijoitusmuoto EO-poissaoloraportille`
- `Update dependency cryptography to v46.0.5 [SECURITY] (#8504)`
- `Bump evaka from \`029446b\` to \`2baa196\``

**After (goal):**
- `Lisätään sijoitusmuoto EO-poissaoloraportille`
- `bump: cryptography v46.0.5`
- `bump: evaka (029446b → 2baa196)`

## Investigation Findings

### Commit Message Patterns Found

| Pattern | Frequency | Example |
|---------|-----------|---------|
| Merge PR with title | Very common | `Merge pull request #N from owner/branch\n\nPR Title` |
| Dependency update | Common | `Update dependency <pkg> to <ver>` |
| Submodule bump | Common (wrappers) | `Bump evaka from \`x\` to \`y\`` |
| Direct commit | Occasional | `Fix DW model field types` |
| Security update | Occasional | `Update dependency X [SECURITY]` |

### Key Insight

For merge commits, the **PR title** is already embedded in the commit message after `\n\n`. We can extract it without an extra API call in most cases.

### GitHub API for PR Titles

When PR number is available (e.g., from `Merge pull request #8499`), we can fetch:
```
GET /repos/{owner}/{repo}/pulls/{number}
Response: { "title": "Lisätään sijoitusmuoto EO-poissaoloraportille", ... }
```

This gives us the cleanest title but requires an extra API call per commit.

## Proposed Approach

**Hybrid strategy:** Parse commit message first, only call API if needed.

### Message Cleaning Rules (in order)

1. **Merge PR pattern**: Extract text after `\n\n` (the PR title)
   - Regex: `/^Merge pull request #\d+ from .+\n\n(.+)$/s`
   - Result: The captured PR title

2. **Dependency update pattern**: Simplify to package + version
   - Regex: `/^Update dependency (.+) to (v[\d.]+)/`
   - Result: `bump: pkg vX.Y.Z`

3. **Submodule bump pattern**: Simplify with arrow notation
   - Regex: `/^Bump evaka from \`([a-f0-9]+)\` to \`([a-f0-9]+)\`/`
   - Result: `bump: evaka (abc1234 → def5678)`

4. **Fallback**: Use first line of commit message, truncated to ~80 chars

### Optional: PR Title API Lookup

For commits where we detect a PR number but can't extract a good title:
- Extract PR number from message
- Call GitHub API to get PR title
- Cache results to avoid repeated calls

## Workplan

- [x] **Step 1: Create message cleaning utility**
  - Create `src/utils/message-cleaner.ts`
  - Implement `cleanCommitMessage(message: string): string`
  - Add regex patterns for all identified patterns
  - Add unit tests for each pattern

- [x] **Step 2: Integrate with log builder**
  - Update `buildLogEntry()` in `src/api/datadog-logs.ts`
  - Apply `cleanCommitMessage()` to `custom_message` and `core_message`
  - Keep original message available as `custom_message_raw` (optional)

- [x] **Step 3: Add tests**
  - Create `tests/utils/message-cleaner.test.ts`
  - Test all identified patterns
  - Test edge cases (empty message, very long message, etc.)

- [ ] **Step 4: (Optional) Add PR title lookup**
  - Create `src/api/github-pr.ts` with `getPRTitle(repo, prNumber)` 
  - Add caching to avoid repeated API calls
  - Integrate as fallback when message cleaning is insufficient

- [x] **Step 5: Run and verify**
  - Run full test suite
  - Test locally with real data
  - Verify cleaned messages appear in Datadog

## Technical Details

### Regex Patterns

```typescript
const patterns = {
  // Merge PR: capture title after \n\n
  mergePR: /^Merge pull request #(\d+) from .+\n\n(.+)$/s,
  
  // Dependency update: Update dependency <pkg> to <ver>
  depUpdate: /^Update dependency (.+) to (v[\d.]+)/,
  
  // Submodule bump: Bump evaka from `x` to `y`
  submoduleBump: /^Bump evaka from `([a-f0-9]+)` to `([a-f0-9]+)`/,
  
  // Co-authored-by removal
  coAuthor: /\n\nCo-authored-by:.+$/s,
};
```

### Example Implementation

```typescript
export function cleanCommitMessage(message: string): string {
  // Try merge PR pattern first
  const mergePRMatch = message.match(/^Merge pull request #\d+ from .+\n\n(.+)$/s);
  if (mergePRMatch) {
    return cleanCommitMessage(mergePRMatch[1]); // Recursive for nested patterns
  }
  
  // Try dependency update pattern
  const depMatch = message.match(/^Update dependency (.+) to (v[\d.]+)/);
  if (depMatch) {
    const [, pkg, ver] = depMatch;
    return `bump: ${pkg} ${ver}`;
  }
  
  // Try submodule bump pattern
  const bumpMatch = message.match(/^Bump evaka from `([a-f0-9]+)` to `([a-f0-9]+)`/);
  if (bumpMatch) {
    return `bump: evaka (${bumpMatch[1].slice(0,7)} → ${bumpMatch[2].slice(0,7)})`;
  }
  
  // Fallback: first line, truncated
  const firstLine = message.split('\n')[0];
  return firstLine.length > 80 ? firstLine.slice(0, 77) + '...' : firstLine;
}
```

## Notes

- The PR title in merge commits is the same as what we'd get from the API
- Dependency updates are low-value; consider flagging them differently
- evaka submodule bumps are very common in wrapper repos
- Keep original message available for debugging if needed

## Files Changed

- `src/utils/message-cleaner.ts` (new)
- `src/api/datadog-logs.ts` (modify)
- `tests/utils/message-cleaner.test.ts` (new)
- `src/api/github-pr.ts` (new, optional)
- `tests/api/github-pr.test.ts` (new, optional)
