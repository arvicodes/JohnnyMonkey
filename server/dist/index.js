"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const client_1 = require("@prisma/client");
const portManager_1 = require("./utils/portManager");
const monitoring_1 = __importDefault(require("./utils/monitoring"));
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
const kaCorrections_1 = __importDefault(require("./routes/kaCorrections"));
const messages_1 = __importDefault(require("./routes/messages"));
const exitTicket_1 = __importDefault(require("./routes/exitTicket"));
const entryTicket_1 = __importDefault(require("./routes/entryTicket"));
const journey_1 = __importDefault(require("./routes/journey"));
const flashcards_1 = __importDefault(require("./routes/flashcards"));
const submissions_1 = __importDefault(require("./routes/submissions"));
const fileShares_1 = __importDefault(require("./routes/fileShares"));
const participation_1 = __importDefault(require("./routes/participation"));
const adventCalendar_1 = __importDefault(require("./routes/adventCalendar"));
const lessonInstructions_1 = __importDefault(require("./routes/lessonInstructions"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const prisma = new client_1.PrismaClient();
// Trust proxy - wichtig für nginx Reverse Proxy und X-Forwarded-Proto
// Erlaubt Express, die X-Forwarded-* Header von nginx zu respektieren
app.set('trust proxy', true);
// Enable CORS with better configuration
app.use((0, cors_1.default)({
    origin: process.env.NODE_ENV === 'production'
        ? ['https://johnnymonkey.onrender.com', 'https://www.johnnymonkey.onrender.com']
        : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-login-code']
}));
app.use(express_1.default.json({ limit: '50mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '50mb' }));
// Monitoring middleware (must be first)
app.use(monitoring_1.default.requestMonitor());
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
app.use('/api/submissions', submissions_1.default);
app.use('/api/file-shares', fileShares_1.default);
app.use('/api/participation', participation_1.default);
app.use('/api/advent-calendar', adventCalendar_1.default);
app.use('/api/lesson-instructions', lessonInstructions_1.default);
app.use('/api/ka-corrections', kaCorrections_1.default);
app.use('/api/messages', messages_1.default);
app.use('/api/exit-ticket', exitTicket_1.default);
app.use('/api/entry-ticket', entryTicket_1.default);
app.use('/api/journey', journey_1.default);
// Material static files
app.use('/material', express_1.default.static(path_1.default.join(__dirname, '../../material')));
// Enhanced health check endpoint with monitoring
app.get('/health', (req, res) => {
    try {
        const healthStatus = monitoring_1.default.getInstance().getHealthStatus();
        res.json(healthStatus);
    }
    catch (error) {
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
        const stats = monitoring_1.default.getInstance().getStats();
        res.json(stats);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to get monitoring stats' });
    }
});
// Serve static files from client build ONLY in production
let clientBuildPath = null;
if (process.env.NODE_ENV === 'production') {
    clientBuildPath = path_1.default.join(__dirname, '..', 'client-build');
    app.use(express_1.default.static(clientBuildPath));
    // React Router Fallback - ALWAYS last (but exclude API routes)
    app.get('*', (req, res) => {
        // Don't serve React app for API routes
        if (req.path.startsWith('/api/')) {
            return res.status(404).json({ error: 'API endpoint not found' });
        }
        if (!clientBuildPath) {
            return res.status(500).json({ error: 'Client build path not configured' });
        }
        res.sendFile(path_1.default.join(clientBuildPath, 'index.html'));
    });
}
else {
    // Development: don't serve a potentially stale client-build.
    // Provide a helpful hint when someone opens backend URLs in the browser.
    app.get('*', (req, res) => {
        if (req.path.startsWith('/api/') || req.path === '/health' || req.path.startsWith('/material/')) {
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
app.use(monitoring_1.default.errorMonitor());
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
    monitoring_1.default.getInstance().logError({
        timestamp: new Date().toISOString(),
        error: error.message,
        stack: error.stack,
        type: 'uncaughtException'
    });
    process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
    monitoring_1.default.getInstance().logError({
        timestamp: new Date().toISOString(),
        error: String(reason),
        type: 'unhandledRejection',
        promise: promise.toString()
    });
});
// Start server with Render compatibility
async function startServer() {
    try {
        // Lokal: 3003 (React nutzt 3000). Ohne PORT kein Konflikt mit dem Frontend.
        const port = parseInt(process.env.PORT || '3003', 10);
        // For Render, use simple server start
        if (process.env.NODE_ENV === 'production') {
            // Listen on 0.0.0.0 to accept connections from outside the container
            const server = app.listen(port, '0.0.0.0', () => {
                console.log(`🎯 Server is running on port ${port}`);
                console.log(`🌐 Environment: ${process.env.NODE_ENV}`);
                console.log(`🔗 Health check: http://localhost:${port}/health`);
                console.log(`📊 Monitoring: http://localhost:${port}/api/monitoring/stats`);
                console.log('✅ Monitoring system initialized');
            });
        }
        else {
            // Development mode with PortManager
            await portManager_1.PortManager.cleanupPorts();
            const { server, port: managedPort } = await portManager_1.PortManager.startServer(app, port);
            console.log(`🎯 Server is running on port ${managedPort}`);
            console.log(`📊 Monitoring: http://localhost:${managedPort}/api/monitoring/stats`);
            console.log('✅ Monitoring system initialized');
        }
    }
    catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}
startServer();
//# sourceMappingURL=index.js.map