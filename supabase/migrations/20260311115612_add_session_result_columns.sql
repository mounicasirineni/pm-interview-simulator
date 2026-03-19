/*
  # Add result columns to sessions table

  1. Modified Tables
    - `sessions`
      - Add `overall_score` (integer, nullable) - stores the final overall score
      - Add `debrief_text` (text, nullable) - stores the evaluation debrief

  2. Notes
    - These columns allow storing final evaluation results directly on the session
    - Both are nullable since they're populated after evaluation completes
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'overall_score'
  ) THEN
    ALTER TABLE sessions ADD COLUMN overall_score integer;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'debrief_text'
  ) THEN
    ALTER TABLE sessions ADD COLUMN debrief_text text;
  END IF;
END $$;
