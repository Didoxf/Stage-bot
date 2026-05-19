// server.js — PFE Assistant ENSEM Backend
require('dotenv').config();

const express    = require('express');
const cors       = require('cors');
const morgan     = require('morgan');
const rateLimit  = require('express-rate-limit');
const { connect } = require('./utils/db');
const routes     = require('./routes/index');

const app  = express();
const PORT = parseInt(process.env.PORT) || 3001;

// CORS
const origins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(',').map(o => o.trim());
app.use(cors({ origin: (o, cb) => (!o || origins.includes(o)) ? cb(null, true) : cb(new Error('CORS')), credentials: true }));

// Body
app.use(express.json({ limit: '10kb' }));
app.use(morgan('dev'));

// Rate limit
app.use('/chat', rateLimit({ windowMs: 60_000, max: 30 }));
app.use('/admin', rateLimit({ windowMs: 60_000, max: 100 }));

// Routes
app.use('/', routes);

// 404
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

// Start
async function start() {
  await connect();
  app.listen(PORT, () => console.log(`🚀 PFE ENSEM Backend running on port ${PORT}`));
}

start().catch(err => {
  console.error('Failed to start:', err);
  process.exit(1);
});
