"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const QuizSessionController_1 = require("../controllers/QuizSessionController");
const router = express_1.default.Router();
// Quiz session routes
router.post('/:quizId/start', QuizSessionController_1.startQuizSession);
router.get('/:quizId/active', QuizSessionController_1.getActiveSession);
router.get('/session/:sessionId', QuizSessionController_1.getSessionById);
router.get('/:sessionId/quiz', QuizSessionController_1.getQuizForSession);
router.get('/:sessionId/results', QuizSessionController_1.getSessionResults);
router.get('/:quizId/sessions', QuizSessionController_1.getSessionsForQuiz);
router.post('/:sessionId/stop', QuizSessionController_1.stopQuizSession);
exports.default = router;
