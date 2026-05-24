import express from 'express';
import cors from 'cors';
import authRoutes from './modules/auth/auth.routes';
import issuesRoutes from './modules/issues/issues.routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

const app = express();

// Global middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (_req, res) => {
  res.json({ success: true, message: 'DevPulse API is running', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/issues', issuesRoutes);

// Error handling — must come AFTER routes
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
