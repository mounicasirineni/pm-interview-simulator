
/*
  # Create question_examples table

  1. New Tables
    - `question_examples`
      - `id` (uuid, primary key, default gen_random_uuid())
      - `created_at` (timestamptz, default now())
      - `category` (text, not null)
      - `question` (text, not null)
      - `company` (text, nullable)

  2. Security
    - Enable RLS on `question_examples` table
    - Add policy for authenticated users to read all rows
*/

CREATE TABLE IF NOT EXISTS question_examples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  category text NOT NULL,
  question text NOT NULL,
  company text
);

ALTER TABLE question_examples ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read question examples"
  ON question_examples
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);
