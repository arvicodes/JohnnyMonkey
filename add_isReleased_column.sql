-- SQL Script to add isReleased column to KASubmission table
-- Run this script on your database to add the new column

ALTER TABLE KASubmission ADD COLUMN isReleased BOOLEAN DEFAULT 0;





