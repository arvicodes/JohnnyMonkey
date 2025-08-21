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
Object.defineProperty(exports, "__esModule", { value: true });
exports.reloadQuizFromSource = exports.checkQuizExists = exports.updateQuizQuestions = exports.getQuizzesByTeacher = exports.deleteQuiz = exports.updateQuiz = exports.getQuiz = exports.getQuizzes = exports.createQuiz = void 0;
const prisma_1 = require("../generated/prisma");
const wordParser_1 = require("../utils/wordParser");
const prisma = new prisma_1.PrismaClient();
const createQuiz = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { teacherId, sourceFile, title, description, timeLimit, shuffleQuestions, shuffleAnswers, gradeCategory } = req.body;
        if (!teacherId || !sourceFile || !title) {
            return res.status(400).json({ error: 'Lehrer-ID, Quelldatei und Titel sind erforderlich' });
        }
        console.log('Creating quiz with data:', {
            teacherId,
            sourceFile,
            title,
            description,
            timeLimit,
            shuffleQuestions,
            shuffleAnswers,
            gradeCategory
        });
        // Parse the Word file to extract questions
        console.log('Parsing Word file for quiz creation:', sourceFile);
        // The wordParser can now handle absolute paths directly
        let filePath = sourceFile;
        console.log('Using file path for parsing:', filePath);
        let parsedQuestions;
        try {
            parsedQuestions = yield (0, wordParser_1.parseWordFile)(filePath);
            console.log('Parsed questions result:', parsedQuestions);
        }
        catch (parseError) {
            console.error('Error parsing Word file:', parseError);
            return res.status(400).json({
                error: `Fehler beim Parsen der Word-Datei: ${parseError instanceof Error ? parseError.message : String(parseError)}`
            });
        }
        if (!parsedQuestions || parsedQuestions.length === 0) {
            return res.status(400).json({ error: 'Keine Fragen in der Word-Datei gefunden. Bitte überprüfen Sie das Format.' });
        }
        console.log(`Found ${parsedQuestions.length} questions, creating quiz...`);
        // Create the quiz with questions
        const quiz = yield prisma.quiz.create({
            data: {
                title,
                description: description || '',
                sourceFile,
                timeLimit: timeLimit || 30,
                shuffleQuestions: shuffleQuestions !== undefined ? shuffleQuestions : true,
                shuffleAnswers: shuffleAnswers !== undefined ? shuffleAnswers : true,
                teacherId,
                gradeCategory: gradeCategory || null,
                questions: {
                    create: parsedQuestions.map((q, index) => ({
                        question: q.question,
                        correctAnswer: q.correctAnswer,
                        options: JSON.stringify(q.options),
                        tip: q.tip || '',
                        explanation: q.explanation || '',
                        order: index + 1
                    }))
                }
            },
            include: {
                questions: true,
                teacher: {
                    include: {
                        teacherGroups: {
                            include: {
                                gradingSchemas: true
                            }
                        }
                    }
                }
            }
        });
        console.log(`Quiz created successfully with ${parsedQuestions.length} questions`);
        res.json(quiz);
    }
    catch (error) {
        console.error('Error creating quiz:', error);
        res.status(500).json({
            error: 'Fehler beim Erstellen des Quiz',
            details: error instanceof Error ? error.message : String(error)
        });
    }
});
exports.createQuiz = createQuiz;
const getQuizzes = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const quizzes = yield prisma.quiz.findMany({
            include: {
                questions: {
                    orderBy: {
                        order: 'asc'
                    }
                },
                teacher: {
                    include: {
                        teacherGroups: {
                            include: {
                                gradingSchemas: true
                            }
                        }
                    }
                }
            }
        });
        // Deserialize options for each question
        const quizzesWithParsedOptions = quizzes.map(quiz => (Object.assign(Object.assign({}, quiz), { questions: quiz.questions.map(q => (Object.assign(Object.assign({}, q), { options: JSON.parse(q.options) }))) })));
        res.json(quizzesWithParsedOptions);
    }
    catch (error) {
        console.error('Error fetching quizzes:', error);
        res.status(500).json({ error: 'Fehler beim Abrufen der Quizzes' });
    }
});
exports.getQuizzes = getQuizzes;
const getQuiz = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const quiz = yield prisma.quiz.findUnique({
            where: { id },
            include: {
                questions: {
                    orderBy: {
                        order: 'asc'
                    }
                },
                teacher: {
                    include: {
                        teacherGroups: {
                            include: {
                                gradingSchemas: true
                            }
                        }
                    }
                }
            }
        });
        if (!quiz) {
            return res.status(404).json({ error: 'Quiz nicht gefunden' });
        }
        // Deserialize options for each question
        const quizWithParsedOptions = Object.assign(Object.assign({}, quiz), { questions: quiz.questions.map(q => (Object.assign(Object.assign({}, q), { options: JSON.parse(q.options) }))) });
        res.json(quizWithParsedOptions);
    }
    catch (error) {
        console.error('Error fetching quiz:', error);
        res.status(500).json({ error: 'Fehler beim Abrufen des Quiz' });
    }
});
exports.getQuiz = getQuiz;
const updateQuiz = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { title, description, timeLimit, shuffleQuestions, shuffleAnswers, gradeCategory } = req.body;
        const quiz = yield prisma.quiz.update({
            where: { id },
            data: {
                title,
                description,
                timeLimit,
                shuffleQuestions,
                shuffleAnswers,
                gradeCategory
            },
            include: {
                questions: true,
                teacher: {
                    include: {
                        teacherGroups: {
                            include: {
                                gradingSchemas: true
                            }
                        }
                    }
                }
            }
        });
        res.json(quiz);
    }
    catch (error) {
        console.error('Error updating quiz:', error);
        res.status(500).json({ error: 'Fehler beim Aktualisieren des Quiz' });
    }
});
exports.updateQuiz = updateQuiz;
const deleteQuiz = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield prisma.quiz.delete({
            where: { id }
        });
        res.json({ message: 'Quiz erfolgreich gelöscht' });
    }
    catch (error) {
        console.error('Error deleting quiz:', error);
        res.status(500).json({ error: 'Fehler beim Löschen des Quiz' });
    }
});
exports.deleteQuiz = deleteQuiz;
const getQuizzesByTeacher = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { teacherId } = req.params;
        const quizzes = yield prisma.quiz.findMany({
            where: { teacherId },
            include: {
                questions: {
                    orderBy: {
                        order: 'asc'
                    }
                },
                teacher: {
                    include: {
                        teacherGroups: {
                            include: {
                                gradingSchemas: true
                            }
                        }
                    }
                }
            }
        });
        // Deserialize options for each question
        const quizzesWithParsedOptions = quizzes.map(quiz => (Object.assign(Object.assign({}, quiz), { questions: quiz.questions.map(q => (Object.assign(Object.assign({}, q), { options: JSON.parse(q.options) }))) })));
        res.json(quizzesWithParsedOptions);
    }
    catch (error) {
        console.error('Error fetching teacher quizzes:', error);
        res.status(500).json({ error: 'Fehler beim Abrufen der Lehrer-Quizzes' });
    }
});
exports.getQuizzesByTeacher = getQuizzesByTeacher;
const updateQuizQuestions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { questions } = req.body;
        if (!questions || !Array.isArray(questions)) {
            return res.status(400).json({ error: 'Fragen sind erforderlich und müssen ein Array sein' });
        }
        // Alle bestehenden Fragen für dieses Quiz löschen
        yield prisma.quizQuestion.deleteMany({
            where: { quizId: id }
        });
        // Neue Fragen erstellen
        const createdQuestions = yield prisma.quizQuestion.createMany({
            data: questions.map((q, index) => ({
                question: q.question,
                correctAnswer: q.correctAnswer,
                options: JSON.stringify(q.options),
                tip: q.tip || '',
                explanation: q.explanation || '',
                order: index + 1,
                quizId: id
            }))
        });
        // Aktualisiertes Quiz mit Fragen zurückgeben
        const updatedQuiz = yield prisma.quiz.findUnique({
            where: { id },
            include: {
                questions: {
                    orderBy: {
                        order: 'asc'
                    }
                },
                teacher: {
                    include: {
                        teacherGroups: {
                            include: {
                                gradingSchemas: true
                            }
                        }
                    }
                }
            }
        });
        if (!updatedQuiz) {
            return res.status(404).json({ error: 'Quiz nicht gefunden' });
        }
        // Deserialize options for each question
        const quizWithParsedOptions = Object.assign(Object.assign({}, updatedQuiz), { questions: updatedQuiz.questions.map(q => (Object.assign(Object.assign({}, q), { options: JSON.parse(q.options) }))) });
        res.json(quizWithParsedOptions);
    }
    catch (error) {
        console.error('Error updating quiz questions:', error);
        res.status(500).json({ error: 'Fehler beim Aktualisieren der Quiz-Fragen' });
    }
});
exports.updateQuizQuestions = updateQuizQuestions;
const checkQuizExists = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { sourceFile } = req.query;
        if (!sourceFile || typeof sourceFile !== 'string') {
            return res.status(400).json({ error: 'sourceFile parameter is required' });
        }
        console.log('Checking if quiz exists for file:', sourceFile);
        const quiz = yield prisma.quiz.findFirst({
            where: {
                sourceFile: sourceFile
            },
            select: {
                id: true,
                title: true,
                description: true,
                timeLimit: true,
                shuffleQuestions: true,
                shuffleAnswers: true,
                gradeCategory: true,
                createdAt: true
            }
        });
        if (quiz) {
            res.json({ exists: true, quiz });
        }
        else {
            res.json({ exists: false });
        }
    }
    catch (error) {
        console.error('Error checking quiz existence:', error);
        res.status(500).json({ error: 'Fehler beim Prüfen der Quiz-Existenz' });
    }
});
exports.checkQuizExists = checkQuizExists;
const reloadQuizFromSource = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { sourceFile } = req.body;
        if (!sourceFile) {
            return res.status(400).json({ error: 'sourceFile ist erforderlich' });
        }
        console.log(`Reloading quiz ${id} from source file: ${sourceFile}`);
        // Parse the source file to extract questions with tips and explanations
        let parsedQuestions;
        try {
            parsedQuestions = yield (0, wordParser_1.parseWordFile)(sourceFile);
            console.log('Parsed questions with tips/explanations:', parsedQuestions);
        }
        catch (parseError) {
            console.error('Error parsing source file:', parseError);
            return res.status(400).json({
                error: `Fehler beim Parsen der Quelldatei: ${parseError instanceof Error ? parseError.message : String(parseError)}`
            });
        }
        if (!parsedQuestions || parsedQuestions.length === 0) {
            return res.status(400).json({ error: 'Keine Fragen in der Quelldatei gefunden' });
        }
        // Update existing questions with new data (preserving existing IDs and order)
        const existingQuiz = yield prisma.quiz.findUnique({
            where: { id },
            include: {
                questions: {
                    orderBy: {
                        order: 'asc'
                    }
                }
            }
        });
        if (!existingQuiz) {
            return res.status(404).json({ error: 'Quiz nicht gefunden' });
        }
        // Update each question with new tip and explanation data
        for (let i = 0; i < Math.min(existingQuiz.questions.length, parsedQuestions.length); i++) {
            const existingQuestion = existingQuiz.questions[i];
            const newData = parsedQuestions[i];
            yield prisma.quizQuestion.update({
                where: { id: existingQuestion.id },
                data: {
                    tip: newData.tip || '',
                    explanation: newData.explanation || ''
                }
            });
        }
        // Return updated quiz
        const updatedQuiz = yield prisma.quiz.findUnique({
            where: { id },
            include: {
                questions: {
                    orderBy: {
                        order: 'asc'
                    }
                }
            }
        });
        if (!updatedQuiz) {
            return res.status(404).json({ error: 'Quiz nach dem Update nicht gefunden' });
        }
        // Deserialize options for each question
        const quizWithParsedOptions = Object.assign(Object.assign({}, updatedQuiz), { questions: updatedQuiz.questions.map(q => (Object.assign(Object.assign({}, q), { options: JSON.parse(q.options) }))) });
        console.log(`Quiz ${id} successfully reloaded from source with ${parsedQuestions.length} questions`);
        res.json(quizWithParsedOptions);
    }
    catch (error) {
        console.error('Error reloading quiz from source:', error);
        res.status(500).json({
            error: 'Fehler beim Neuladen des Quiz aus der Quelldatei',
            details: error instanceof Error ? error.message : String(error)
        });
    }
});
exports.reloadQuizFromSource = reloadQuizFromSource;
