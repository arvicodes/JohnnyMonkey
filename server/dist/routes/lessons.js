"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const LessonController_1 = require("../controllers/LessonController");
const router = (0, express_1.Router)();
// Alle Lessons zu einem Topic
router.get('/', LessonController_1.getLessons);
// Neue Lesson anlegen
router.post('/', LessonController_1.createLesson);
// Lesson bearbeiten
router.put('/:id', LessonController_1.updateLesson);
// Lesson löschen
router.delete('/:id', LessonController_1.deleteLesson);
router.get('/:id', LessonController_1.getLesson);
exports.default = router;
