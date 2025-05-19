import express from 'express';
import cors from 'cors';
import { PrismaClient } from './generated/prisma';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import learningGroupRoutes from './routes/learningGroups';

const app = express();
const prisma = new PrismaClient();
const port = 3002;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/learning-groups', learningGroupRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
}); 