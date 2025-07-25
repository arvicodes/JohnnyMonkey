"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const TopicController_1 = require("../controllers/TopicController");
const router = (0, express_1.Router)();
// Alle Topics zu einer Unit
router.get('/', TopicController_1.getTopics);
// Neues Topic anlegen
router.post('/', TopicController_1.createTopic);
// Topic bearbeiten
router.put('/:id', TopicController_1.updateTopic);
// Topic löschen
router.delete('/:id', TopicController_1.deleteTopic);
// Einzelnes Topic abrufen
router.get('/:id', TopicController_1.getTopic);
exports.default = router;
