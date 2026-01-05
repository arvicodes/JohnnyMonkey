"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const GradesController_1 = require("../controllers/GradesController");
const router = express_1.default.Router();
// POST /api/grades - Speichere Noten für einen Schüler
router.post('/', GradesController_1.saveGrades);
// POST /api/grades/save-bulk - Speichere Noten für mehrere Schüler auf einmal
router.post('/save-bulk', GradesController_1.saveBulkGrades);
// POST /api/grades/release - Freigabe der Gesamtnote
router.post('/release', GradesController_1.toggleGradeRelease);
// POST /api/grades/release-bulk - Freigabe der Noten für mehrere Schüler auf einmal
router.post('/release-bulk', GradesController_1.releaseBulkGrades);
// GET /api/grades/release/:studentId/:schemaId - Hole Freigabestatus
router.get('/release/:studentId/:schemaId', GradesController_1.getGradeRelease);
// GET /api/grades/:studentId/:schemaId - Hole Noten für einen Schüler und ein Schema
router.get('/:studentId/:schemaId', GradesController_1.getGrades);
// GET /api/grades/:studentId - Hole alle Noten für einen Schüler
router.get('/:studentId', GradesController_1.getGradesByStudent);
exports.default = router;
//# sourceMappingURL=grades.routes.js.map