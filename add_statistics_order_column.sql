-- SQL Script to add statisticsOrder column to LearningGroup table
-- This column stores the custom order of students in the Epochalstatistik grid

ALTER TABLE LearningGroup ADD COLUMN statisticsOrder TEXT;

