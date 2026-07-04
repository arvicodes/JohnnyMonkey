"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const router = express_1.default.Router();
const DATA_DIR = path_1.default.resolve(__dirname, '..', '..', 'be-a-hero-data');
const WORKOUTS_FILE = path_1.default.join(DATA_DIR, 'workouts.json');
function ensureDataDir() {
    if (!fs_1.default.existsSync(DATA_DIR)) {
        fs_1.default.mkdirSync(DATA_DIR, { recursive: true });
    }
}
function readWorkoutsFile() {
    ensureDataDir();
    if (!fs_1.default.existsSync(WORKOUTS_FILE)) {
        return [];
    }
    const raw = fs_1.default.readFileSync(WORKOUTS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
}
router.get('/', (_req, res) => {
    try {
        res.json(readWorkoutsFile());
    }
    catch (e) {
        console.error('be-a-hero workouts list error', e);
        res.status(500).json({ error: 'Workouts konnten nicht geladen werden' });
    }
});
router.put('/', async (req, res) => {
    try {
        const body = req.body;
        if (!Array.isArray(body)) {
            return res.status(400).json({ error: 'Erwartet ein Array von Workouts' });
        }
        ensureDataDir();
        await fs_1.default.promises.writeFile(WORKOUTS_FILE, JSON.stringify(body), 'utf8');
        res.json({ ok: true, count: body.length });
    }
    catch (e) {
        console.error('be-a-hero workouts put error', e);
        const msg = e instanceof Error ? e.message : 'Speichern fehlgeschlagen';
        res.status(400).json({ error: msg });
    }
});
exports.default = router;
//# sourceMappingURL=beAHeroWorkouts.js.map