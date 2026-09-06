import express from 'express';
import cors from 'cors';
import { config, validateConfig } from './config';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import agentRoutes from './routes/agents';
import projectRoutes from './routes/projects';
import bugRoutes from './routes/bugs';
import testRoutes from './routes/tests';
import evidenceRoutes from './routes/evidence';
import coverageRoutes from './routes/coverage';
import planRoutes from './routes/plans';
import userStoryRoutes from './routes/userStories';
import epicRoutes from './routes/epics';
import chatRoutes from './routes/chat';
import testPlanRoutes from './routes/testPlans';
import githubSyncRoutes from './routes/githubSync';

/**
 * QA SaaS Platform - Main API Server Entry Point
 * 
 * This Express server provides the backend API for the QA SaaS platform,
 * including authentication, AI agent management, bug reporting, test case generation,
 * evidence storage, and integration with external tools like Jira and GitHub.
 */
async function startServer() {
  try {
    // Validate configuration
    validateConfig();
    
    const app = express();
    
    // Middleware
    app.use(cors({
      origin: (origin, callback) => {
        if (!origin || config.corsOrigins.includes(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error(`CORS policy: origin ${origin} is not allowed`));
      },
      credentials: true,
    }));
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true }));
    
    // Health check endpoint
    app.get('/api/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: config.nodeEnv,
      });
    });
    
    // API Routes
    app.use('/api/auth', authRoutes);
    app.use('/api/users', userRoutes);
    app.use('/api/agents', agentRoutes);
    app.use('/api/projects', projectRoutes);
    app.use('/api/bugs', bugRoutes);
    app.use('/api/tests', testRoutes);
    app.use('/api/evidence', evidenceRoutes);
    app.use('/api/coverage', coverageRoutes);
    app.use('/api/plans', planRoutes);
    app.use('/api/user-stories', userStoryRoutes);
    app.use('/api/epics', epicRoutes);
    app.use('/api/chat', chatRoutes);
    app.use('/api/test-plans', testPlanRoutes);
    app.use('/api/github-sync', githubSyncRoutes);
    
    // Error handling middleware
    app.use(errorHandler);
    
    // 404 handler
    app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.originalUrl} not found`,
      });
    });
    
    // Start server
    app.listen(config.port, () => {
      console.log(`
🚀 QA SaaS Platform API Server Started
========================================
📍 Environment: ${config.nodeEnv}
🌐 Port: ${config.port}
🔗 URL: http://localhost:${config.port}
📚 API Docs: http://localhost:${config.port}/api/health
🤖 AI Model: ${config.gemini.model}
💾 Database: PostgreSQL
☁️  Storage: AWS S3
========================================
      `);
    });
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle uncaught exceptions - log but don't exit in development
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  if (config.nodeEnv === 'production') {
    process.exit(1);
  }
});

// Handle unhandled rejections - log but don't exit in development
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise);
  console.error('Reason:', reason);
  if (config.nodeEnv === 'production') {
    process.exit(1);
  }
});

// Start the server
startServer();