"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const prisma_1 = require("../generated/prisma");
const LessonQuizController_1 = require("../controllers/LessonQuizController");
const router = express_1.default.Router();
const prisma = new prisma_1.PrismaClient();
// Lesson-Quiz assignment operations
router.post('/assign', LessonQuizController_1.assignQuizToLesson);
router.get('/lesson/:lessonId', LessonQuizController_1.getLessonQuiz);
router.get('/available/:teacherId', LessonQuizController_1.getAvailableQuizzes);
exports.default = router;
