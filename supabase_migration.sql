-- Migration SQL to add theme columns to the users table
-- Run this in your Supabase SQL Editor:

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS theme_background text NOT NULL DEFAULT 'warm';

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS theme_accent text NOT NULL DEFAULT 'cyan';
