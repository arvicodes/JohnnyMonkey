"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const SubjectController_1 = require("../controllers/SubjectController");
const router = (0, express_1.Router)();
// Alle Fächer eines Lehrers
router.get('/', SubjectController_1.getSubjects);
// Neues Fach anlegen
router.post('/', SubjectController_1.createSubject);
// Fach bearbeiten
router.put('/:id', SubjectController_1.updateSubject);
// Fach löschen
router.delete('/:id', SubjectController_1.deleteSubject);
router.post('/reorder', SubjectController_1.reorderSubjects);
router.post('/blocks/reorder', SubjectController_1.reorderBlocks);
router.post('/units/reorder', SubjectController_1.reorderUnits);
router.post('/topics/reorder', SubjectController_1.reorderTopics);
router.post('/lessons/reorder', SubjectController_1.reorderLessons);
router.get('/:id', SubjectController_1.getSubject);
exports.default = router;
