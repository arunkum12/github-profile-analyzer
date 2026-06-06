# GitHub Profile Analyzer

A Node.js and Express backend application integrated with MySQL to analyze public GitHub profiles. It queries GitHub's REST API, aggregates key metrics (stars, account age, and programming language distributions), calculates a customized profile score, and caches findings locally inside a database.

---

## API Summary

**API Base URL**

* `POST /api/profiles/analyze/:username`
* `GET /api/profiles`
* `GET /api/profiles/:username`
* `DELETE /api/profiles/:username`

**Swagger Docs:**
* `/api-docs`

---

## Project Overview

This service helps users analyze GitHub profile performance. It exposes a simple API that retrieves a user's details and repositories, processes metrics, and returns a structural data output. The analysis is cached inside a MySQL database for high-performance indexing, historical querying, and sorting.

### Features
- **Profile Score Calculation**: Computes profile score using the formula `(Followers × 2) + Public Repos + (Total Stars × 3)`.
- **Repository Language Statistics**: Counts the occurrences of language usage across repositories.
- **Advanced Querying**: Paginate, sort, and search profiles stored in the local cache.
- **Top Followed API**: Exposes the top 5 profiles based on follower count.
- **Aggregate Language API**: Provides aggregate counts of programming languages across all analyzed users.
- **Interactive Swagger UI**: Documented API spec exposed at `/api-docs`.
- **Security Protections**: Parameterized SQL queries, regular expression input filtering, custom API rate-limiters, and secure headers using Helmet.

---

## Tech Stack

- **Runtime**: Node.js (v18+)
- **Framework**: Express.js
- **Database**: MySQL (v5.7+ / v8.0+)
- **HTTP Client**: Axios (for integration with GitHub API)
- **Security Tools**:
  - `helmet`: Protects standard HTTP headers from leaks.
  - `express-rate-limit`: Prevents Denial of Service and API key overuse.
- **Documentation**: Swagger UI Express

---

## Environment Variables

The application relies on configuration loaded from a `.env` file at the root of the project. A `.env.example` file is included for your convenience.

Create a `.env` file in the `github-profile-analyzer/` folder:

```env
PORT=3000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_db_password
DB_NAME=github_analyzer

# Optional: GitHub Personal Access Token
# Strongly recommended to increase rate limits from 60 requests/hr to 5000/hr
GITHUB_TOKEN=your_github_token
```

---

## Database Setup

1. Make sure you have a running instance of MySQL.
2. Initialize the database schema using the provided SQL script:

```bash
mysql -u root -p < database.sql
```

Alternatively, copy the queries inside [database.sql](database.sql) and execute them inside your MySQL workbench/CLI.

---

## Installation & Running Locally

1. Navigate to the project folder:
   ```bash
   cd github-profile-analyzer
   ```
2. Install the dependencies:
   ```bash
   npm install
   ```
3. Run in development mode (hot reloading using `nodemon`):
   ```bash
   npm run dev
   ```
4. Run in production mode:
   ```bash
   npm start
   ```

The server will spin up and bind locally on `http://127.0.0.1:3000`.

---

## API Endpoints

### 1. Analyze GitHub Profile
- **Endpoint**: `POST /api/profiles/analyze/:username`
- **Rate Limit**: 15 requests per 15 minutes.
- **Sample Request**:
  `POST http://127.0.0.1:3000/api/profiles/analyze/octocat`
- **Response**:
  ```json
  {
    "username": "octocat",
    "name": "The Octocat",
    "bio": "Testing",
    "publicRepos": 8,
    "followers": 1000,
    "following": 10,
    "accountAgeDays": 4500,
    "totalStars": 250,
    "mostStarredRepo": "boysenberry-repo-1",
    "avgStarsPerRepo": 31.25,
    "profileScore": 2758,
    "languageStats": {
      "Ruby": 2,
      "JavaScript": 5
    },
    "profileUrl": "https://github.com/octocat",
    "avatarUrl": "https://avatars.githubusercontent.com/u/5832347?v=4",
    "analyzedAt": "2026-06-06T05:30:00.000Z"
  }
  ```

### 2. Get All Profiles
- **Endpoint**: `GET /api/profiles`
- **Query Params**:
  - `page`: Page index (default: `1`)
  - `limit`: Records per page (default: `10`, max: `100`)
  - `search`: Search query matching username, name, or bio.
  - `sortBy`: Fields like `profile_score`, `followers`, `total_stars`, `analyzed_at` (default: `analyzed_at`)
  - `sortOrder`: `ASC` or `DESC` (default: `DESC`)
- **Sample Request**:
  `GET http://127.0.0.1:3000/api/profiles?page=1&limit=5&sortBy=profile_score&sortOrder=DESC`

### 3. Get Single Profile
- **Endpoint**: `GET /api/profiles/:username`
- **Sample Request**:
  `GET http://127.0.0.1:3000/api/profiles/octocat`

### 4. Delete Profile
- **Endpoint**: `DELETE /api/profiles/:username`
- **Sample Request**:
  `DELETE http://127.0.0.1:3000/api/profiles/octocat`

### 5. Top Followed Profiles (Extra)
- **Endpoint**: `GET /api/stats/top-followed`
- **Description**: Returns top 5 analyzed profiles by follower count.

### 6. Aggregate Language Stats (Extra)
- **Endpoint**: `GET /api/stats/languages`
- **Description**: Returns sums of programming languages across all repositories.

### 7. Swagger Documentation
- **Endpoint**: `/api-docs`
- **Description**: Visit this route in your browser (`http://127.0.0.1:3000/api-docs`) to view the interactive API interface.

---

## Postman Collection

You can import the provided [postman_collection.json](postman_collection.json) directly into Postman to quickly test all the endpoints. It comes preconfigured with default request shapes and an environment variable `baseUrl` defaulted to `http://127.0.0.1:3000`.

---

## Deployment URL

The backend is fully configured for easy containerization/deployment.
- **Backend Deployment Option**: [Render](https://render.com) or [Railway](https://railway.app). Ensure env variables are configured under the hosting console.
- **Database Deployment Option**: [Railway MySQL](https://railway.app) or remote MySQL server instance. Update connection URI details in host variables.

---

## Author

- **Name**: Antigravity AI (Pair-programming Assistant)
- **Contact**: Google DeepMind
