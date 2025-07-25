import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  puzzleAnswerSchema,
  insertGameStateSchema,
  insertTopicProgressSchema,
  type GameState,
  type PointOfInterest,
  type Topic,
  type TopicProgress
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Get all topics
  app.get("/api/topics", async (req, res) => {
    try {
      const topics = await storage.getAllTopics();
      res.json(topics);
    } catch (error) {
      res.status(500).json({ message: "Failed to get topics" });
    }
  });

  // Get topic by ID
  app.get("/api/topics/:id", async (req, res) => {
    try {
      const topicId = parseInt(req.params.id);
      if (isNaN(topicId)) {
        return res.status(400).json({ message: "Invalid topic ID" });
      }

      const topic = await storage.getTopic(topicId);
      if (!topic) {
        return res.status(404).json({ message: "Topic not found" });
      }

      res.json(topic);
    } catch (error) {
      res.status(500).json({ message: "Failed to get topic" });
    }
  });

  // Get user's topic progress
  app.get("/api/users/:userId/progress", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const progress = await storage.getUserTopicProgress(userId);
      res.json(progress);
    } catch (error) {
      res.status(500).json({ message: "Failed to get user progress" });
    }
  });

  // Get or create game state for a user
  app.get("/api/game/state/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const topicId = req.query.topicId ? parseInt(req.query.topicId as string) : null;
      const difficulty = req.query.difficulty as string || "easy";
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      let gameState = await storage.getGameState(userId);
      
      if (!gameState) {
        // Create new game state
        gameState = await storage.createGameState({
          userId,
          selectedTopicId: topicId,
          selectedDifficulty: difficulty,
          playerPosition: { lat: 50.3101, lng: 7.5953 } // Johanniskirche
        });
      }

      res.json(gameState);
    } catch (error) {
      res.status(500).json({ message: "Failed to get game state" });
    }
  });

  // Update game state
  app.patch("/api/game/state/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      const updates = req.body;
      const gameState = await storage.updateGameState(userId, updates);
      
      if (!gameState) {
        return res.status(404).json({ message: "Game state not found" });
      }

      res.json(gameState);
    } catch (error) {
      res.status(500).json({ message: "Failed to update game state" });
    }
  });

  // Get points by topic and difficulty
  app.get("/api/game/points", async (req, res) => {
    try {
      const topicId = req.query.topicId ? parseInt(req.query.topicId as string) : null;
      const difficulty = req.query.difficulty as string;
      
      if (topicId && difficulty) {
        const points = await storage.getPointsByTopicAndDifficulty(topicId, difficulty);
        res.json(points);
      } else {
        const points = await storage.getAllPoints();
        res.json(points);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to get points" });
    }
  });

  // Get specific point by ID
  app.get("/api/game/points/:id", async (req, res) => {
    try {
      const pointId = parseInt(req.params.id);
      if (isNaN(pointId)) {
        return res.status(400).json({ message: "Invalid point ID" });
      }

      const point = await storage.getPoint(pointId);
      if (!point) {
        return res.status(404).json({ message: "Point not found" });
      }

      res.json(point);
    } catch (error) {
      res.status(500).json({ message: "Failed to get point" });
    }
  });

  // Submit puzzle answer
  app.post("/api/game/puzzle/answer", async (req, res) => {
    try {
      const validation = puzzleAnswerSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Invalid request", 
          errors: validation.error.errors 
        });
      }

      const { pointId, answer, hintsUsed = 0, gaveUp = false } = validation.data;
      const userId = 1; // For demo purposes, using fixed user ID

      const point = await storage.getPoint(pointId);
      if (!point) {
        return res.status(404).json({ message: "Point not found" });
      }

      const isCorrect = answer.toLowerCase().trim() === point.puzzleData.answer.toLowerCase().trim();
      
      // Record the attempt
      await storage.createPuzzleAttempt({
        userId,
        pointId,
        answer,
        isCorrect,
        hintsUsed,
        gaveUp
      });

      if (isCorrect || gaveUp) {
        // Update topic progress
        const pointsEarned = gaveUp ? 0 : point.puzzleData.points - (hintsUsed * 5);
        
        // Get or create topic progress
        let topicProgress = await storage.getTopicProgress(userId, point.topicId, point.difficulty);
        
        if (!topicProgress) {
          topicProgress = await storage.createTopicProgress({
            userId,
            topicId: point.topicId,
            difficulty: point.difficulty,
            currentPointIndex: 0,
            score: 0,
            completedPoints: [],
            isCompleted: false
          });
        }

        const newCompletedPoints = [...topicProgress.completedPoints, point.index.toString()];
        const newScore = topicProgress.score + pointsEarned;
        const newCurrentIndex = topicProgress.currentPointIndex + 1;
        
        const topicPoints = await storage.getPointsByTopicAndDifficulty(point.topicId, point.difficulty);
        const isTopicCompleted = newCurrentIndex >= topicPoints.length;

        await storage.updateTopicProgress(userId, point.topicId, point.difficulty, {
          currentPointIndex: newCurrentIndex,
          score: newScore,
          completedPoints: newCompletedPoints,
          isCompleted: isTopicCompleted
        });

        // Update game state
        await storage.updateGameState(userId, {
          selectedTopicId: point.topicId,
          selectedDifficulty: point.difficulty,
          currentPointIndex: newCurrentIndex
        });

        if (gaveUp) {
          res.json({ 
            correct: true, 
            points: 0,
            message: "Lösung angezeigt. Du kannst das Konzept später nochmal üben!",
            gaveUp: true
          });
        } else {
          res.json({ 
            correct: true, 
            points: point.puzzleData.points - (hintsUsed * 5),
            message: "Rätsel gelöst!" 
          });
        }
      } else {
        res.json({ 
          correct: false, 
          message: "Falsche Antwort. Versuche es noch einmal!" 
        });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to submit answer" });
    }
  });

  // Get puzzle attempts for a user and point
  app.get("/api/game/puzzle/attempts/:pointId/:userId", async (req, res) => {
    try {
      const pointId = parseInt(req.params.pointId);
      const userId = parseInt(req.params.userId);
      
      if (isNaN(pointId) || isNaN(userId)) {
        return res.status(400).json({ message: "Invalid parameters" });
      }

      const attempts = await storage.getPuzzleAttempts(userId, pointId);
      res.json(attempts);
    } catch (error) {
      res.status(500).json({ message: "Failed to get attempts" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
