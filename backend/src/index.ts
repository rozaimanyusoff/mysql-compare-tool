import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initializeDB } from './db';
import { logger } from './logger';
import credentialsRouter from './routes/credentials';
import comparisonRouter from './routes/comparison';
import logsRouter from './routes/logs';
import migrationRouter from './routes/migration';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/credentials', credentialsRouter);
app.use('/api/comparison', comparisonRouter);
app.use('/api/logs', logsRouter);
app.use('/api/migration', migrationRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error', err);
  res.status(500).json({ error: 'Internal server error' });
});

async function start() {
  try {
    await initializeDB();
    logger.info('Database initialized');

    app.listen(PORT, () => {
      logger.info(`Server running`, { port: PORT });
    });
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

start();
