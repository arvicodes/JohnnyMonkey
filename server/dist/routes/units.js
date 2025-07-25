"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const UnitController_1 = require("../controllers/UnitController");
const router = (0, express_1.Router)();
// Alle Units zu einem Subject
router.get('/', UnitController_1.getUnits);
// Neue Unit anlegen
router.post('/', UnitController_1.createUnit);
// Unit bearbeiten
router.put('/:id', UnitController_1.updateUnit);
// Unit löschen
router.delete('/:id', UnitController_1.deleteUnit);
router.get('/:id', UnitController_1.getUnit);
exports.default = router;
