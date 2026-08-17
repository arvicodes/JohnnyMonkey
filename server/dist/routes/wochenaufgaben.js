"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const wochenaufgabenController_1 = require("../controllers/wochenaufgabenController");
const router = (0, express_1.Router)();
router.get('/states/:groupId', wochenaufgabenController_1.listWochenaufgabeStates);
router.put('/activate', wochenaufgabenController_1.activateWochenaufgabe);
router.post('/claim-video', wochenaufgabenController_1.claimWochenaufgabeVideo);
exports.default = router;
//# sourceMappingURL=wochenaufgaben.js.map