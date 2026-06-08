"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const ExcursionProtocolController_1 = require("../controllers/ExcursionProtocolController");
const router = express_1.default.Router();
router.get('/current', ExcursionProtocolController_1.ExcursionProtocolController.getCurrent);
router.post('/publish', ExcursionProtocolController_1.ExcursionProtocolController.publish);
router.post('/submit', ExcursionProtocolController_1.ExcursionProtocolController.submit);
router.get('/submissions', ExcursionProtocolController_1.ExcursionProtocolController.getSubmissions);
exports.default = router;
//# sourceMappingURL=excursionProtocol.js.map