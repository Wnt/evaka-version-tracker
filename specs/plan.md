# Implementation Plan for eVaka Version Monitor

This plan breaks down the implementation into incremental, testable steps. Each step includes a verification method to ensure correctness before moving forward.

## Prerequisite: Environment Setup
*   Node.js (v18+) installed.
*   Git initialized.

## Step 1: Project Skeleton & Testing Infrastructure ✅ DONE
Initialize a TypeScript project with Jest for testing and Nock for HTTP mocking.

*   **Actions**:
    *   `npm init -y`
    *   Install dependencies: `typescript`, `ts-node`, `axios`, `dotenv`.
    *   Install dev dependencies: `jest`, `ts-jest`, `@types/jest`, `@types/node`, `nock`.
    *   Configure `tsconfig.json`.
    *   Configure `jest.config.js`.
*   **Verification**:
    *   Run `npm test` on a sample test file to confirm the test harness works.
*   **Status**: Completed - All dependencies installed, configs created, sample test passing.

## Step 2: Configuration & Data Models ✅ DONE
Define the static configuration for the 12 eVaka instances and the necessary TypeScript interfaces.

*   **Actions**:
    *   Create `src/types.ts`: Define `InstanceConfig`, `CommitDetails`, `VersionInfo`.
    *   Create `src/config.ts`: Export the array of 12 instances with their domains and repo details (as per Specification).
*   **Verification**:
    *   Create a temporary script `src/verify-config.ts` that imports the config and prints the count of instances and checks one specific entry (e.g., Espoo).
    *   Run: `npx ts-node src/verify-config.ts` -> Expect output "12 instances loaded".
*   **Status**: Completed - types.ts, config.ts, and verify-config.ts created. Verification passed: "12 instances loaded".

## Step 3: Instance Status Fetcher ✅ DONE
Implement the logic to query the `/api/citizen/auth/status` endpoint.

*   **Actions**:
    *   Create `src/api/status.ts`: Export `fetchInstanceVersion(domain)`.
    *   Use `axios` to make the HTTP request.
*   **Verification**:
    *   Create `tests/api/status.test.ts`.
    *   Use `nock` to intercept `https://espoonvarhaiskasvatus.fi/api/citizen/auth/status`.
    *   Mock response: `{"apiVersion": "test-sha-123"}`.
    *   Run: `npm test` -> Expect pass.
*   **Status**: Completed - src/api/status.ts and tests/api/status.test.ts created. All 5 tests passing.

## Step 4: GitHub API Client ✅ DONE
Implement the logic to fetch commit details and submodule hashes.

*   **Actions**:
    *   Create `src/api/github.ts`.
    *   Implement `getCommitDetails(repo, sha)`: Returns message, date, author.
    *   Implement `getSubmoduleHash(repo, ref, path)`: Fetches contents to get the linked SHA.
    *   Add error handling (e.g., if API limit reached).
*   **Verification**:
    *   Create `tests/api/github.test.ts`.
    *   Use `nock` to mock GitHub API endpoints.
    *   Test case 1: Fetch commit details.
    *   Test case 2: Fetch submodule hash (mock the JSON response with `{ "sha": "..." }`).
    *   Run: `npm test`.
*   **Status**: Completed - src/api/github.ts and tests/api/github.test.ts created. All 12 tests passing (7 GitHub tests + 5 existing).

## Step 5: Logic Orchestration (Single Instance) ✅ DONE
Combine the pieces to resolve the full version info for a single instance (both wrapper and core).

*   **Actions**:
    *   Create `src/service/resolver.ts`.
    *   Implement `resolveVersionInfo(instanceConfig)`.
    *   Logic:
        1.  Call `fetchInstanceVersion`.
        2.  Call `getCommitDetails` for the custom repo.
        3.  If wrapper, call `getSubmoduleHash` then `getCommitDetails` for core.
        4.  Return combined object.
