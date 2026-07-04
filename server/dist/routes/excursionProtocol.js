"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const ExcursionProtocolController_1 = require("../controllers/ExcursionProtocolController");
const router = express_1.default.Router();
router.get('/list', ExcursionProtocolController_1.ExcursionProtocolController.list);
router.get('/current', ExcursionProtocolController_1.ExcursionProtocolController.getCurrent);
router.post('/create', ExcursionProtocolController_1.ExcursionProtocolController.create);
router.put('/:id', ExcursionProtocolController_1.ExcursionProtocolController.update);
router.post('/:id/publish', ExcursionProtocolController_1.ExcursionProtocolController.publishById);
router.delete('/:id', ExcursionProtocolController_1.ExcursionProtocolController.remove);
router.post('/publish', ExcursionProtocolController_1.ExcursionProtocolController.publish);
router.post('/submit', ExcursionProtocolController_1.ExcursionProtocolController.submit);
router.get('/submissions', ExcursionProtocolController_1.ExcursionProtocolController.getSubmissions);
exports.default = router;
//# sourceMappingURL=excursionProtocol.js.map