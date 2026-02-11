# Architecture Cleanup Recommendations

This document contains improvement suggestions from an architectural code review of the eVaka Version Monitor application.

## Executive Summary

The application is well-structured with clean separation of concerns, good test coverage, and follows the original specification. The code is maintainable and the architecture is appropriate for its scope. Below are categorized improvements.

---

## Critical Issues (Must Fix)

*No critical issues identified.*

The application is functionally complete and secure.

---

## Important Issues (Should Fix)

### 1. Dead Code: `src/api/datadog.ts` (Legacy Events API)

**Location:** `src/api/datadog.ts`

**Issue:** The `sendDeploymentEvent` function in `datadog.ts` is never used. The application exclusively uses `datadog-logs.ts` via `sendVersionLog()`. This legacy file creates confusion and maintenance burden.

**Recommendation:**
- [ ] Delete `src/api/datadog.ts`
- [ ] Delete `tests/api/datadog.test.ts`
- [ ] Update `README.md` project structure to remove reference to `datadog.ts`

---

### 2. Unnecessary Utility Script: `src/verify-config.ts`

**Location:** `src/verify-config.ts`

**Issue:** This script was created during development (Step 2 verification) and serves no purpose in the production codebase. It's not referenced by any workflow or test.

**Recommendation:**
- [ ] Delete `src/verify-config.ts`

---

### 3. Missing Retry Logic for External API Calls

**Locations:**
- `src/api/github.ts` - GitHub API calls
- `src/api/status.ts` - Instance status fetching
- `src/api/datadog-logs.ts` - Datadog API calls

**Issue:** All HTTP requests use a fixed 10-second timeout but lack retry logic with exponential backoff. Given this runs every 15 minutes, transient network failures could cause unnecessary monitoring gaps.

**Recommendation:**
- [ ] Add retry wrapper with exponential backoff (e.g., 3 retries: 1s, 2s, 4s delays)
- [ ] Consider using a library like `axios-retry` or implementing a simple retry utility
- [ ] Example implementation in `src/utils/retry.ts`:
```typescript
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelayMs = 1000
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;
      await new Promise(r => setTimeout(r, baseDelayMs * Math.pow(2, attempt)));
    }
  }
  throw new Error('Unreachable');
}
```

---

### 5. Missing Rate Limit Handling for GitHub API

**Location:** `src/api/github.ts`

**Issue:** GitHub API has rate limits (60 requests/hour unauthenticated, 5000/hour authenticated). The code makes up to 35 API calls per run (12 status + 11 submodule lookups + 12 commit details). No handling exists for 403 rate limit responses.

**Recommendation:**
- [ ] Check for `X-RateLimit-Remaining` header and log warnings when low
- [ ] Return a meaningful error message when rate limited
- [ ] Consider implementing request batching or caching for wrapper instances using the same repository (e.g., all Tampere region instances share `Tampere/trevaka`)

---

## Suggestions (Nice to Have)

### 6. Optimize Duplicate GitHub API Calls

**Issue:** Multiple instances share the same wrapper repository:
- 9 instances use `Tampere/trevaka`
- Each independently fetches submodule hash and core commit details

When all these instances are on the same wrapper version (common case), the application makes redundant API calls.

**Recommendation:**
- [ ] Implement caching layer for GitHub API responses (keyed by repo + ref)
- [ ] Example: Use a `Map<string, Promise<T>>` to deduplicate concurrent identical requests
- [ ] This could reduce GitHub API calls from ~35 to ~15 in the common case

---

### 9. Test File Organization

**Issue:** `tests/sample.test.ts` exists and appears to be a leftover from initial setup.

**Recommendation:**
- [ ] Review and delete `tests/sample.test.ts` if it contains only placeholder tests

---

### 10. Add ESLint/Prettier Configuration

**Issue:** No linting or formatting configuration exists. Code style consistency relies entirely on developer discipline.

**Recommendation:**
- [ ] Add `.eslintrc.js` with TypeScript support
- [ ] Add `.prettierrc`
- [ ] Add `lint` and `format` npm scripts
- [ ] Add pre-commit hooks (via husky or similar)

---

### 12. Consider Extracting Constants

**Locations:**
- `src/api/datadog-logs.ts:59` - `ddsource: 'evaka-monitor'`
- `src/api/datadog-logs.ts:61` - `hostname: 'github-actions'`
- `src/config.ts:78` - `CORE_REPOSITORY`

**Recommendation:**
- [ ] Create `src/constants.ts` to centralize magic strings and make them manageable via environment variables
- [ ] Makes it easier to change values and ensures consistency

---
