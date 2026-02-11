# Implementation Plan: Datadog Logs + Dashboard Table

## Problem Statement
The current implementation sends data to Datadog as **Events**, which don't display well in table format. To show commit dates and messages in a proper table widget on a Datadog dashboard, we need to send the data as **Logs** instead.

## Proposed Approach
1. Modify the Datadog integration to send structured logs instead of events
2. Update the README with instructions for creating a Datadog dashboard with a table widget
3. Ensure the CLI continues to report success/failure status

## Current State
- Data is sent via `POST /api/v1/events` (Events API)
- Events contain tags with commit info but aren't queryable as structured data
- DRY_RUN mode exists for local testing without sending to Datadog

## Workplan

- [x] **Step 1: Add Datadog Logs API Integration**
  - Create `src/api/datadog-logs.ts` with `sendVersionLog()` function
  - Use Datadog HTTP Logs API: `POST https://http-intake.logs.{DD_SITE}/api/v2/logs`
  - Send structured JSON with attributes:
    - `instance_name`, `instance_domain`
    - `custom_repo`, `custom_commit`, `custom_date`, `custom_message`, `custom_author`
    - `core_repo`, `core_commit`, `core_date`, `core_message`, `core_author`
  - Add proper `ddsource`, `ddtags`, and `service` fields

- [x] **Step 2: Update Main Entry Point**
  - Modify `src/index.ts` to call `sendVersionLog()` instead of `sendDeploymentEvent()`
  - Keep existing success/failure reporting behavior
  - Optionally keep events as secondary notification (configurable)

- [x] **Step 3: Add Tests for Logs API**
  - Create `tests/api/datadog-logs.test.ts`
  - Mock the HTTP Logs API endpoint
  - Verify payload structure matches Datadog requirements

- [x] **Step 4: Update README with Dashboard Instructions**
  - Add section: "Creating a Datadog Dashboard"
  - Include steps to create a Table widget
  - Provide example query: `source:evaka-monitor`
  - Show how to configure columns (Instance, Custom Commit, Core Commit, Dates, Messages)

- [x] **Step 5: Run Tests & Verify**
  - Run full test suite
  - Test locally with real Datadog API key
  - Verify logs appear in Datadog Log Explorer

## Technical Details

### Datadog HTTP Logs API
```
POST https://http-intake.logs.{DD_SITE}/api/v2/logs
Headers:
  Content-Type: application/json
  DD-API-KEY: {api_key}

Body (array of log entries):
[
  {
    "ddsource": "evaka-monitor",
    "ddtags": "env:production",
    "hostname": "github-actions",
    "service": "evaka-version-monitor",
    "message": "Version info for Espoo",
    "instance_name": "Espoo",
    "instance_domain": "espoonvarhaiskasvatus.fi",
    "custom_repo": "espoon-voltti/evaka",
    "custom_commit": "abc1234",
    "custom_date": "2026-02-10T12:00:00Z",
    "custom_message": "Fix bug in API",
    "core_repo": "espoon-voltti/evaka",
    "core_commit": "abc1234",
    "core_date": "2026-02-10T12:00:00Z",
    "core_message": "Fix bug in API"
  }
]
```

### Dashboard Table Widget Configuration
- **Data Source**: Logs
- **Query**: `source:evaka-monitor`
- **Group By**: `@instance_name`
- **Columns**: 
  - Instance Name (`@instance_name`)
  - Custom Commit (`@custom_commit`)
  - Custom Date (`@custom_date`)
  - Custom Message (`@custom_message`)
  - Core Commit (`@core_commit`)
  - Core Date (`@core_date`)

## Notes
- Logs are better suited for structured data display than Events
- The Logs API accepts batched entries (all 12 instances in one request)
- Consider keeping Events for alert notifications (optional enhancement)
- DD_SITE environment variable already exists and will be reused
