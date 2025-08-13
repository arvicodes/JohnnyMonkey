"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const TeacherSettingsController_1 = require("../controllers/TeacherSettingsController");
const router = express_1.default.Router();
// Materialpfad für einen Lehrer abrufen
router.get('/:teacherId/material-path', TeacherSettingsController_1.TeacherSettingsController.getMaterialPath);
// Materialpfad für einen Lehrer aktualisieren
router.put('/:teacherId/material-path', TeacherSettingsController_1.TeacherSettingsController.updateMaterialPath);
// Alle Lehrer-Einstellungen für einen Lehrer abrufen
router.get('/:teacherId', TeacherSettingsController_1.TeacherSettingsController.getTeacherSettings);
// Materialien in einem Verzeichnis automatisch erkennen
router.get('/:teacherId/discover-materials', TeacherSettingsController_1.TeacherSettingsController.discoverMaterials);
// Verzeichnisstruktur für einen Lehrer abrufen
router.get('/:teacherId/directory-structure', TeacherSettingsController_1.TeacherSettingsController.getDirectoryStructure);
exports.default = router;
