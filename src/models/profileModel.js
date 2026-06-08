const { pool } = require('../config/db');

/**
 * Inserts a new profile or updates an existing one on duplicate username.
 * @param {object} profile 
 * @returns {Promise<object>}
 */
async function createOrUpdateProfile(profile) {
  const query = `
    INSERT INTO profiles (
      username, name, bio, public_repos, followers, following, 
      account_age_days, total_stars, most_starred_repo, 
      avg_stars_per_repo, profile_score, language_stats, 
      profile_url, avatar_url
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      name = VALUES(name),
      bio = VALUES(bio),
      public_repos = VALUES(public_repos),
      followers = VALUES(followers),
      following = VALUES(following),
      account_age_days = VALUES(account_age_days),
      total_stars = VALUES(total_stars),
      most_starred_repo = VALUES(most_starred_repo),
      avg_stars_per_repo = VALUES(avg_stars_per_repo),
      profile_score = VALUES(profile_score),
      language_stats = VALUES(language_stats),
      profile_url = VALUES(profile_url),
      avatar_url = VALUES(avatar_url)
  `;

  const values = [
    profile.username,
    profile.name,
    profile.bio,
    profile.publicRepos,
    profile.followers,
    profile.following,
    profile.accountAgeDays,
    profile.totalStars,
    profile.mostStarredRepo,
    profile.avgStarsPerRepo,
    profile.profileScore,
    JSON.stringify(profile.languageStats),
    profile.profileUrl,
    profile.avatarUrl
  ];

  await pool.execute(query, values);
  return getProfileByUsername(profile.username);
}

/**
 * Fetches a single profile by username
 * @param {string} username 
 * @returns {Promise<object|null>}
 */
async function getProfileByUsername(username) {
  const query = 'SELECT * FROM profiles WHERE username = ?';
  const [rows] = await pool.execute(query, [username]);
  
  if (rows.length === 0) return null;
  
  const profile = rows[0];
  // Parse serialized language stats
  try {
    profile.language_stats = JSON.parse(profile.language_stats || '{}');
  } catch (e) {
    profile.language_stats = {};
  }
  return profile;
}

/**
 * Deletes a profile by username
 * @param {string} username 
 * @returns {Promise<boolean>}
 */
async function deleteProfileByUsername(username) {
  const query = 'DELETE FROM profiles WHERE username = ?';
  const [result] = await pool.execute(query, [username]);
  return result.affectedRows > 0;
}

/**
 * Fetches profiles with filtering, sorting, and pagination
 * @param {object} params
 * @returns {Promise<Array>}
 */
async function getAllProfiles({ limit, offset, search, sortBy, sortOrder }) {
  // 1. Enforce strict allow-list for columns and sort orders to prevent SQL Injection
  const allowedSortColumns = [
    'username', 'name', 'public_repos', 'followers', 'following', 
    'account_age_days', 'total_stars', 'profile_score', 'analyzed_at'
  ];
  const allowedSortOrders = ['ASC', 'DESC'];

  const cleanSortBy = allowedSortColumns.includes(sortBy) ? sortBy : 'analyzed_at';
  const cleanSortOrder = allowedSortOrders.includes(sortOrder?.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';

  // 2. Build parameterized query
  let query = 'SELECT * FROM profiles';
  const queryParams = [];

  if (search) {
    query += ' WHERE username LIKE ? OR name LIKE ? OR bio LIKE ?';
    const searchPattern = `%${search}%`;
    queryParams.push(searchPattern, searchPattern, searchPattern);
  }

  // Inject sanitized ordering
  query += ` ORDER BY ${cleanSortBy} ${cleanSortOrder}`;

  // Add pagination limits (requires integer binding)
  query += ' LIMIT ? OFFSET ?';
  queryParams.push(limit, offset);

  const [rows] = await pool.query(query, queryParams);

  // Parse language stats for each profile
  return rows.map(profile => {
    try {
      profile.language_stats = JSON.parse(profile.language_stats || '{}');
    } catch (e) {
      profile.language_stats = {};
    }
    return profile;
  });
}

/**
 * Counts the total number of profiles matching a search filter
 * @param {object} params
 * @returns {Promise<number>}
 */
async function countAllProfiles({ search }) {
  let query = 'SELECT COUNT(*) as total FROM profiles';
  const queryParams = [];

  if (search) {
    query += ' WHERE username LIKE ? OR name LIKE ? OR bio LIKE ?';
    const searchPattern = `%${search}%`;
    queryParams.push(searchPattern, searchPattern, searchPattern);
  }

  const [rows] = await pool.execute(query, queryParams);
  return rows[0].total;
}

/**
 * Gets top N profiles by follower count
 * @param {number} limit 
 * @returns {Promise<Array>}
 */
async function getTopFollowed(limit = 5) {
  const query = 'SELECT * FROM profiles ORDER BY followers DESC LIMIT ?';
  const [rows] = await pool.query(query, [limit]);
  
  return rows.map(profile => {
    try {
      profile.language_stats = JSON.parse(profile.language_stats || '{}');
    } catch (e) {
      profile.language_stats = {};
    }
    return profile;
  });
}

/**
 * Aggregates language counts from all profiles to find language stats
 * @returns {Promise<object>}
 */
async function getAggregateLanguageStats() {
  const query = 'SELECT language_stats FROM profiles';
  const [rows] = await pool.execute(query);
  
  const combinedStats = {};
  
  rows.forEach(row => {
    try {
      const stats = JSON.parse(row.language_stats || '{}');
      Object.entries(stats).forEach(([lang, count]) => {
        combinedStats[lang] = (combinedStats[lang] || 0) + count;
      });
    } catch (e) {
      // Ignore parse errors on individual records
    }
  });
  
  // Sort language stats by popularity
  return Object.entries(combinedStats)
    .sort((a, b) => b[1] - a[1])
    .reduce((acc, [lang, count]) => {
      acc[lang] = count;
      return acc;
    }, {});
}

module.exports = {
  createOrUpdateProfile,
  getProfileByUsername,
  deleteProfileByUsername,
  getAllProfiles,
  countAllProfiles,
  getTopFollowed,
  getAggregateLanguageStats
};
