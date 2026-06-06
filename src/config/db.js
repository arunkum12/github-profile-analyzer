const mysql = require('mysql2/promise');
require('dotenv').config();

const isMock = process.env.USE_MOCK_DB === 'true';

// In-memory array for simulating database operations in tests
const inMemoryDB = [];

// Create a mock pool for in-memory operations
const mockPool = {
  async getConnection() {
    return {
      release() {}
    };
  },
  async execute(query, params = []) {
    const q = query.trim().replace(/\s+/g, ' ');
    
    // 1. SELECT * FROM profiles WHERE username = ?
    if (q.includes('SELECT * FROM profiles WHERE username = ?')) {
      const username = params[0];
      const match = inMemoryDB.find(p => p.username.toLowerCase() === username.toLowerCase());
      return [match ? [JSON.parse(JSON.stringify(match))] : []];
    }
    
    // 2. DELETE FROM profiles WHERE username = ?
    if (q.includes('DELETE FROM profiles WHERE username = ?')) {
      const username = params[0];
      const index = inMemoryDB.findIndex(p => p.username.toLowerCase() === username.toLowerCase());
      if (index !== -1) {
        inMemoryDB.splice(index, 1);
        return [{ affectedRows: 1 }];
      }
      return [{ affectedRows: 0 }];
    }
    
    // 3. INSERT INTO profiles ON DUPLICATE KEY UPDATE
    if (q.includes('INSERT INTO profiles')) {
      const [
        username, name, bio, public_repos, followers, following,
        account_age_days, total_stars, most_starred_repo,
        avg_stars_per_repo, profile_score, language_stats,
        profile_url, avatar_url
      ] = params;
      
      const existingIndex = inMemoryDB.findIndex(p => p.username.toLowerCase() === username.toLowerCase());
      const record = {
        id: existingIndex !== -1 ? inMemoryDB[existingIndex].id : inMemoryDB.length + 1,
        username,
        name,
        bio,
        public_repos: public_repos || 0,
        followers: followers || 0,
        following: following || 0,
        account_age_days: account_age_days || 0,
        total_stars: total_stars || 0,
        most_starred_repo,
        avg_stars_per_repo: avg_stars_per_repo || 0.00,
        profile_score: profile_score || 0,
        language_stats,
        profile_url,
        avatar_url,
        analyzed_at: new Date().toISOString()
      };
      
      if (existingIndex !== -1) {
        inMemoryDB[existingIndex] = record;
      } else {
        inMemoryDB.push(record);
      }
      return [{ affectedRows: 1 }];
    }
    
    // 4. SELECT COUNT(*) as total FROM profiles
    if (q.includes('SELECT COUNT(*) as total FROM profiles')) {
      let filtered = [...inMemoryDB];
      if (params.length > 0 && params[0]) {
        const searchVal = params[0].replace(/%/g, '').toLowerCase();
        filtered = filtered.filter(p => 
          (p.username && p.username.toLowerCase().includes(searchVal)) ||
          (p.name && p.name.toLowerCase().includes(searchVal)) ||
          (p.bio && p.bio.toLowerCase().includes(searchVal))
        );
      }
      return [[{ total: filtered.length }]];
    }
    
    // 5. SELECT * FROM profiles
    if (q.includes('SELECT * FROM profiles') && !q.includes('ORDER BY followers DESC LIMIT')) {
      let filtered = [...inMemoryDB];
      let pIndex = 0;
      
      if (q.includes('WHERE username LIKE ? OR name LIKE ? OR bio LIKE ?')) {
        const searchVal = params[0].replace(/%/g, '').toLowerCase();
        filtered = filtered.filter(p => 
          (p.username && p.username.toLowerCase().includes(searchVal)) ||
          (p.name && p.name.toLowerCase().includes(searchVal)) ||
          (p.bio && p.bio.toLowerCase().includes(searchVal))
        );
        pIndex = 3;
      }
      
      const matchSort = q.match(/ORDER BY (\w+) (ASC|DESC)/i);
      if (matchSort) {
        const col = matchSort[1];
        const dir = matchSort[2].toUpperCase();
        filtered.sort((a, b) => {
          let valA = a[col];
          let valB = b[col];
          if (typeof valA === 'string') {
            return dir === 'ASC' ? valA.localeCompare(valB) : valB.localeCompare(valA);
          }
          return dir === 'ASC' ? valA - valB : valB - valA;
        });
      }
      
      const limit = params[pIndex];
      const offset = params[pIndex + 1];
      const pageData = filtered.slice(offset, offset + limit);
      return [JSON.parse(JSON.stringify(pageData))];
    }
    
    // 6. SELECT * FROM profiles ORDER BY followers DESC LIMIT ?
    if (q.includes('SELECT * FROM profiles ORDER BY followers DESC LIMIT ?')) {
      const limit = params[0] || 5;
      const sorted = [...inMemoryDB].sort((a, b) => b.followers - a.followers).slice(0, limit);
      return [JSON.parse(JSON.stringify(sorted))];
    }
    
    // 7. SELECT language_stats FROM profiles
    if (q.includes('SELECT language_stats FROM profiles')) {
      const stats = inMemoryDB.map(p => ({ language_stats: p.language_stats }));
      return [JSON.parse(JSON.stringify(stats))];
    }
    
    return [[]];
  }
};

// Create the connection pool
const pool = isMock ? mockPool : mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'github_analyzer',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Helper function to test the database connection on startup
async function testConnection() {
  if (isMock) {
    console.log('Database connected successfully (Mock In-Memory Mode).');
    return;
  }
  try {
    const connection = await pool.getConnection();
    console.log('Database connected successfully.');
    connection.release();
  } catch (error) {
    console.error('Error connecting to the database:', error.message);
    process.exit(1);
  }
}

module.exports = {
  pool,
  testConnection
};

