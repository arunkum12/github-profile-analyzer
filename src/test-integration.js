const axios = require('axios');
const { spawn } = require('child_process');
const path = require('path');

// Configure integration environment
process.env.USE_MOCK_DB = 'true';
process.env.PORT = '3001'; // Use a different port to avoid clashes

let serverProcess;

function startServer() {
  return new Promise((resolve, reject) => {
    console.log('Spinning up integration test server on port 3001...');
    
    // Launch app.js with environment override
    serverProcess = spawn('node', [path.join(__dirname, 'app.js')], {
      env: {
        ...process.env,
        PORT: '3001',
        USE_MOCK_DB: 'true'
      }
    });

    serverProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(`[Server]: ${output.trim()}`);
      if (output.includes('GitHub Profile Analyzer API is running')) {
        resolve();
      }
    });

    serverProcess.stderr.on('data', (data) => {
      console.error(`[Server Error]: ${data.toString().trim()}`);
    });

    serverProcess.on('error', (err) => {
      reject(err);
    });
  });
}

async function runTests() {
  const client = axios.create({
    baseURL: 'http://127.0.0.1:3001',
    validateStatus: () => true // Allow checking error statuses without throwing
  });

  console.log('\n======================================');
  console.log('STARTING INTEGRATION TESTS');
  console.log('======================================\n');

  try {
    // Test 1: Base URL Status
    console.log('Test 1: GET / - Server status...');
    const statusRes = await client.get('/');
    console.log(`Status: ${statusRes.status}`);
    console.log('Response:', statusRes.data);
    if (statusRes.status === 200 && statusRes.data.status === 'Running') {
      console.log('✅ Test 1 Passed.\n');
    } else {
      throw new Error('Test 1 Failed');
    }

    // Test 2: Input Validation with bad username
    console.log('Test 2: POST /api/profiles/analyze/invalid_username! - SQL/injection validation...');
    const badUserRes = await client.post('/api/profiles/analyze/invalid_user!');
    console.log(`Status: ${badUserRes.status}`);
    console.log('Response:', badUserRes.data);
    if (badUserRes.status === 400 && badUserRes.data.error) {
      console.log('✅ Test 2 Passed (Rejection of invalid usernames works).\n');
    } else {
      throw new Error('Test 2 Failed');
    }

    // Test 3: Analyze valid profile (octocat)
    console.log('Test 3: POST /api/profiles/analyze/octocat - Real GitHub API fetch & insert...');
    const analyzeRes = await client.post('/api/profiles/analyze/octocat');
    console.log(`Status: ${analyzeRes.status}`);
    console.log(`Username: ${analyzeRes.data.username}`);
    console.log(`Profile Score: ${analyzeRes.data.profileScore}`);
    console.log(`Avatar URL: ${analyzeRes.data.avatarUrl}`);
    if (analyzeRes.status === 200 && analyzeRes.data.username === 'octocat') {
      console.log('✅ Test 3 Passed.\n');
    } else {
      throw new Error('Test 3 Failed');
    }

    // Test 4: Analyze another profile (google)
    console.log('Test 4: POST /api/profiles/analyze/google - Second profile...');
    const analyzeGoogleRes = await client.post('/api/profiles/analyze/google');
    console.log(`Status: ${analyzeGoogleRes.status}`);
    console.log(`Username: ${analyzeGoogleRes.data.username}`);
    console.log(`Profile Score: ${analyzeGoogleRes.data.profileScore}`);
    if (analyzeGoogleRes.status === 200 && analyzeGoogleRes.data.username === 'google') {
      console.log('✅ Test 4 Passed.\n');
    } else {
      throw new Error('Test 4 Failed');
    }

    // Test 5: Get All Profiles (Page & Sort)
    console.log('Test 5: GET /api/profiles - Fetch all cached entries...');
    const getAllRes = await client.get('/api/profiles?page=1&limit=5&sortBy=profile_score&sortOrder=DESC');
    console.log(`Status: ${getAllRes.status}`);
    console.log(`Total Stored Items: ${getAllRes.data.pagination.totalItems}`);
    console.log('List data (Usernames & Scores):', getAllRes.data.data.map(p => `${p.username} (${p.profileScore})`));
    if (getAllRes.status === 200 && getAllRes.data.data.length === 2) {
      console.log('✅ Test 5 Passed.\n');
    } else {
      throw new Error('Test 5 Failed');
    }

    // Test 6: Search Stored Profiles
    console.log('Test 6: GET /api/profiles?search=octo - Search filter...');
    const searchRes = await client.get('/api/profiles?search=octo');
    console.log(`Status: ${searchRes.status}`);
    console.log('Found usernames:', searchRes.data.data.map(p => p.username));
    if (searchRes.status === 200 && searchRes.data.data.length === 1 && searchRes.data.data[0].username === 'octocat') {
      console.log('✅ Test 6 Passed.\n');
    } else {
      throw new Error('Test 6 Failed');
    }

    // Test 7: Get Single Profile Details
    console.log('Test 7: GET /api/profiles/octocat - Retrieve single detailed cache...');
    const getSingleRes = await client.get('/api/profiles/octocat');
    console.log(`Status: ${getSingleRes.status}`);
    console.log(`Profile Score retrieved: ${getSingleRes.data.profileScore}`);
    if (getSingleRes.status === 200 && getSingleRes.data.username === 'octocat') {
      console.log('✅ Test 7 Passed.\n');
    } else {
      throw new Error('Test 7 Failed');
    }

    // Test 8: Top Followed Profiles
    console.log('Test 8: GET /api/stats/top-followed - Extra stats api...');
    const topFollowedRes = await client.get('/api/stats/top-followed');
    console.log(`Status: ${topFollowedRes.status}`);
    console.log('Top Followed:', topFollowedRes.data.data);
    if (topFollowedRes.status === 200 && topFollowedRes.data.data.length > 0) {
      console.log('✅ Test 8 Passed.\n');
    } else {
      throw new Error('Test 8 Failed');
    }

    // Test 9: Aggregate Languages
    console.log('Test 9: GET /api/stats/languages - Extra languages stats api...');
    const languagesRes = await client.get('/api/stats/languages');
    console.log(`Status: ${languagesRes.status}`);
    console.log('Languages stats aggregated:', languagesRes.data.languages);
    if (languagesRes.status === 200 && typeof languagesRes.data.languages === 'object') {
      console.log('✅ Test 9 Passed.\n');
    } else {
      throw new Error('Test 9 Failed');
    }

    // Test 10: Delete Profile
    console.log('Test 10: DELETE /api/profiles/octocat - Delete profile...');
    const deleteRes = await client.delete('/api/profiles/octocat');
    console.log(`Status: ${deleteRes.status}`);
    console.log('Response:', deleteRes.data);
    
    console.log('Verifying deleted profile cannot be found...');
    const checkDeletedRes = await client.get('/api/profiles/octocat');
    console.log(`Status of deleted check: ${checkDeletedRes.status}`);
    if (deleteRes.status === 200 && checkDeletedRes.status === 404) {
      console.log('✅ Test 10 Passed.\n');
    } else {
      throw new Error('Test 10 Failed');
    }

    console.log('======================================');
    console.log('ALL INTEGRATION TESTS PASSED SUCCESSFULLY!');
    console.log('======================================');
  } catch (error) {
    console.error('\n❌ INTEGRATION TESTS FAILED:');
    console.error(error);
    process.exitCode = 1;
  } finally {
    if (serverProcess) {
      console.log('\nStopping integration test server...');
      serverProcess.kill();
    }
  }
}

async function main() {
  try {
    await startServer();
    await runTests();
  } catch (e) {
    console.error('Failed to run integration suite:', e);
    if (serverProcess) serverProcess.kill();
    process.exit(1);
  }
}

main();
