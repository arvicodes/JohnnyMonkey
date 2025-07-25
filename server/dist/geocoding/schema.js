"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.puzzleAnswerSchema = exports.insertPuzzleAttemptSchema = exports.insertPointOfInterestSchema = exports.insertGameStateSchema = exports.insertTopicProgressSchema = exports.insertTopicSchema = exports.insertUserSchema = exports.puzzleAttempts = exports.pointsOfInterest = exports.gameStates = exports.topicProgress = exports.topics = exports.users = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_zod_1 = require("drizzle-zod");
const zod_1 = require("zod");
exports.users = (0, pg_core_1.pgTable)("users", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    username: (0, pg_core_1.text)("username").notNull().unique(),
    password: (0, pg_core_1.text)("password").notNull(),
});
// Informatik-Hauptthemen aus dem Lehrplan
exports.topics = (0, pg_core_1.pgTable)("topics", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    name: (0, pg_core_1.text)("name").notNull(),
    description: (0, pg_core_1.text)("description"),
    category: (0, pg_core_1.text)("category").notNull(), // Hauptbereich wie "Algorithmik", "Datenstrukturen", etc.
    color: (0, pg_core_1.text)("color").notNull(), // Farbcode für UI
    icon: (0, pg_core_1.text)("icon").notNull(), // Material Icon Name
    order: (0, pg_core_1.integer)("order").notNull(), // Reihenfolge der Anzeige
});
// Routenfortschritt pro Thema und Schwierigkeit
exports.topicProgress = (0, pg_core_1.pgTable)("topic_progress", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    userId: (0, pg_core_1.integer)("user_id").notNull(),
    topicId: (0, pg_core_1.integer)("topic_id").notNull(),
    difficulty: (0, pg_core_1.text)("difficulty").notNull(), // easy, medium, hard
    isCompleted: (0, pg_core_1.boolean)("is_completed").default(false),
    score: (0, pg_core_1.integer)("score").default(0),
    maxScore: (0, pg_core_1.integer)("max_score").default(0),
    completedAt: (0, pg_core_1.timestamp)("completed_at"),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
});
exports.gameStates = (0, pg_core_1.pgTable)("game_states", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    userId: (0, pg_core_1.integer)("user_id").notNull(),
    selectedTopicId: (0, pg_core_1.integer)("selected_topic_id"),
    selectedDifficulty: (0, pg_core_1.text)("selected_difficulty").default("easy"),
    currentPointIndex: (0, pg_core_1.integer)("current_point_index").default(0),
    playerPosition: (0, pg_core_1.jsonb)("player_position").$type(),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").defaultNow(),
});
exports.pointsOfInterest = (0, pg_core_1.pgTable)("points_of_interest", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    topicId: (0, pg_core_1.integer)("topic_id").notNull(),
    index: (0, pg_core_1.integer)("index").notNull(),
    difficulty: (0, pg_core_1.text)("difficulty").notNull(), // easy, medium, hard
    name: (0, pg_core_1.text)("name").notNull(),
    description: (0, pg_core_1.text)("description"),
    latitude: (0, pg_core_1.text)("latitude").notNull(), // Store as string for precision
    longitude: (0, pg_core_1.text)("longitude").notNull(),
    puzzleType: (0, pg_core_1.text)("puzzle_type").notNull(),
    puzzleData: (0, pg_core_1.jsonb)("puzzle_data").$type().notNull(),
});
exports.puzzleAttempts = (0, pg_core_1.pgTable)("puzzle_attempts", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    userId: (0, pg_core_1.integer)("user_id").notNull(),
    pointId: (0, pg_core_1.integer)("point_id").notNull(),
    answer: (0, pg_core_1.text)("answer").notNull(),
    isCorrect: (0, pg_core_1.boolean)("is_correct").notNull(),
    hintsUsed: (0, pg_core_1.integer)("hints_used").default(0),
    gaveUp: (0, pg_core_1.boolean)("gave_up").default(false),
    completedRetry: (0, pg_core_1.boolean)("completed_retry").default(false),
    createdAt: (0, pg_core_1.timestamp)("created_at").defaultNow(),
});
exports.insertUserSchema = (0, drizzle_zod_1.createInsertSchema)(exports.users).pick({
    username: true,
    password: true,
});
exports.insertTopicSchema = (0, drizzle_zod_1.createInsertSchema)(exports.topics).omit({
    id: true,
});
exports.insertTopicProgressSchema = (0, drizzle_zod_1.createInsertSchema)(exports.topicProgress).omit({
    id: true,
    createdAt: true,
});
exports.insertGameStateSchema = (0, drizzle_zod_1.createInsertSchema)(exports.gameStates).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});
exports.insertPointOfInterestSchema = (0, drizzle_zod_1.createInsertSchema)(exports.pointsOfInterest).omit({
    id: true,
});
exports.insertPuzzleAttemptSchema = (0, drizzle_zod_1.createInsertSchema)(exports.puzzleAttempts).omit({
    id: true,
    createdAt: true,
});
exports.puzzleAnswerSchema = zod_1.z.object({
    pointId: zod_1.z.number(),
    answer: zod_1.z.string().min(1),
    hintsUsed: zod_1.z.number().optional(),
    gaveUp: zod_1.z.boolean().optional(),
    isRetry: zod_1.z.boolean().optional(),
});
