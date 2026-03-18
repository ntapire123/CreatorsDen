require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const connectDB = require('./config/db');
const syncScheduler = require('./jobs/scheduler');
const app = express();

// Security middleware
app.use(helmet());

// Compression middleware
app.use(compression());

// CORS
app.use(cors({ 
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL 
    : 'http://localhost:3000', 
  credentials: true 
}));

// Middleware
app.use(express.json());

// Connect DB
connectDB();

// Test route
app.get('/api/test', (req, res) => res.json({ message: 'Server running' }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/accounts', require('./routes/accounts'));
app.use('/api/sync', require('./routes/sync'));
app.use('/api/creator', require('./middleware/auth'), require('./routes/creator'));
app.use('/api/admin', require('./middleware/auth'), require('./routes/admin'));

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({ success: false, message: err.message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server on port ${PORT}`);
  
  // Start the sync scheduler
  syncScheduler.start();
});
