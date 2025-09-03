import express from 'express';
import cors from 'cors';
import { PrismaClient } from './generated/prisma';
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

// Start server with automatic port management
async function startServer() {
  try {
    // Cleanup ports before starting
    await PortManager.cleanupPorts();
    
    // Start server on specific port 3001
    const { server, port } = await PortManager.startServer(app, 3001);
    
    console.log(`🎯 Server is running on port ${port}`);
    
    // Store port in global for potential external access
    (global as any).SERVER_PORT = port;
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer(); 