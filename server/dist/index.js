"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const prisma_1 = require("./generated/prisma");
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
const path_1 = __importDefault(require("path"));
const app = (0, express_1.default)();
const prisma = new prisma_1.PrismaClient();
const port = 3005;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Routes
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
app.use('/material', express_1.default.static(path_1.default.join(__dirname, '../../material')));
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
