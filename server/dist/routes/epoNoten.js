"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const EpoNotenController_1 = require("../controllers/EpoNotenController");
const router = express_1.default.Router();
router.get('/list', EpoNotenController_1.EpoNotenController.list);
router.get('/current', EpoNotenController_1.EpoNotenController.getCurrent);
router.get('/:id', EpoNotenController_1.EpoNotenController.getById);
router.post('/create', EpoNotenController_1.EpoNotenController.create);
router.put('/:id', EpoNotenController_1.EpoNotenController.update);
router.post('/:id/publish', EpoNotenController_1.EpoNotenController.publishById);
router.post('/:id/unpublish', EpoNotenController_1.EpoNotenController.unpublishById);
router.put('/:id/teacher/:studentId', EpoNotenController_1.EpoNotenController.saveTeacherEntry);
router.post('/:id/release', EpoNotenController_1.EpoNotenController.releaseToStudents);
router.post('/:id/reset-all', EpoNotenController_1.EpoNotenController.resetAllEntries);
router.post('/submit-self', EpoNotenController_1.EpoNotenController.submitSelf);
router.post('/submit-goals', EpoNotenController_1.EpoNotenController.submitGoals);
router.delete('/:id', EpoNotenController_1.EpoNotenController.remove);
exports.default = router;
//# sourceMappingURL=epoNoten.js.map