-- Create Database if not exists
CREATE DATABASE IF NOT EXISTS github_analyzer;

USE github_analyzer;

-- Drop table if it exists to allow fresh initialization if needed
-- DROP TABLE IF EXISTS profiles;

-- Create profiles table with extra insights
CREATE TABLE IF NOT EXISTS profiles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255),
    bio TEXT,
    public_repos INT DEFAULT 0,
    followers INT DEFAULT 0,
    following INT DEFAULT 0,
    account_age_days INT DEFAULT 0,
    total_stars INT DEFAULT 0,
    most_starred_repo VARCHAR(255),
    avg_stars_per_repo DECIMAL(10, 2) DEFAULT 0.00,
    profile_score INT DEFAULT 0,
    language_stats TEXT, -- Stored as a serialized JSON string for database portability
    profile_url VARCHAR(255),
    avatar_url VARCHAR(500),
    analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_profile_score (profile_score),
    INDEX idx_followers (followers),
    INDEX idx_analyzed_at (analyzed_at)
);
