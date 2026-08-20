import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { ZodError } from 'zod';
import apiRouter from './routes/api.routes';
import { db } from './db/connection';
import { seedDatabase } from './db/seed';

dotenv.config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check Endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'online',
    service: 'ALAT Sabi Backend Engine',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/v1', apiRouter);

// Global Error Handler Middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  // Handle invalid JSON body-parser errors gracefully
  if (err instanceof SyntaxError && 'status' in err && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      status: 'error',
      message: 'Invalid JSON payload received in request body',
    });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
  }

  const statusCode = err.status || err.statusCode || 500;
  console.error(`[App Error ${statusCode}]:`, err.message || err);
  
  return res.status(statusCode).json({
    status: 'error',
    message: err.message || 'Internal Server Error',
  });
});

export async function bootstrapApp() {
  await db.init();
  await seedDatabase();
  return app;
}

export default app;
