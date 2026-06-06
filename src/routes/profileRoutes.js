const express = require('express');
const rateLimit = require('express-rate-limit');
const profileController = require('../controllers/profileController');

const router = express.Router();

// Define general rate limiter (100 requests per 15 mins per IP)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Too many requests from this IP, please try again after 15 minutes.' },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Define strict rate limiter for heavy external API operations (15 requests per 15 mins per IP)
const analysisLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15,
  message: { error: 'Too many profile analyses requested. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Mount Rate Limiters on Routes
router.post('/profiles/analyze/:username', analysisLimiter, profileController.analyzeProfile);
router.get('/profiles', generalLimiter, profileController.getAllProfiles);
router.get('/profiles/:username', generalLimiter, profileController.getProfile);
router.delete('/profiles/:username', generalLimiter, profileController.deleteProfile);

// Extra Stats & Insights Routes
router.get('/stats/top-followed', generalLimiter, profileController.getTopFollowedProfiles);
router.get('/stats/languages', generalLimiter, profileController.getAggregateLanguages);

module.exports = router;
