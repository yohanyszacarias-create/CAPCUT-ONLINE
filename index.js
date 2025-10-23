import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import jobRoutes from './routes/jobRoutes.js';

const app = express();

// Middleware
app.use(cors({
  origin: config.corsOrigin,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/jobs', jobRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: config.nodeEnv === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// Start server
const PORT = config.port;
app.listen(PORT, () => {
  console.log(`VideoMaker API running on port ${PORT}`);
  console.log(`Environment: ${config.nodeEnv}`);
  console.log(`S3 Endpoint: ${config.s3.endpoint}`);
  console.log(`Redis URL: ${config.redis.url}`);
});

export default app;

