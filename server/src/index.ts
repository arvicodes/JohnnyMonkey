import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
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
import kaCorrectionsRoutes from './routes/kaCorrections';
import messageRoutes from './routes/messages';
import exitTicketRoutes from './routes/exitTicket';
import entryTicketRoutes from './routes/entryTicket';
import presentationImportRoutes from './routes/presentationImport';
import excursionProtocolRoutes from './routes/excursionProtocol';
import announcementRoutes from './routes/announcements';
import journeyRoutes from './routes/journey';
import storySitesRoutes from './routes/storySites';
import beAHeroWorkoutsRoutes from './routes/beAHeroWorkouts';
import flashcardRoutes from './routes/flashcards';
import submissionRoutes from './routes/submissions';
import fileShareRoutes from './routes/fileShares';
import participationRoutes from './routes/participation';
import adventCalendarRoutes from './routes/adventCalendar';
import lessonInstructionsRoutes from './routes/lessonInstructions';
import teacherScheduleRoutes from './routes/teacherSchedule';
import wochenaufgabenRoutes from './routes/wochenaufgaben';
import teacherScratchPadRoutes from './routes/teacherScratchPad';
import teacherDashboardPrefsRoutes from './routes/teacherDashboardPrefs';
import path from 'path';
import { startAutoLessonScheduler } from './services/autoLessonScheduler';
import { ensureWochenaufgabenSchema } from './utils/ensureWochenaufgabenSchema';
import { ensureScratchPadRoots } from './utils/teacherScratchPadStore';

dotenv.config();

const app = express();
const prisma = new PrismaClient();

// Trust proxy - Sophos/nginx terminiert HTTPS und reicht intern HTTP weiter.
app.set('trust proxy', true);

const PRODUCTION_CORS_ORIGINS = [
  'https://johnnymonkey.onrender.com',
  'https://www.johnnymonkey.onrender.com',
  'https://mnsplusdocker:44443',
  'https://mnsplusdocker',
  'https://rpl-50147-0.dn.mnsnet.de:44443',
  'https://rpl-50147-0.dn.mnsnet.de',
];

function productionCorsOrigins(): string[] {
  const extra = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return [...PRODUCTION_CORS_ORIGINS, ...extra];
}

app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? productionCorsOrigins() : true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-login-code']
}));

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

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
app.use('/api/participation', participationRoutes);
app.use('/api/advent-calendar', adventCalendarRoutes);
app.use('/api/lesson-instructions', lessonInstructionsRoutes);
app.use('/api/teacher-schedule', teacherScheduleRoutes);
app.use('/api/wochenaufgaben', wochenaufgabenRoutes);
app.use('/api/teacher-scratch-pad', teacherScratchPadRoutes);
app.use('/api/teacher-dashboard-prefs', teacherDashboardPrefsRoutes);
app.use('/api/ka-corrections', kaCorrectionsRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/exit-ticket', exitTicketRoutes);
app.use('/api/entry-ticket', entryTicketRoutes);
app.use('/api/presentation', presentationImportRoutes);
app.use('/api/excursion-protocol', excursionProtocolRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/journey', journeyRoutes);
app.use('/api/story-sites', storySitesRoutes);
app.use('/api/be-a-hero/workouts', beAHeroWorkoutsRoutes);

// Material static files
app.use('/material', express.static(path.join(__dirname, '../../material')));
// Avatar images ( /api/avatars works through CRA proxy; /uploads/avatars kept for legacy URLs )
const avatarStaticDir = path.join(__dirname, '../uploads/avatars');
app.use('/api/avatars', express.static(avatarStaticDir));
app.use('/uploads/avatars', express.static(avatarStaticDir));

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

// Serve static files from client build ONLY in production
let clientBuildPath: string | null = null;
if (process.env.NODE_ENV === 'production') {
  clientBuildPath = path.join(__dirname, '..', 'client-build');
  app.use(express.static(clientBuildPath));

  // React Router Fallback - ALWAYS last (but exclude API routes)
  app.get('*', (req, res) => {
    // Don't serve React app for API routes / static uploads
    if (req.path.startsWith('/api/') || req.path.startsWith('/material/') || req.path.startsWith('/uploads/')) {
      return res.status(404).json({ error: 'API endpoint not found' });
    }
    if (!clientBuildPath) {
      return res.status(500).json({ error: 'Client build path not configured' });
    }
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
} else {
  // Development: don't serve a potentially stale client-build.
  // Provide a helpful hint when someone opens backend URLs in the browser.
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/') || req.path === '/health' || req.path.startsWith('/material/') || req.path.startsWith('/uploads/')) {
      return res.status(404).json({ error: 'Endpoint not found' });
    }

    const acceptsHtml = String(req.headers.accept || '').includes('text/html');
    if (acceptsHtml) {
      return res
        .status(302)
        .setHeader('Location', 'http://localhost:3000')
        .send('Redirecting to the frontend dev server...');
    }

    return res.status(404).json({
      error: 'Frontend not served in development',
      hint: 'Open http://localhost:3000 for the app. Backend API is on http://localhost:3003/api',
      path: req.path
    });
  });
}

// Error monitoring middleware (must be last)
app.use(MonitoringService.errorMonitor());

// Debug: Log the build path (only if configured)
if (clientBuildPath) {
  console.log('🔍 Client build path:', clientBuildPath);
}
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
    console.log('🗄️ DATABASE_URL:', process.env.DATABASE_URL || '(from schema)');
    await ensureWochenaufgabenSchema(prisma);
    console.log('✅ Wochenaufgaben-Schema bereit');
    try {
      const roots = ensureScratchPadRoots();
      console.log('✅ Notizen-Ordner bereit:', roots.liveRoot);
      console.log('✅ Notizen-Sicherheitskopien:', roots.backupRoot);
    } catch (e) {
      console.warn('Notizen-Ordner konnten nicht angelegt werden:', e);
    }
    // Lokal: 3003 (React nutzt 3000). Ohne PORT kein Konflikt mit dem Frontend.
    const port = parseInt(process.env.PORT || '3003', 10);
    
    // For Render, use simple server start
    if (process.env.NODE_ENV === 'production') {
      // Listen on 0.0.0.0 to accept connections from outside the container
      const server = app.listen(port, '0.0.0.0', () => {
        server.timeout = 600_000;
        server.keepAliveTimeout = 650_000;
        server.headersTimeout = 660_000;
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

    startAutoLessonScheduler();
    console.log('⏰ Auto-Lesson-Scheduler gestartet');
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();