*   **Verification**:
    *   Create `tests/service/resolver.test.ts`.
    *   Mock all API functions using `jest.mock`.
    *   Test case: Espoo (Core only) -> 2 calls (Status, Commit).
    *   Test case: Tampere (Wrapper) -> 4 calls (Status, Wrapper Commit, Submodule, Core Commit).
    *   Run: `npm test`.
*   **Status**: Completed - src/service/resolver.ts and tests/service/resolver.test.ts created. All 19 tests passing (7 resolver tests + 7 GitHub tests + 3 status tests + 2 sample tests).

## Step 6: Datadog Integration ✅ DONE
Implement the client to send events to Datadog.

*   **Actions**:
    *   Create `src/api/datadog.ts`.
    *   Implement `sendDeploymentEvent(versionInfo)`.
    *   Format the title and text as specified.
*   **Verification**:
    *   Create `tests/api/datadog.test.ts`.
    *   Mock axios/datadog-client.
    *   Verify the payload structure matches Datadog API requirements.
    *   Run: `npm test`.
*   **Status**: Completed - src/api/datadog.ts and tests/api/datadog.test.ts created. All 24 tests passing (5 Datadog tests + 7 resolver tests + 7 GitHub tests + 3 status tests + 2 sample tests).

## Step 7: Main Application Loop ✅ DONE
Create the entry point that iterates over all instances.

*   **Actions**:
    *   Create `src/index.ts`.
    *   Iterate `instances`, call `resolveVersionInfo`, then `sendDeploymentEvent`.
    *   Use `Promise.allSettled` to ensure one failure doesn't stop others.
*   **Verification**:
    *   Run `npx ts-node src/index.ts` with `DRY_RUN=true` env var (need to implement dry run logic to skip DD send) to see logs in console.
*   **Status**: Completed - src/index.ts created with DRY_RUN support, Promise.allSettled for parallel processing, error handling per instance, and summary reporting. TypeScript compiles cleanly. All 24 tests still passing.

## Step 8: End-to-End Test Suite (Offline) ✅ DONE
Create a comprehensive test that verifies the whole flow without hitting real APIs.

*   **Actions**:
    *   Create `tests/e2e/monitor.test.ts`.
    *   Use `nock` to set up a "simulation":
        *   Mock Status API for all 12 domains.
        *   Mock GitHub API for the specific commits returned by status mocks.
        *   Mock Datadog API to capture the POST requests.
    *   Run the `main` function.
    *   Assert that 12 POST requests were made to Datadog with the correct correlated data.
*   **Verification**:
    *   Run `npm test tests/e2e`.
*   **Status**: Completed - tests/e2e/monitor.test.ts created with 5 comprehensive tests:
    1. Process all 12 instances and send events to Datadog
    2. Verify correct data for Core instance (Espoo)
    3. Verify correct data for Wrapper instance (Tampere)
    4. Continue processing when one instance fails
    5. Correctly report success count
    All 29 tests passing (24 existing + 5 new E2E).

## Step 9: GitHub Action Workflow ✅ DONE
Prepare the deployment file.

*   **Actions**:
    *   Create `.github/workflows/monitor.yml`.
    *   Configure Cron and Secrets.
*   **Verification**:
    *   Manual review of YAML syntax.
*   **Status**: Completed - .github/workflows/monitor.yml created with:
    - Cron schedule (every 15 minutes)
    - Manual workflow_dispatch trigger
    - Node.js 20 setup with npm caching
    - Environment variables for DATADOG_API_KEY, DD_SITE, and GH_TOKEN
    - All 29 tests still passing

## Implementation Complete 🎉
All steps have been completed. The eVaka Version Monitor is ready for deployment. To use:
1. Add `DATADOG_API_KEY` secret to the repository
2. Optionally add `DD_SITE` secret (defaults to datadoghq.com)
3. The workflow will run automatically every 15 minutes or can be triggered manually
