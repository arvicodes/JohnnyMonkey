"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const SubjectController_1 = require("../controllers/SubjectController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Alle Fächer eines Lehrers
router.get('/', auth_1.authenticateUser, auth_1.requireTeacher, SubjectController_1.getSubjects);
// Neues Fach anlegen
router.post('/', auth_1.authenticateUser, auth_1.requireTeacher, SubjectController_1.createSubject);
// Fach bearbeiten
router.put('/:id', auth_1.authenticateUser, auth_1.requireTeacher, SubjectController_1.updateSubject);
// Fach löschen
router.delete('/:id', auth_1.authenticateUser, auth_1.requireTeacher, SubjectController_1.deleteSubject);
router.post('/reorder', auth_1.authenticateUser, auth_1.requireTeacher, SubjectController_1.reorderSubjects);
router.post('/blocks/reorder', auth_1.authenticateUser, auth_1.requireTeacher, SubjectController_1.reorderBlocks);
router.post('/units/reorder', auth_1.authenticateUser, auth_1.requireTeacher, SubjectController_1.reorderUnits);
router.post('/topics/reorder', auth_1.authenticateUser, auth_1.requireTeacher, SubjectController_1.reorderTopics);
router.post('/lessons/reorder', auth_1.authenticateUser, auth_1.requireTeacher, SubjectController_1.reorderLessons);
router.get('/:id', auth_1.authenticateUser, SubjectController_1.getSubject);
exports.default = router;
//# sourceMappingURL=subjects.js.map