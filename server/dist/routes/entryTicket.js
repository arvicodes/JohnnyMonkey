"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const EntryTicketController_1 = require("../controllers/EntryTicketController");
const router = express_1.default.Router();
router.get('/current', EntryTicketController_1.EntryTicketController.getCurrent);
router.post('/signal', EntryTicketController_1.EntryTicketController.signal);
exports.default = router;
//# sourceMappingURL=entryTicket.js.map