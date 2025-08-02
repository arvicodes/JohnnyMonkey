"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const QuizParticipationController_1 = require("../controllers/QuizParticipationController");
const router = express_1.default.Router();
// Quiz participation routes (student only)
router.post('/:sessionId/start', QuizParticipationController_1.startParticipation);
router.post('/:participationId/submit', QuizParticipationController_1.submitAnswers);
router.get('/:participationId/results', QuizParticipationController_1.getParticipationResults);
router.get('/:sessionId/status', QuizParticipationController_1.getParticipationStatus);
// Teacher only routes
router.post('/:participationId/results/teacher', QuizParticipationController_1.getParticipationResultsForTeacher);
router.post('/:participationId/reset', QuizParticipationController_1.resetParticipation);
router.delete('/:participationId', QuizParticipationController_1.deleteParticipation);
exports.default = router;
