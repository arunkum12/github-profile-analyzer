const githubService = require('../services/githubService');
const profileModel = require('../models/profileModel');

// Regular expression to validate GitHub usernames:
// - Alphanumeric characters or single hyphens
// - Cannot start or end with a hyphen
// - Max 39 characters
const GITHUB_USERNAME_REGEX = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;

/**
 * Validate GitHub username syntax
 * @param {string} username 
 * @returns {boolean}
 */
function isValidUsername(username) {
  if (!username || typeof username !== 'string') return false;
  return GITHUB_USERNAME_REGEX.test(username);
}

/**
 * POST /api/profiles/analyze/:username
 * Analyzes and saves/updates a profile
 */
async function analyzeProfile(req, res, next) {
  try {
    const { username } = req.params;

    // 1. Strict input validation
    if (!isValidUsername(username)) {
      return res.status(400).json({ 
        error: 'Invalid username format. GitHub usernames must be 1-39 characters, contain only alphanumeric characters or hyphens, and cannot start/end with a hyphen.' 
      });
    }

    console.log(`Analyzing GitHub profile for username: ${username}`);
    
    // 2. Fetch from GitHub API and analyze
    const analyzedData = await githubService.analyzeGitHubProfile(username);
    
    // 3. Save or update in database
    const savedProfile = await profileModel.createOrUpdateProfile(analyzedData);

    // 4. Return clean, formatted response as requested
    return res.status(200).json({
      username: savedProfile.username,
      name: savedProfile.name,
      bio: savedProfile.bio,
      publicRepos: savedProfile.public_repos,
      followers: savedProfile.followers,
      following: savedProfile.following,
      accountAgeDays: savedProfile.account_age_days,
      totalStars: savedProfile.total_stars,
      mostStarredRepo: savedProfile.most_starred_repo,
      avgStarsPerRepo: parseFloat(savedProfile.avg_stars_per_repo),
      profileScore: savedProfile.profile_score,
      languageStats: savedProfile.language_stats,
      profileUrl: savedProfile.profile_url,
      avatarUrl: savedProfile.avatar_url,
      analyzedAt: savedProfile.analyzed_at
    });
  } catch (error) {
    // Check for custom status codes thrown by service
    if (error.status === 404) {
      return res.status(404).json({ error: 'GitHub profile not found on GitHub.' });
    }
    if (error.status === 403) {
      return res.status(403).json({ error: error.message });
    }
    
    // Delegate internal errors to the error-handling middleware
    next(error);
  }
}

/**
 * GET /api/profiles
 * Retrieves list of analyzed profiles with search, sort, and pagination
 */
async function getAllProfiles(req, res, next) {
  try {
    // 1. Validate and sanitize pagination parameters
    let page = parseInt(req.query.page, 10);
    let limit = parseInt(req.query.limit, 10);

    page = isNaN(page) || page < 1 ? 1 : page;
    limit = isNaN(limit) || limit < 1 ? 10 : limit;
    
    // Bound limit to prevent Denial of Service (DoS) by fetching massive datasets
    if (limit > 100) limit = 100;

    const offset = (page - 1) * limit;

    // 2. Sanitize search string
    let search = req.query.search;
    if (search && typeof search === 'string') {
      search = search.trim().slice(0, 100); // Truncate to reasonable length
    } else {
      search = null;
    }

    // 3. Retrieve sort inputs (model validates these against allow-lists)
    const sortBy = req.query.sortBy || 'analyzed_at';
    const sortOrder = req.query.sortOrder || 'DESC';

    // 4. Fetch profiles and total count
    const [profiles, totalCount] = await Promise.all([
      profileModel.getAllProfiles({ limit, offset, search, sortBy, sortOrder }),
      profileModel.countAllProfiles({ search })
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return res.status(200).json({
      data: profiles.map(p => ({
        id: p.id,
        username: p.username,
        name: p.name,
        bio: p.bio,
        publicRepos: p.public_repos,
        followers: p.followers,
        following: p.following,
        accountAgeDays: p.account_age_days,
        totalStars: p.total_stars,
        mostStarredRepo: p.most_starred_repo,
        avgStarsPerRepo: parseFloat(p.avg_stars_per_repo),
        profileScore: p.profile_score,
        languageStats: p.language_stats,
        profileUrl: p.profile_url,
        avatarUrl: p.avatar_url,
        analyzedAt: p.analyzed_at
      })),
      pagination: {
        totalItems: totalCount,
        totalPages: totalPages,
        currentPage: page,
        itemsPerPage: limit
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/profiles/:username
 * Retrieves a single profile from the local database
 */
async function getProfile(req, res, next) {
  try {
    const { username } = req.params;

    if (!isValidUsername(username)) {
      return res.status(400).json({ error: 'Invalid username format.' });
    }

    const profile = await profileModel.getProfileByUsername(username);
    
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found in database. Analyze the profile first.' });
    }

    return res.status(200).json({
      username: profile.username,
      name: profile.name,
      bio: profile.bio,
      publicRepos: profile.public_repos,
      followers: profile.followers,
      following: profile.following,
      accountAgeDays: profile.account_age_days,
      totalStars: profile.total_stars,
      mostStarredRepo: profile.most_starred_repo,
      avgStarsPerRepo: parseFloat(profile.avg_stars_per_repo),
      profileScore: profile.profile_score,
      languageStats: profile.language_stats,
      profileUrl: profile.profile_url,
      avatarUrl: profile.avatar_url,
      analyzedAt: profile.analyzed_at
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/profiles/:username
 * Deletes a profile from the database
 */
async function deleteProfile(req, res, next) {
  try {
    const { username } = req.params;

    if (!isValidUsername(username)) {
      return res.status(400).json({ error: 'Invalid username format.' });
    }

    const deleted = await profileModel.deleteProfileByUsername(username);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Profile not found in database.' });
    }

    return res.status(200).json({ message: `Profile for '${username}' successfully deleted.` });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/stats/top-followed
 * Returns the top 5 profiles analyzed by followers
 */
async function getTopFollowedProfiles(req, res, next) {
  try {
    const profiles = await profileModel.getTopFollowed(5);
    return res.status(200).json({
      data: profiles.map(p => ({
        username: p.username,
        name: p.name,
        followers: p.followers,
        profileScore: p.profile_score,
        avatarUrl: p.avatar_url
      }))
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/stats/languages
 * Returns aggregate language statistics
 */
async function getAggregateLanguages(req, res, next) {
  try {
    const stats = await profileModel.getAggregateLanguageStats();
    return res.status(200).json({
      languages: stats
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  analyzeProfile,
  getAllProfiles,
  getProfile,
  deleteProfile,
  getTopFollowedProfiles,
  getAggregateLanguages
};
