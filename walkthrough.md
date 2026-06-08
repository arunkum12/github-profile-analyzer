# Walkthrough & Security Audit Report

This document outlines the implementation details, verification results, and security posture of the **GitHub Profile Analyzer** backend application.

---

## What Was Accomplished

We created a Node.js, Express, and MySQL backend application inside `d:\projects\github-profile-analyzer` to analyze public GitHub profiles and cache findings locally.

### Directory Structure Created
```text
github-profile-analyzer/
├── src/
│   ├── config/
│   │   ├── db.js             # MySQL Connection Pool (supports Mock Mode)
│   │   └── swagger.json      # Swagger OpenAPI 3.0 Specs
│   ├── controllers/
│   │   └── profileController.js # API Controller & Username regex validation
│   ├── models/
│   │   └── profileModel.js   # SQL Parameterized Queries
│   ├── routes/
│   │   └── profileRoutes.js  # Express Router & dual Rate-limiters
│   ├── services/
│   │   └── githubService.js  # GitHub API Integration (Axios client)
│   └── app.js                # Express Server Entrypoint
├── .env                      # Local environment variables
├── .env.example              # Config variables template
├── database.sql              # MySQL Schema file with indexes
├── package.json              # NPM Dependencies & Scripts
├── postman_collection.json   # Pre-configured Postman collection for testing
├── test-integration.js       # End-to-end integration test runner
└── README.md                 # Complete setup documentation
```

---

## SecureCoder Security Audit

**Status**: Completed (Manual Design Audit)
**Scanned Files**: 10
**Vulnerabilities Found**: 0
**Vulnerabilities Fixed**: 0

> [!NOTE]
> The automated scanner extension was inactive (no local API port configuration found). As a fallback, we conducted a manual design audit on all 10 newly created source files to verify compliance with the `mandatory-secure-web-skills` rules.

### Design Audit Verification Table

| File | Security Guideline | Status | Implementation Details |
|---|---|---|---|
| `db.js` | SQL Injection Prevention | **Secure** | Exposes connection pool utilizing `mysql2/promise` parameterized bindings. |
| `profileModel.js` | SQL Injection Prevention | **Secure** | Parameterizes all queries. Dynamic `ORDER BY` columns and sort directions are strictly matched against explicit column/order allow-lists before query parsing. |
| `profileController.js` | Input Validation | **Secure** | Sanitizes user inputs. Validate GitHub usernames against regex: `/^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i` (replaces path breakouts, scripts, or SQL injections). |
| `profileController.js` | Error Technical Leaks | **Secure** | Captures all runtime exceptions. Database syntax, queries, and system stack traces are logged locally but generic internal messages are returned to the API client. |
| `profileRoutes.js` | Rate Limiting | **Secure** | Establishes a general rate limiter (100 req/15 min) and a strict endpoint limiter (15 req/15 min) on profile analysis to prevent API resource abuse. |
| `app.js` | Security Headers | **Secure** | Mounts `helmet` middleware to enforce secure HTTP headers (nosniff, XSS protection, anti-clickjacking), and overrides CSP on `/api-docs` to allow Swagger fetch requests. |
| `app.js` | Bind Policy | **Secure** | Restricts local server bindings exclusively to loopback interface `127.0.0.1` during testing. |
| `githubService.js` | Secrets Exposure | **Secure** | Pulls `GITHUB_TOKEN` from server environment variables rather than hardcoding credentials inside source code files. |

---

## Verification & Integration Testing

We developed and ran an end-to-end integration suite (`test-integration.js`) that boots the Express server in mock database mode and executes HTTP API calls to verify logic.

### Integration Test Execution Output

```text
Spinning up integration test server on port 3001...
[Server]: Database connected successfully (Mock In-Memory Mode).
[Server]: GitHub Profile Analyzer API is running on http://127.0.0.1:3001

======================================
STARTING INTEGRATION TESTS
======================================

Test 1: GET / - Server status...
[Server]: API Documentation is available on http://127.0.0.1:3001/api-docs
Status: 200
Response: {
  message: 'Welcome to the GitHub Profile Analyzer API.',
  documentation: '/api-docs',
  status: 'Running'
}
✅ Test 1 Passed.

Test 2: POST /api/profiles/analyze/invalid_username! - SQL/injection validation...
Status: 400
Response: {
  error: 'Invalid username format. GitHub usernames must be 1-39 characters, contain only alphanumeric characters or hyphens, and cannot start/end with a hyphen.'
}
✅ Test 2 Passed (Rejection of invalid usernames works).

Test 3: POST /api/profiles/analyze/octocat - Real GitHub API fetch & insert...
[Server]: Analyzing GitHub profile for username: octocat
Status: 200
Username: octocat
Profile Score: 110198
Avatar URL: https://avatars.githubusercontent.com/u/583231?v=4
✅ Test 3 Passed.

Test 4: POST /api/profiles/analyze/google - Second profile...
[Server]: Analyzing GitHub profile for username: google
Status: 200
Username: google
Profile Score: 384667
✅ Test 4 Passed.

Test 5: GET /api/profiles - Fetch all cached entries...
Status: 200
Total Stored Items: 2
List data (Usernames & Scores): [ 'google (384667)', 'octocat (110198)' ]
✅ Test 5 Passed.

Test 6: GET /api/profiles?search=octo - Search filter...
Status: 200
Found usernames: [ 'octocat' ]
✅ Test 6 Passed.

Test 7: GET /api/profiles/octocat - Retrieve single detailed cache...
Status: 200
Profile Score retrieved: 110198
✅ Test 7 Passed.

Test 8: GET /api/stats/top-followed - Extra stats api...
Status: 200
Top Followed: [
  {
    username: 'google',
    name: 'Google',
    followers: 73611,
    profileScore: 384667,
    avatarUrl: 'https://avatars.githubusercontent.com/u/1342004?v=4'
  },
  {
    username: 'octocat',
    name: 'The Octocat',
    followers: 22857,
    profileScore: 110198,
    avatarUrl: 'https://avatars.githubusercontent.com/u/583231?v=4'
  }
]
✅ Test 8 Passed.

Test 9: GET /api/stats/languages - Extra languages stats api...
Status: 200
Languages stats aggregated: {
  Python: 25,
  JavaScript: 16,
  Java: 8,
  Go: 7,
  Rust: 5,
  TypeScript: 5,
  HTML: 4,
  C: 4,
  Shell: 4,
  'C++': 4,
  Swift: 3,
  Kotlin: 3,
  R: 2,
  Ruby: 1,
  CSS: 1,
  'C#': 1,
  ABAP: 1,
  'Jupyter Notebook': 1,
  Dart: 1
}
✅ Test 9 Passed.

Test 10: DELETE /api/profiles/octocat - Delete profile...
Status: 200
Response: { message: "Profile for 'octocat' successfully deleted." }
Verifying deleted profile cannot be found...
Status of deleted check: 404
✅ Test 10 Passed.

======================================
ALL INTEGRATION TESTS PASSED SUCCESSFULLY!
======================================

Stopping integration test server...
```
