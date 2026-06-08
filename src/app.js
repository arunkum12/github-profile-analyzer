const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const { testConnection } = require('./config/db');
const profileRoutes = require('./routes/profileRoutes');
const swaggerDocument = require('./config/swagger.json');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '127.0.0.1'; // Force server to bind to localhost for security during testing

// 1. Security Middleware
app.use(helmet()); // Protect HTTP headers
app.use(cors({
  origin: '*', // Adjust this origin policy in production, wildcard allowed for open public demo API testing
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS']
}));

// 2. Request parsing
app.use(express.json());

// 3. API Documentation
app.use('/api-docs', (req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' http://localhost:3000 http://127.0.0.1:3000"
  );
  next();
}, swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// 4. API Routes
app.use('/api', profileRoutes);

// Base Route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to the GitHub Profile Analyzer API.',
    documentation: '/api-docs',
    status: 'Running'
  });
});

// 5. Catch 404
app.use((req, res, next) => {
  res.status(404).json({ error: 'Endpoint not found.' });
});

// 6. Global Error Handling Middleware (Secure: prevents technical leaks)
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);

  const status = err.status || 500;
  
  // Return generic messages for internal/database errors to avoid database schema exposure
  if (status === 500) {
    return res.status(500).json({ error: 'An internal server error occurred.' });
  }

  return res.status(status).json({ error: err.message || 'Error occurred.' });
});

// Start server after testing database connection
async function startServer() {
  await testConnection(); // Test DB connection before starting server
  
  app.listen(PORT, HOST, () => {
    console.log(`GitHub Profile Analyzer API is running on http://${HOST}:${PORT}`);
    console.log(`API Documentation is available on http://${HOST}:${PORT}/api-docs`);
  });
}

if (require.main === module) {
  startServer();
}

module.exports = app;
