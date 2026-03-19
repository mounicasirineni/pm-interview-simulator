/*
  # Add conversation history column to sessions table

  1. Modified Tables
    - `sessions`
      - Add `conversation_history` (jsonb, nullable) - stores the full conversation as JSON array

  2. Notes
    - This allows storing the entire interview conversation in a single field
    - Format: array of {role: 'candidate'|'interviewer', message: string} objects
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'conversation_history'
  ) THEN
    ALTER TABLE sessions ADD COLUMN conversation_history jsonb;
  END IF;
END $$;