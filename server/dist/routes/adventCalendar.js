"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const AdventCalendarController_1 = require("../controllers/AdventCalendarController");
const router = express_1.default.Router();
// Alle Routen benötigen Authentifizierung
router.use(auth_1.authenticateUser);
// Öffentliche Routen (für Schüler)
router.get('/doors', AdventCalendarController_1.getDoors);
router.get('/doors/:doorId', AdventCalendarController_1.getDoor);
router.post('/doors/:doorId/submit', AdventCalendarController_1.submitAnswer);
router.get('/doors/:doorId/results', AdventCalendarController_1.getDoorResults);
// Admin/Teacher Routen (können später mit requireTeacher Middleware geschützt werden)
router.post('/doors', AdventCalendarController_1.createDoor);
router.post('/doors/bulk', AdventCalendarController_1.createDoorsForYear);
exports.default = router;
//# sourceMappingURL=adventCalendar.js.map