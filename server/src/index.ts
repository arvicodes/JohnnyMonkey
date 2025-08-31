import express from 'express';
import cors from 'express';
import { PrismaClient } from '@prisma/client';
import { PortManager } from './utils/portManager';
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
import path from 'path';

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// Routes
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
app.use('/material', express.static(path.join(__dirname, '../../material')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root route - serve React app
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>JohnnyMonkey - Educational Platform</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; text-align: center; }
          .container { max-width: 600px; margin: 0 auto; }
          .status { color: #22c55e; font-weight: bold; }
          .url { color: #3b82f6; text-decoration: none; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🎓 JohnnyMonkey</h1>
          <p class="status">✅ Server is running successfully!</p>
          <p>Educational platform with database backup integration</p>
          <br>
          <p><strong>API Endpoints:</strong></p>
          <ul style="text-align: left; display: inline-block;">
            <li><a href="/health" class="url">/health</a> - Server status</li>
            <li><a href="/api/auth" class="url">/api/auth</a> - Authentication</li>
            <li><a href="/api/users" class="url">/api/users</a> - User management</li>
            <li><a href="/api/subjects" class="url">/api/subjects</a> - Subject management</li>
            <li><a href="/api/flashcards" class="url">/api/flashcards</a> - Flashcard system</li>
          </ul>
          <br>
          <p><strong>Frontend:</strong> <a href="/client" class="url">/client</a></p>
        </div>
      </body>
    </html>
  `);
});

// Serve static files from client build
app.use('/client', express.static(path.join(__dirname, '../client-build')));

// Catch-all route for React app
app.get('/client/*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client-build/index.html'));
});

// Alternative: Serve React app directly at root
app.use(express.static(path.join(__dirname, '../client-build')));

// Catch-all route for React app at root level
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client-build/index.html'));
});

// Debug: Log the build path
console.log('🔍 Client build path:', path.join(__dirname, '../client-build'));
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
      });
    } else {
      // Development mode with PortManager
      await PortManager.cleanupPorts();
      const { server, port: managedPort } = await PortManager.startServer(app, port);
      console.log(`🎯 Server is running on port ${managedPort}`);
    }
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer(); 