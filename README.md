# eVaka Version Monitor

A monitoring tool that tracks deployed versions of [eVaka](https://github.com/espoon-voltti/evaka) instances across Finnish municipalities and reports the data to Datadog.

## Overview

This tool monitors 12 eVaka instances, fetching:
- The currently deployed version from each instance's public API
- Commit details (message, date, author) from GitHub
- For wrapper repositories, the linked core eVaka version via submodule resolution

Data is sent to Datadog as events for visualization and alerting.

## Monitored Instances

| Instance | Domain | Repository | Type |
|----------|--------|------------|------|
| Espoo | espoonvarhaiskasvatus.fi | espoon-voltti/evaka | Core |
| Oulu | varhaiskasvatus.ouka.fi | Oulunkaupunki/evakaoulu | Wrapper |
| Turku | evaka.turku.fi | City-of-Turku/evakaturku | Wrapper |
| Hämeenkyrö | evaka.hameenkyro.fi | Tampere/trevaka | Wrapper |
| Kangasala | evaka.kangasala.fi | Tampere/trevaka | Wrapper |
| Lempäälä | evaka.lempaala.fi | Tampere/trevaka | Wrapper |
| Nokia | evaka.nokiankaupunki.fi | Tampere/trevaka | Wrapper |
| Orivesi | evaka.orivesi.fi | Tampere/trevaka | Wrapper |
| Pirkkala | evaka.pirkkala.fi | Tampere/trevaka | Wrapper |
| Tampere | varhaiskasvatus.tampere.fi | Tampere/trevaka | Wrapper |
| Vesilahti | evaka.vesilahti.fi | Tampere/trevaka | Wrapper |
| Ylöjärvi | evaka.ylojarvi.fi | Tampere/trevaka | Wrapper |

## Setup

### Prerequisites

- Node.js 18+ installed
- A Datadog account
- A GitHub account (for Actions)

### Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/Wnt/evaka-version-tracker.git
   cd evaka-version-tracker
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file for local testing:
   ```bash
   DATADOG_API_KEY=your_api_key_here
   DD_SITE=datadoghq.eu
   GH_TOKEN=your_github_token_here
   ```

4. Run tests:
   ```bash
   npm test
   ```

5. Run locally (dry run mode):
   ```bash
   DRY_RUN=true npx ts-node src/index.ts
   ```

## Obtaining API Tokens

### Datadog API Key

1. Log in to your [Datadog account](https://app.datadoghq.com/) (or [EU](https://app.datadoghq.eu/))
2. Navigate to **Organization Settings** → **API Keys**
   - Or go directly to: `https://app.datadoghq.com/organization-settings/api-keys`
3. Click **+ New Key**
4. Give it a name (e.g., "eVaka Version Monitor")
5. Click **Create Key**
6. Copy the key value — you won't be able to see it again

> **Note:** Determine your `DD_SITE` value based on your Datadog region:
> - US1: `datadoghq.com` (default)
> - US3: `us3.datadoghq.com`
> - US5: `us5.datadoghq.com`
> - EU: `datadoghq.eu`
> - AP1: `ap1.datadoghq.com`

### GitHub Token (for GitHub Actions)

The workflow uses the built-in `GITHUB_TOKEN` which is automatically provided by GitHub Actions. No manual token creation is needed for the GitHub API calls.

If you need higher rate limits or access to private repositories, you can create a Personal Access Token:

1. Go to [GitHub Settings → Developer settings → Personal access tokens → Fine-grained tokens](https://github.com/settings/tokens?type=beta)
2. Click **Generate new token**
3. Set a name and expiration
4. Under **Repository access**, select "Public Repositories (read-only)"
5. No additional permissions are needed for reading public repository data
6. Click **Generate token**
7. Copy the token value

## Deploying with GitHub Actions

### Step 1: Add Repository Secrets

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add the following secrets:

   | Secret Name | Value | Required |
   |-------------|-------|----------|
   | `DATADOG_API_KEY` | Your Datadog API key | Yes |
   | `DD_SITE` | Your Datadog site (e.g., `datadoghq.eu`) | No (defaults to `datadoghq.com`) |

### Step 2: Enable GitHub Actions Scheduled Workflows

GitHub Actions scheduled workflows (cron) have some important behaviors to know:

#### For New or Forked Repositories

Scheduled workflows are **disabled by default** on:
- Forked repositories
- Repositories with no recent activity (60+ days)

**To enable scheduled workflows:**

1. Go to your repository on GitHub
2. Click the **Actions** tab
3. If you see a banner saying "Workflows aren't being run on this forked repository", click **I understand my workflows, go ahead and enable them**
4. For repositories without recent activity, simply push a commit or manually trigger the workflow

#### Manual Trigger (Recommended for First Run)

To verify everything works before waiting for the cron schedule:

1. Go to **Actions** tab in your repository
2. Select **eVaka Version Monitor** from the left sidebar
3. Click **Run workflow** dropdown on the right
4. Click the green **Run workflow** button

#### Cron Schedule Details

The workflow is configured to run every 15 minutes:
```yaml
on:
  schedule:
    - cron: '*/15 * * * *'
```

> **Note:** GitHub Actions cron jobs may experience delays during periods of high load. The scheduled time is not guaranteed to be exact.

### Step 3: Verify Deployment

1. After the first run, go to **Actions** tab
2. Check the workflow run logs for any errors
3. Verify events appear in Datadog:
   - Go to **Events** → **Explorer** in Datadog
   - Search for `source:evaka-monitor`

## Datadog Events

The monitor sends events to Datadog with the following structure:

- **Title:** `eVaka deployment: <Instance Name>`
- **Tags:**
  - `instance:<domain>`
  - `source:evaka-monitor`
  - `repo_custom:<repository>`
  - `commit_custom:<short_hash>`
  - `repo_core:espoon-voltti/evaka`
  - `commit_core:<short_hash>`

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `DATADOG_API_KEY` | Datadog API key for sending events | Yes | - |
| `DD_SITE` | Datadog site/region | No | `datadoghq.com` |
| `GH_TOKEN` | GitHub token for API requests | No | - |
| `DRY_RUN` | Set to `true` to skip sending to Datadog | No | `false` |

## Project Structure

```
├── src/
│   ├── api/
│   │   ├── datadog.ts    # Datadog event submission
│   │   ├── github.ts     # GitHub API client
│   │   └── status.ts     # Instance version fetcher
│   ├── service/
│   │   └── resolver.ts   # Version resolution logic
│   ├── config.ts         # Instance configuration
│   ├── types.ts          # TypeScript interfaces
│   └── index.ts          # Main entry point
├── tests/                # Test suites
├── specs/                # Specification documents
└── .github/workflows/    # GitHub Actions workflow
```

## License

ISC
