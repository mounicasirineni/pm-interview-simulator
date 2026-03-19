/*
  # Add result columns and conversation history to sessions table
  Adds overall_score, debrief_text, conversation_history columns and update policy.
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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'conversation_history'
  ) THEN
    ALTER TABLE sessions ADD COLUMN conversation_history jsonb;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'sessions' AND policyname = 'Allow public update on sessions'
  ) THEN
    CREATE POLICY "Allow public update on sessions"
      ON sessions FOR UPDATE
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
