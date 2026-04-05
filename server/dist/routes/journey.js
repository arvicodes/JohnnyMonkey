"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const JourneyController_1 = require("../controllers/JourneyController");
const router = express_1.default.Router();
router.get('/', JourneyController_1.getJourney);
router.post('/care', JourneyController_1.postCare);
exports.default = router;
//# sourceMappingURL=journey.js.map