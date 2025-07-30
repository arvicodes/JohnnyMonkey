"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const prisma_1 = require("../generated/prisma");
const QuizController_1 = require("../controllers/QuizController");
const router = express_1.default.Router();
const prisma = new prisma_1.PrismaClient();
// Quiz CRUD operations
router.post('/create', QuizController_1.createQuiz);
router.get('/', QuizController_1.getQuizzes);
router.get('/:id', QuizController_1.getQuiz);
router.put('/:id/settings', QuizController_1.updateQuiz);
router.delete('/:id', QuizController_1.deleteQuiz);
// Teacher-specific quiz operations
router.get('/teacher/:teacherId', QuizController_1.getQuizzesByTeacher);
exports.default = router;
