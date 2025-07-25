import { pgTable, text, serial, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import type { GameState, PointOfInterest } from "../../lib/schema";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

// Informatik-Hauptthemen aus dem Lehrplan
export const topics = pgTable("topics", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(), // Hauptbereich wie "Algorithmik", "Datenstrukturen", etc.
  color: text("color").notNull(), // Farbcode für UI
  icon: text("icon").notNull(), // Material Icon Name
  order: integer("order").notNull(), // Reihenfolge der Anzeige
});

// Routenfortschritt pro Thema und Schwierigkeit
export const topicProgress = pgTable("topic_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  topicId: integer("topic_id").notNull(),
  difficulty: text("difficulty").notNull(), // easy, medium, hard
  isCompleted: boolean("is_completed").default(false),
  score: integer("score").default(0),
  maxScore: integer("max_score").default(0),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const gameStates = pgTable("game_states", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  selectedTopicId: integer("selected_topic_id"),
  selectedDifficulty: text("selected_difficulty").default("easy"),
  currentPointIndex: integer("current_point_index").default(0),
  playerPosition: jsonb("player_position").$type<{lat: number, lng: number}>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const pointsOfInterest = pgTable("points_of_interest", {
  id: serial("id").primaryKey(),
  topicId: integer("topic_id").notNull(),
  index: integer("index").notNull(),
  difficulty: text("difficulty").notNull(), // easy, medium, hard
  name: text("name").notNull(),
  description: text("description"),
  latitude: text("latitude").notNull(), // Store as string for precision
  longitude: text("longitude").notNull(),
  puzzleType: text("puzzle_type").notNull(),
  puzzleData: jsonb("puzzle_data").$type<{
    question: string;
    answer: string;
    hint1?: string;
    hint2?: string;
    points: number;
    explanation?: string;
    retryQuestion?: string;
    retryAnswer?: string;
  }>().notNull(),
});

export const puzzleAttempts = pgTable("puzzle_attempts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  pointId: integer("point_id").notNull(),
  answer: text("answer").notNull(),
  isCorrect: boolean("is_correct").notNull(),
  hintsUsed: integer("hints_used").default(0),
  gaveUp: boolean("gave_up").default(false),
  completedRetry: boolean("completed_retry").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertTopicSchema = createInsertSchema(topics).omit({
  id: true,
});

export const insertTopicProgressSchema = createInsertSchema(topicProgress).omit({
  id: true,
  createdAt: true,
});

export const insertGameStateSchema = createInsertSchema(gameStates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPointOfInterestSchema = createInsertSchema(pointsOfInterest).omit({
  id: true,
});

export const insertPuzzleAttemptSchema = createInsertSchema(puzzleAttempts).omit({
  id: true,
  createdAt: true,
});

export const puzzleAnswerSchema = z.object({
  pointId: z.number(),
  answer: z.string().min(1),
  hintsUsed: z.number().optional(),
  gaveUp: z.boolean().optional(),
  isRetry: z.boolean().optional(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Topic = typeof topics.$inferSelect;
export type InsertTopic = z.infer<typeof insertTopicSchema>;
export type TopicProgress = typeof topicProgress.$inferSelect;
export type InsertTopicProgress = z.infer<typeof insertTopicProgressSchema>;
export type GameState = typeof gameStates.$inferSelect;
export type InsertGameState = z.infer<typeof insertGameStateSchema>;
export type PointOfInterest = typeof pointsOfInterest.$inferSelect;
export type InsertPointOfInterest = z.infer<typeof insertPointOfInterestSchema>;
export type PuzzleAttempt = typeof puzzleAttempts.$inferSelect;
export type InsertPuzzleAttempt = z.infer<typeof insertPuzzleAttemptSchema>;
export type PuzzleAnswerRequest = z.infer<typeof puzzleAnswerSchema>;
