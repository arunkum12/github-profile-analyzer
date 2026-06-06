const axios = require('axios');
require('dotenv').config();

// Create an axios instance for GitHub API with default headers
const githubApi = axios.create({
  baseURL: 'https://api.github.com',
  headers: {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'github-profile-analyzer'
  }
});

// Interceptor to add Authorization header if token is available
githubApi.interceptors.request.use((config) => {
  const token = process.env.GITHUB_TOKEN;
  if (token) {
    config.headers['Authorization'] = `token ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

/**
 * Fetches user profile from GitHub
 * @param {string} username 
 * @returns {Promise<object>}
 */
async function getProfile(username) {
  try {
    const response = await githubApi.get(`/users/${username}`);
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      const notFoundErr = new Error('GitHub profile not found');
      notFoundErr.status = 404;
      throw notFoundErr;
    }
    if (error.response && error.response.status === 403) {
      const rateLimitErr = new Error('GitHub API rate limit exceeded. Please configure a GITHUB_TOKEN.');
      rateLimitErr.status = 403;
      throw rateLimitErr;
    }
    throw error;
  }
}

/**
 * Fetches user repositories from GitHub
 * @param {string} username 
 * @returns {Promise<Array>}
 */
async function getRepositories(username) {
  try {
    // Fetch first 100 repositories
    const response = await githubApi.get(`/users/${username}/repos?per_page=100`);
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return [];
    }
    throw error;
  }
}

/**
 * Analyzes a GitHub user profile and returns aggregated insights
 * @param {string} username 
 * @returns {Promise<object>}
 */
async function analyzeGitHubProfile(username) {
  const profileData = await getProfile(username);
  const repos = await getRepositories(username);

  // 1. Calculate stars
  let totalStars = 0;
  let mostStarredRepo = null;
  let maxStars = -1;

  // 2. Count language distribution
  const languageCounts = {};

  repos.forEach(repo => {
    // Sum stars
    const stars = repo.stargazers_count || 0;
    totalStars += stars;

    // Track most starred repository
    if (stars > maxStars) {
      maxStars = stars;
      mostStarredRepo = repo.name;
    }

    // Language statistics
    if (repo.language) {
      languageCounts[repo.language] = (languageCounts[repo.language] || 0) + 1;
    }
  });

  // Calculate average stars per repository
  const publicReposCount = repos.length;
  const avgStarsPerRepo = publicReposCount > 0 
    ? parseFloat((totalStars / publicReposCount).toFixed(2)) 
    : 0.00;

  // Calculate Account Age in Days
  const createdAt = new Date(profileData.created_at);
  const now = new Date();
  const accountAgeDays = Math.max(0, Math.floor((now - createdAt) / (1000 * 60 * 60 * 24)));

  // Calculate GitHub Profile Score
  // Score = (Followers * 2) + Public Repos + (Total Stars * 3)
  const followers = profileData.followers || 0;
  const publicRepos = profileData.public_repos || 0;
  const profileScore = (followers * 2) + publicRepos + (totalStars * 3);

  return {
    username: profileData.login,
    name: profileData.name || null,
    bio: profileData.bio || null,
    publicRepos: profileData.public_repos || 0,
    followers: followers,
    following: profileData.following || 0,
    accountAgeDays: accountAgeDays,
    totalStars: totalStars,
    mostStarredRepo: mostStarredRepo,
    avgStarsPerRepo: avgStarsPerRepo,
    profileScore: profileScore,
    languageStats: languageCounts,
    profileUrl: profileData.html_url,
    avatarUrl: profileData.avatar_url
  };
}

module.exports = {
  getProfile,
  getRepositories,
  analyzeGitHubProfile
};
