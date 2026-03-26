"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const ExitTicketController_1 = require("../controllers/ExitTicketController");
const router = express_1.default.Router();
router.get('/current', ExitTicketController_1.ExitTicketController.getCurrent);
router.post('/publish', ExitTicketController_1.ExitTicketController.publish);
router.post('/submit', ExitTicketController_1.ExitTicketController.submit);
router.get('/responses', ExitTicketController_1.ExitTicketController.getResponses);
exports.default = router;
//# sourceMappingURL=exitTicket.js.map