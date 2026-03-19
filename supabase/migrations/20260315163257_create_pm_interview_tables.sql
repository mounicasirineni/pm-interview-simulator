/*
  # PM Interview Simulator Database Schema

  1. New Tables
    - `sessions` - Stores interview session metadata
    - `exchanges` - Stores question/answer pairs
    - `scores` - Stores evaluation scores for sessions
    - `progress` - Tracks user progress over time

  2. Security
    - Enable RLS on all tables
    - Public insert/select policies for this personal tool
*/

CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_type text NOT NULL,
  initial_question text NOT NULL,
  followup_question text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sessions' AND policyname = 'Allow public insert on sessions') THEN
    CREATE POLICY "Allow public insert on sessions" ON sessions FOR INSERT WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sessions' AND policyname = 'Allow public select on sessions') THEN
    CREATE POLICY "Allow public select on sessions" ON sessions FOR SELECT USING (true);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS exchanges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  exchange_type text NOT NULL CHECK (exchange_type IN ('initial', 'followup')),
  question text NOT NULL,
  answer text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE exchanges ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'exchanges' AND policyname = 'Allow public insert on exchanges') THEN
    CREATE POLICY "Allow public insert on exchanges" ON exchanges FOR INSERT WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'exchanges' AND policyname = 'Allow public select on exchanges') THEN
    CREATE POLICY "Allow public select on exchanges" ON exchanges FOR SELECT USING (true);
  END IF;
END $$;

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

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'scores' AND policyname = 'Allow public insert on scores') THEN
    CREATE POLICY "Allow public insert on scores" ON scores FOR INSERT WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'scores' AND policyname = 'Allow public select on scores') THEN
    CREATE POLICY "Allow public select on scores" ON scores FOR SELECT USING (true);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_type text NOT NULL UNIQUE,
  sessions_completed integer DEFAULT 0,
  average_score numeric(4,2) DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE progress ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'progress' AND policyname = 'Allow public insert on progress') THEN
    CREATE POLICY "Allow public insert on progress" ON progress FOR INSERT WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'progress' AND policyname = 'Allow public select on progress') THEN
    CREATE POLICY "Allow public select on progress" ON progress FOR SELECT USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'progress' AND policyname = 'Allow public update on progress') THEN
    CREATE POLICY "Allow public update on progress" ON progress FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'overall_score') THEN
    ALTER TABLE sessions ADD COLUMN overall_score integer;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'debrief_text') THEN
    ALTER TABLE sessions ADD COLUMN debrief_text text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'conversation_history') THEN
    ALTER TABLE sessions ADD COLUMN conversation_history jsonb;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sessions' AND policyname = 'Allow public update on sessions') THEN
    CREATE POLICY "Allow public update on sessions" ON sessions FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
END $$;
