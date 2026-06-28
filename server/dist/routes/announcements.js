"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const AnnouncementController_1 = require("../controllers/AnnouncementController");
const router = express_1.default.Router();
const imageUpload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 12 * 1024 * 1024 },
});
router.get('/list', AnnouncementController_1.AnnouncementController.list);
router.get('/current', AnnouncementController_1.AnnouncementController.getCurrent);
router.get('/folder/:folderSlug/flyer', AnnouncementController_1.AnnouncementController.serveFlyer);
router.get('/folder/:folderSlug/flyer-design', AnnouncementController_1.AnnouncementController.getFlyerDesign);
router.put('/folder/:folderSlug/flyer-design', AnnouncementController_1.AnnouncementController.saveFlyerDesign);
router.post('/folder/:folderSlug/image', imageUpload.single('image'), AnnouncementController_1.AnnouncementController.uploadFolderImage);
router.post('/create', AnnouncementController_1.AnnouncementController.create);
router.post('/folder/create', AnnouncementController_1.AnnouncementController.createFolder);
router.put('/folder/:folderSlug', AnnouncementController_1.AnnouncementController.updateFolder);
router.post('/folder/:folderSlug/publish', AnnouncementController_1.AnnouncementController.publishFolder);
router.delete('/folder/:folderSlug', AnnouncementController_1.AnnouncementController.removeFolder);
router.put('/:id', AnnouncementController_1.AnnouncementController.update);
router.post('/:id/publish', AnnouncementController_1.AnnouncementController.publishById);
router.delete('/:id', AnnouncementController_1.AnnouncementController.remove);
router.post('/read', AnnouncementController_1.AnnouncementController.markRead);
exports.default = router;
//# sourceMappingURL=announcements.js.map