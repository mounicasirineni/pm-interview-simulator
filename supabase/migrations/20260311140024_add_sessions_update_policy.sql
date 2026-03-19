/*
  # Add update policy to sessions table

  1. Security Changes
    - Add UPDATE policy to sessions table to allow updating followup_question,
      overall_score, and debrief_text columns

  2. Notes
    - The sessions table was missing an UPDATE policy, causing silent failures
      when trying to update session records with followup questions and scores
*/

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