require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const { startSyncScheduler } = require('./jobs/sync');
const app = express();

const isProduction = process.env.NODE_ENV === 'production';
const port = Number.parseInt(process.env.PORT || '5000', 10);
const rawOrigins = process.env.FRONTEND_URL || 'http://localhost:3000';
const allowedOrigins = rawOrigins
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter((key) => !process.env[key]);

if (missingEnvVars.length > 0) {
  console.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}

// CORS
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('CORS origin not allowed'));
    },
    credentials: true
  })
);

// Middleware
app.use(express.json());

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many auth requests. Please try again later.' }
});

const syncLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many sync requests. Please try again later.' }
});

// Connect DB
connectDB();
if (process.env.ENABLE_SYNC_SCHEDULER === 'true') {
  startSyncScheduler();
} else {
  console.log('Sync scheduler disabled for this instance');
}

// Test route
app.get('/api/test', (req, res) => res.json({ message: 'Server running' }));

// Routes
app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/tracking', require('./routes/tracking'));
app.use('/api/sync', syncLimiter, require('./routes/sync'));
app.use('/api/creator', require('./middleware/auth'), require('./routes/creator'));
app.use('/api/admin', require('./middleware/auth'), require('./routes/admin'));

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  const message = isProduction && status === 500 ? 'Internal server error' : err.message;
  res.status(status).json({ success: false, message });
});

app.listen(port, () => console.log(`Server on port ${port}`));
