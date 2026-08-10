"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const fileSharesController_1 = require("../controllers/fileSharesController");
const router = express_1.default.Router();
// Toggle file share (add or remove)
router.post('/toggle', fileSharesController_1.toggleFileShare);
// Get all shared files for a group
router.get('/group/:groupId', fileSharesController_1.getSharedFilesForGroup);
// Check if a specific file is shared with a group
router.get('/check', fileSharesController_1.checkFileShare);
// Batch check file shares
router.post('/batch-check', fileSharesController_1.batchCheckFileShares);
// Stundenordner: Bilder entfernen, Folien-PDFs freigeben
router.post('/sync-lesson-folder', fileSharesController_1.syncLessonFolderFileShares);
exports.default = router;
//# sourceMappingURL=fileShares.js.map