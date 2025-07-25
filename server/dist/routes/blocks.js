"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const BlockController_1 = require("../controllers/BlockController");
const router = (0, express_1.Router)();
// Alle Blocks zu einem Subject
router.get('/', BlockController_1.getBlocks);
// Neuen Block anlegen
router.post('/', BlockController_1.createBlock);
// Block bearbeiten
router.put('/:id', BlockController_1.updateBlock);
// Block löschen
router.delete('/:id', BlockController_1.deleteBlock);
// Block per ID holen
router.get('/:id', BlockController_1.getBlock);
exports.default = router;
