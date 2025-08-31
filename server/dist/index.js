"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_2 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const portManager_1 = require("./utils/portManager");
const auth_1 = __importDefault(require("./routes/auth"));
const users_1 = __importDefault(require("./routes/users"));
const learningGroups_1 = __importDefault(require("./routes/learningGroups"));
const admin_1 = __importDefault(require("./routes/admin"));
const gradingSchema_routes_1 = __importDefault(require("./routes/gradingSchema.routes"));
const subjects_1 = __importDefault(require("./routes/subjects"));
const units_1 = __importDefault(require("./routes/units"));
const blocks_1 = __importDefault(require("./routes/blocks"));
const topics_1 = __importDefault(require("./routes/topics"));
const lessons_1 = __importDefault(require("./routes/lessons"));
const notes_1 = __importDefault(require("./routes/notes"));
const materials_1 = __importDefault(require("./routes/materials"));
const quizzes_1 = __importDefault(require("./routes/quizzes"));
const lessonQuizzes_1 = __importDefault(require("./routes/lessonQuizzes"));
const quizSessions_1 = __importDefault(require("./routes/quizSessions"));
const quizParticipations_1 = __importDefault(require("./routes/quizParticipations"));
const grades_routes_1 = __importDefault(require("./routes/grades.routes"));
const fileSystemPaths_1 = __importDefault(require("./routes/fileSystemPaths"));
const flashcards_1 = __importDefault(require("./routes/flashcards"));
const path_1 = __importDefault(require("path"));
const app = (0, express_1.default)();
const prisma = new client_1.PrismaClient();
app.use((0, express_2.default)());
app.use(express_1.default.json());
// API Routes - ALWAYS before static middleware
app.use('/api/auth', auth_1.default);
app.use('/api/users', users_1.default);
app.use('/api/learning-groups', learningGroups_1.default);
app.use('/api/admin', admin_1.default);
app.use('/api/grading-schemas', gradingSchema_routes_1.default);
app.use('/api/subjects', subjects_1.default);
app.use('/api/units', units_1.default);
app.use('/api/blocks', blocks_1.default);
app.use('/api/topics', topics_1.default);
app.use('/api/lessons', lessons_1.default);
app.use('/api/notes', notes_1.default);
app.use('/api/materials', materials_1.default);
app.use('/api/quizzes', quizzes_1.default);
app.use('/api/lesson-quizzes', lessonQuizzes_1.default);
app.use('/api/quiz-sessions', quizSessions_1.default);
app.use('/api/quiz-participations', quizParticipations_1.default);
app.use('/api/grades', grades_routes_1.default);
app.use('/api/file-system-paths', fileSystemPaths_1.default);
app.use('/api/flashcards', flashcards_1.default);
// Material static files
app.use('/material', express_1.default.static(path_1.default.join(__dirname, '../../material')));
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// Serve static files from client build
const clientBuildPath = path_1.default.join(__dirname, '..', 'client-build');
app.use(express_1.default.static(clientBuildPath));
// React Router Fallback - ALWAYS last
app.get('*', (req, res) => {
    res.sendFile(path_1.default.join(clientBuildPath, 'index.html'));
});
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
        }
        else {
            // Development mode with PortManager
            await portManager_1.PortManager.cleanupPorts();
            const { server, port: managedPort } = await portManager_1.PortManager.startServer(app, port);
            console.log(`🎯 Server is running on port ${managedPort}`);
        }
    }
    catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}
startServer();
//# sourceMappingURL=index.js.map