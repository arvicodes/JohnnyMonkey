"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseWordFile = parseWordFile;
const mammoth_1 = __importDefault(require("mammoth"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function parseWordFile(filePath) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Convert relative path to absolute path
            const absolutePath = path_1.default.join(__dirname, '../../../', filePath.replace('/material/', 'material/'));
            console.log('Parsing file at:', absolutePath);
            let text;
            // Check file extension
            const ext = path_1.default.extname(absolutePath).toLowerCase();
            if (ext === '.docx' || ext === '.doc') {
                // Read Word document
                const result = yield mammoth_1.default.extractRawText({ path: absolutePath });
                text = result.value;
            }
            else if (ext === '.txt') {
                // Read text file
                text = fs_1.default.readFileSync(absolutePath, 'utf-8');
            }
            else {
                throw new Error('Nicht unterstütztes Dateiformat. Nur .docx, .doc und .txt Dateien werden unterstützt.');
            }
            console.log('Extracted text:', text);
            // Parse the text according to the schema
            const questions = parseQuizText(text);
            console.log('Parsed questions:', questions);
            return questions;
        }
        catch (error) {
            console.error('Error parsing file:', error);
            throw new Error('Fehler beim Parsen der Datei');
        }
    });
}
function parseQuizText(text) {
    const questions = [];
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    let currentQuestion = null;
    let currentOptions = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Check if this line starts a new question (bullet point)
        if (line.startsWith('•') || line.startsWith('-') || line.startsWith('*') || /^\d+\./.test(line)) {
            // Save previous question if exists
            if (currentQuestion && currentQuestion.question && currentOptions.length > 0) {
                questions.push({
                    question: currentQuestion.question,
                    correctAnswer: currentOptions[0], // First answer is always correct
                    options: currentOptions
                });
            }
            // Start new question
            currentQuestion = {
                question: line.replace(/^[•\-*\d\.\s]+/, '').trim()
            };
            currentOptions = [];
        }
        // Check if this line is an answer option (a), b), c), etc.)
        else if (/^[a-z]\)/.test(line.toLowerCase())) {
            const option = line.replace(/^[a-z]\)\s*/, '').trim();
            if (option.length > 0) {
                currentOptions.push(option);
            }
        }
        // If it's not a bullet point or answer option, it might be part of the question
        else if (currentQuestion && currentQuestion.question && !currentQuestion.question.includes(line)) {
            currentQuestion.question += ' ' + line;
        }
    }
    // Don't forget the last question
    if (currentQuestion && currentQuestion.question && currentOptions.length > 0) {
        questions.push({
            question: currentQuestion.question,
            correctAnswer: currentOptions[0], // First answer is always correct
            options: currentOptions
        });
    }
    return questions;
}
