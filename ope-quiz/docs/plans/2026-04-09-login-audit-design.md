# Login Audit System - Design

**Date:** 2026-04-09
**Status:** Approved

## Goal

Add login auditing to track who logs in, when, from where, and capture failed login attempts with the values entered. This is a personal app with a single user — the goal is to detect if others are trying to use it.

## Approach

**Enfoque A: Logging in NextAuth authorize()** — capture audit data directly in the `authorize()` function, passing IP and User-Agent from the login form.

## Database

New table `auditLogs` in PostgreSQL (Neon), defined with Drizzle ORM:

| Field | Type | Description |
|-------|------|-------------|
| `id` | serial PK | Identifier |
| `timestamp` | timestamp (default now) | When the attempt happened |
| `event` | text | `login_success` or `login_failure` |
| `usernameAttempted` | text | What the user typed as username |
| `passwordAttempted` | text | What the user typed as password (`***` on success) |
| `ipAddress` | text | Origin IP address |
| `userAgent` | text | Browser/device |
| `success` | boolean | true/false |

## Data Flow

1. **Login page** adds `ipAddress` and `userAgent` as hidden fields in the POST to NextAuth
   - `userAgent` from `navigator.userAgent`
   - `ipAddress` from a `/api/client-info` endpoint that reads `x-forwarded-for` headers
2. **authorize()** receives the extra fields in `credentials`, validates credentials, inserts audit record
3. **Audit page** at `/admin/audit` displays the logs

## Audit Page (`/admin/audit`)

- Table with all fields, ordered by timestamp descending
- Green rows for success, red for failure
- Last 50 records with "load more" pagination
- Protected by existing auth middleware
- Accessible from navbar

## Cleanup

- Remove `/api/debug` endpoint (exposes env vars)
- Remove `console.log` from auth.ts that logs credential lengths
