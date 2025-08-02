import express from 'express';
import cors from 'cors';
import { PrismaClient } from './generated/prisma';
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
import path from 'path';

const app = express();
const prisma = new PrismaClient();
const port = 3005;

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
app.use('/material', express.static(path.join(__dirname, '../../material')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
}); 