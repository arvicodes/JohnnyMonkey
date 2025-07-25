"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const GradingSchemaController_1 = require("../controllers/GradingSchemaController");
const router = express_1.default.Router();
router.post('/', GradingSchemaController_1.createSchema);
router.get('/group/:groupId', GradingSchemaController_1.getSchemas);
router.delete('/:id', GradingSchemaController_1.deleteSchema);
exports.default = router;
