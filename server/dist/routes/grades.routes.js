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
// GET /api/grades/:studentId/:schemaId - Hole Noten für einen Schüler und ein Schema
router.get('/:studentId/:schemaId', GradesController_1.getGrades);
// GET /api/grades/:studentId - Hole alle Noten für einen Schüler
router.get('/:studentId', GradesController_1.getGradesByStudent);
exports.default = router;
//# sourceMappingURL=grades.routes.js.map