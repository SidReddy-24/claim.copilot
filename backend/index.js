require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { connectDB } = require('./models/db');
const routes = require('./routes/routes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploaded files (optional but good practice)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Mount routes at the root directory to match requested URL signatures:
// e.g., POST /signup, POST /login, POST /policy/upload, etc.
app.use('/', routes);

// Base health check
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'Smart Insurance Claim Assistant API is running',
    timestamp: new Date()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err.stack);
  res.status(500).json({
    message: 'Internal server error occurred',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/claim-assistant';

// Establish database connection asynchronously (do not block server boot or crash on failure)
connectDB(MONGO_URI).catch(err => {
  console.error('*** WARNING: MongoDB Connection Failed! ***');
  console.error('Ensure MongoDB is running locally or check MONGO_URI in backend/.env.');
  console.error(err.message);
});

// Start Server locally, or export for Serverless environments
if (process.env.NODE_ENV !== 'production' || require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`- API documentation: http://localhost:${PORT}/`);
  });
}

module.exports = app;


