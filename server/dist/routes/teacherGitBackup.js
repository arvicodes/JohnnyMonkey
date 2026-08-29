"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const teacherGitBackup_1 = require("../utils/teacherGitBackup");
const router = express_1.default.Router();
router.use(auth_1.authenticateUser, auth_1.requireTeacher);
router.get('/', (_req, res) => {
    res.json((0, teacherGitBackup_1.getTeacherGitBackupStatus)());
});
router.post('/', async (req, res) => {
    req.setTimeout(300000);
    res.setTimeout(300000);
    try {
        const result = await (0, teacherGitBackup_1.runTeacherGitBackup)();
        res.status(result.ok ? 200 : 409).json(result);
    }
    catch (error) {
        console.error('teacher-git-backup:', error);
        res.status(500).json({
            ok: false,
            committed: false,
            pushed: false,
            message: 'Unerwarteter Fehler beim Schieben nach GitHub.',
        });
    }
});
exports.default = router;
//# sourceMappingURL=teacherGitBackup.js.map