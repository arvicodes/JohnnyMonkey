"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const GradingSchemaController_1 = require("../controllers/GradingSchemaController");
const router = express_1.default.Router();
router.post('/', GradingSchemaController_1.createGradingSchema);
router.post('/mss/:groupId', GradingSchemaController_1.createMSSSchema); // Spezielle Route für MSS-Schema
router.get('/:groupId', GradingSchemaController_1.getGradingSchemas);
router.put('/:id', GradingSchemaController_1.updateGradingSchema);
router.delete('/:id', GradingSchemaController_1.deleteGradingSchema);
exports.default = router;
