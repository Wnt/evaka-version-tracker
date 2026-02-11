# eVaka Version Monitor Specification

## Overview
This tool monitors the deployed versions of 12 eVaka instances. It fetches the current running version from each instance's public API, retrieves commit details (message, date) from the corresponding GitHub repositories, and pushes this information to Datadog for visualization.

## Architecture

### Components
1.  **Poller Service**: A script/application that runs periodically (e.g., every 15 minutes).
2.  **GitHub API**: Source of truth for commit messages and dates.
3.  **Datadog API**: Destination for version telemetry.

### Tech Stack
*   **Language**: Node.js (TypeScript) or Python.
*   **Hosting**: GitHub Actions (Cron), AWS Lambda, or similar serverless platform.

## Configuration

The tool requires a configuration mapping instances to their Git repositories.

| Instance | Domain | Repository | Type |
| :--- | :--- | :--- | :--- |
| Espoo | `espoonvarhaiskasvatus.fi` | `espoon-voltti/evaka` | Core |
| Oulu | `varhaiskasvatus.ouka.fi` | `Oulunkaupunki/evakaoulu` | Wrapper |
| Turku | `evaka.turku.fi` | `City-of-Turku/evakaturku` | Wrapper |
| Hämeenkyrö | `evaka.hameenkyro.fi` | `Tampere/trevaka` | Wrapper |
| Kangasala | `evaka.kangasala.fi` | `Tampere/trevaka` | Wrapper |
| Lempäälä | `evaka.lempaala.fi` | `Tampere/trevaka` | Wrapper |
| Nokia | `evaka.nokiankaupunki.fi` | `Tampere/trevaka` | Wrapper |
| Orivesi | `evaka.orivesi.fi` | `Tampere/trevaka` | Wrapper |
| Pirkkala | `evaka.pirkkala.fi` | `Tampere/trevaka` | Wrapper |
| Tampere | `varhaiskasvatus.tampere.fi` | `Tampere/trevaka` | Wrapper |
| Vesilahti | `evaka.vesilahti.fi` | `Tampere/trevaka` | Wrapper |
| Ylöjärvi | `evaka.ylojarvi.fi` | `Tampere/trevaka` | Wrapper |

*   **Core**: The repo is the main eVaka application. `apiVersion` = Core Commit.
*   **Wrapper**: The repo is a customization wrapper. `apiVersion` = Wrapper Commit. Core Commit is determined by the `evaka` submodule hash in the Wrapper repo.

## Data Flow

For each instance:

1.  **Fetch Status**:
    *   GET `https://<domain>/api/citizen/auth/status`
    *   Extract `apiVersion` (Commit Hash).

2.  **Resolve Customization Details**:
    *   Use GitHub API to fetch commit details for `apiVersion` from the mapped **Repository**.
    *   Extract: `message`, `date`, `author`.

3.  **Resolve Core Details**:
    *   **If Type is Core**: Core details are the same as Customization details.
    *   **If Type is Wrapper**:
        *   **CRITICAL**: Do NOT look up the submodule state from the `main` or `master` branch. The wrapper repository may have advanced since the production deployment.
        *   **Step 3a**: Identify the exact commit of the wrapper repository currently running. This is the `apiVersion` hash retrieved in Step 1.
        *   **Step 3b**: Query the GitHub API to get the content of the `evaka` path *specifically at that commit SHA*.
            *   Endpoint: `GET /repos/{owner}/{repo}/contents/evaka?ref={apiVersion}`
            *   The response will be a JSON object containing a `sha` field. This `sha` is the commit hash of the core `espoon-voltti/evaka` repository that is linked in that specific wrapper commit.
        *   **Step 3c**: Use this extracted SHA to fetch commit details from `espoon-voltti/evaka`.

4.  **Push to Datadog**:
    *   Send data to Datadog.
    *   **Recommended Method**: Submit as a Metric or Event.
    *   **Metric Name**: `evaka.version_info`
    *   **Tags**:
        *   `instance:<domain>`
        *   `repo_custom:<repo_name>`
        *   `commit_custom:<short_hash>`
        *   `date_custom:<iso_date>`
        *   `repo_core:espoon-voltti/evaka`
        *   `commit_core:<short_hash>`
        *   `date_core:<iso_date>`
    *   *Note*: To display commit messages, sending an **Event** or using **Logs** is preferred over metrics due to cardinality limits.
    *   **Proposed Event**:
        *   Title: `Deployment detected for <Instance>`
        *   Text: `Customization: <msg> (<hash>)\nCore: <msg> (<hash>)`
        *   Tags: `instance:<domain>`, `source:evaka-monitor`

## Implementation Plan

### 1. Project Setup
*   Initialize TypeScript Node.js project.
*   Install dependencies: `axios`, `datadog-api-client` (or similar), `dotenv`.

### 2. Implementation
*   Create `InstanceConfig` interface.
*   Implement `fetchCurrentVersion(domain)` function.
*   Implement `fetchCommitDetails(repo, commitHash)` function.
*   Implement `fetchSubmoduleHash(repo, commitHash, path)` function.
*   Implement `sendToDatadog(data)` function.
*   Main loop to process all instances in parallel.

### 3. Deployment

#### Hosting & Costs
*   **GitHub Actions**: This is an ideal host.
*   **Public Repositories**: GitHub provides **unlimited free minutes** for standard runners on public repositories.
*   **Private Repositories**: Free accounts get 2,000 minutes/month. This tool (running every 15 mins) would consume ~720 minutes/month (assuming <1 min execution time), which fits comfortably within the free tier.

#### Security (Secrets)
**NEVER** commit API keys to code. Use GitHub Secrets:
1.  Go to your repository on GitHub.
2.  Navigate to **Settings** > **Secrets and variables** > **Actions**.
3.  Click **New repository secret**.
4.  Name: `DATADOG_API_KEY`.
5.  Value: Paste your Datadog API Key.
6.  Repeat for `DD_SITE` (e.g., `datadoghq.eu`) if needed.

#### Workflow Configuration
Create `.github/workflows/monitor.yml`:
*   **Schedule**: `cron: '*/15 * * * *'` (Runs every 15 minutes).
*   **Environment Variables**: Map secrets to env vars in the workflow steps.
    ```yaml
    env:
      DATADOG_API_KEY: ${{ secrets.DATADOG_API_KEY }}
      GH_TOKEN: ${{ secrets.GITHUB_TOKEN }} # Built-in token for rate limits
    ```

## Estimated Cost
*   **Hosting**: GitHub Actions (Free tier for public repos, 2000 mins/month for private).
*   **Datadog**: Free tier (limited) or Pro. Custom metrics/events usage depends on volume (low volume here).
