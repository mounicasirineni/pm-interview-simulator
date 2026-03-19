/*
  # PM Interview Simulator Database Schema

  1. New Tables
    - `sessions` - Stores interview session metadata
      - `id` (uuid, primary key)
      - `question_type` (text) - Type of PM question
      - `initial_question` (text) - The interviewer's initial question
      - `followup_question` (text) - The follow-up question
      - `created_at` (timestamptz)
    
    - `exchanges` - Stores question/answer pairs
      - `id` (uuid, primary key)
      - `session_id` (uuid, foreign key to sessions)
      - `exchange_type` (text) - 'initial' or 'followup'
      - `question` (text)
      - `answer` (text)
      - `created_at` (timestamptz)
    
    - `scores` - Stores evaluation scores for sessions
      - `id` (uuid, primary key)
      - `session_id` (uuid, foreign key to sessions)
      - `structure` (integer) - Score out of 10
      - `specificity` (integer) - Score out of 10
      - `opinion_clarity` (integer) - Score out of 10
      - `depth_under_pressure` (integer) - Score out of 10
      - `debrief` (text) - Qualitative feedback
      - `created_at` (timestamptz)
    
    - `progress` - Tracks user progress over time
      - `id` (uuid, primary key)
      - `question_type` (text)
      - `sessions_completed` (integer)
      - `average_score` (numeric)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Public insert/select policies for this personal tool
*/

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_type text NOT NULL,
  initial_question text NOT NULL,
  followup_question text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public insert on sessions"
  ON sessions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public select on sessions"
  ON sessions FOR SELECT
  USING (true);

-- Exchanges table
CREATE TABLE IF NOT EXISTS exchanges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  exchange_type text NOT NULL CHECK (exchange_type IN ('initial', 'followup')),
  question text NOT NULL,
  answer text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE exchanges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public insert on exchanges"
  ON exchanges FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public select on exchanges"
  ON exchanges FOR SELECT
  USING (true);

-- Scores table
CREATE TABLE IF NOT EXISTS scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  structure integer NOT NULL CHECK (structure >= 0 AND structure <= 10),
  specificity integer NOT NULL CHECK (specificity >= 0 AND specificity <= 10),
  opinion_clarity integer NOT NULL CHECK (opinion_clarity >= 0 AND opinion_clarity <= 10),
  depth_under_pressure integer NOT NULL CHECK (depth_under_pressure >= 0 AND depth_under_pressure <= 10),
  debrief text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public insert on scores"
  ON scores FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public select on scores"
  ON scores FOR SELECT
  USING (true);

-- Progress table
CREATE TABLE IF NOT EXISTS progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_type text NOT NULL UNIQUE,
  sessions_completed integer DEFAULT 0,
  average_score numeric(4,2) DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public insert on progress"
  ON progress FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public select on progress"
  ON progress FOR SELECT
  USING (true);

CREATE POLICY "Allow public update on progress"
  ON progress FOR UPDATE
  USING (true)
  WITH CHECK (true);