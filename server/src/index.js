require('dotenv').config();
const express = require('express');
const cors = require('cors');

const requestRoutes = require('./routes/requests');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3001;

// Allow requests from the Next.js frontend
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000' }));

// Parse JSON request bodies
app.use(express.json());

// ─── Routes ───────────────────────────────────────
app.use('/api/requests', requestRoutes);

// Health check — useful for verifying the server is up
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Error handler (must be registered last) ──────
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`ReturnDesk API running on http://localhost:${PORT}`);
});
