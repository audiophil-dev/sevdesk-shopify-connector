import express, { Request, Response, NextFunction } from 'express';
import ordersRouter from './routes/orders';
import settingsRouter from './routes/settings';

const app = express();

app.use(express.json());

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// Error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error:', err.message);
  res.status(500).json({
    error: err.message,
    status: 500,
  });
});

// Mount API routes
app.use('/api/orders', ordersRouter);
app.use('/api/settings', settingsRouter);

export default app;
