import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { PortManager } from './utils/portManager';
import MonitoringService from './utils/monitoring';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import learningGroupRoutes from './routes/learningGroups';
import adminRoutes from './routes/admin';
import gradingSchemaRoutes from './routes/gradingSchema.routes';
import subjectRoutes from './routes/subjects';
import unitRoutes from './routes/units';
import blockRoutes from './routes/blocks';
import topicRoutes from './routes/topics';
import lessonRoutes from './routes/lessons';
import notesRoutes from './routes/notes';
import materialsRoutes from './routes/materials';
import quizRoutes from './routes/quizzes';
import lessonQuizRoutes from './routes/lessonQuizzes';
import quizSessionRoutes from './routes/quizSessions';
import quizParticipationRoutes from './routes/quizParticipations';
import gradesRoutes from './routes/grades.routes';
import fileSystemPathsRoutes from './routes/fileSystemPaths';
import flashcardRoutes from './routes/flashcards';
import submissionRoutes from './routes/submissions';
import fileShareRoutes from './routes/fileShares';
import path from 'path';

const app = express();
const prisma = new PrismaClient();

// Enable CORS with better configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://johnnymonkey.onrender.com', 'https://www.johnnymonkey.onrender.com']
    : true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Monitoring middleware (must be first)
app.use(MonitoringService.requestMonitor());

// API Routes - ALWAYS before static middleware
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/learning-groups', learningGroupRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/grading-schemas', gradingSchemaRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/units', unitRoutes);
app.use('/api/blocks', blockRoutes);
app.use('/api/topics', topicRoutes);
app.use('/api/lessons', lessonRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/materials', materialsRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/lesson-quizzes', lessonQuizRoutes);
app.use('/api/quiz-sessions', quizSessionRoutes);
app.use('/api/quiz-participations', quizParticipationRoutes);
app.use('/api/grades', gradesRoutes);
app.use('/api/file-system-paths', fileSystemPathsRoutes);
app.use('/api/flashcards', flashcardRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/file-shares', fileShareRoutes);

// Material static files
app.use('/material', express.static(path.join(__dirname, '../../material')));

// Enhanced health check endpoint with monitoring
app.get('/health', (req, res) => {
  try {
    const healthStatus = MonitoringService.getInstance().getHealthStatus();
    res.json(healthStatus);
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      error: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

// Monitoring endpoint (protected in production)
app.get('/api/monitoring/stats', (req, res) => {
  if (process.env.NODE_ENV === 'production' && req.headers.authorization !== `Bearer ${process.env.MONITORING_TOKEN || 'default'}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const stats = MonitoringService.getInstance().getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get monitoring stats' });
  }
});

// Serve static files from client build
const clientBuildPath = path.join(__dirname, '..', 'client-build');
app.use(express.static(clientBuildPath));

// React Router Fallback - ALWAYS last (but exclude API routes)
app.get('*', (req, res) => {
  // Don't serve React app for API routes
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

// Error monitoring middleware (must be last)
app.use(MonitoringService.errorMonitor());

// Debug: Log the build path
console.log('🔍 Client build path:', clientBuildPath);
console.log('🔍 Current directory:', __dirname);

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down server gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down server gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

// Unhandled error handling
process.on('uncaughtException', (error) => {
  console.error('🚨 Uncaught Exception:', error);
  MonitoringService.getInstance().logError({
    timestamp: new Date().toISOString(),
    error: error.message,
    stack: error.stack,
    type: 'uncaughtException'
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
  MonitoringService.getInstance().logError({
    timestamp: new Date().toISOString(),
    error: String(reason),
    type: 'unhandledRejection',
    promise: promise.toString()
  });
});

// Start server with Render compatibility
async function startServer() {
  try {
    const port = parseInt(process.env.PORT || '3001', 10);
    
    // For Render, use simple server start
    if (process.env.NODE_ENV === 'production') {
      const server = app.listen(port, () => {
        console.log(`🎯 Server is running on port ${port}`);
        console.log(`🌐 Environment: ${process.env.NODE_ENV}`);
        console.log(`🔗 Health check: http://localhost:${port}/health`);
        console.log(`📊 Monitoring: http://localhost:${port}/api/monitoring/stats`);
        console.log('✅ Monitoring system initialized');
      });
    } else {
      // Development mode with PortManager
      await PortManager.cleanupPorts();
      const { server, port: managedPort } = await PortManager.startServer(app, port);
      console.log(`🎯 Server is running on port ${managedPort}`);
      console.log(`📊 Monitoring: http://localhost:${managedPort}/api/monitoring/stats`);
      console.log('✅ Monitoring system initialized');
    }
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();