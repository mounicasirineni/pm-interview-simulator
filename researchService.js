import { supabase } from './supabase.js';

export async function fetchQuestionExamples(category) {
  const { data, error } = await supabase
    .from('question_examples')
    .select('question, company')
    .eq('category', category);

  if (error || !data?.length) return null;

  const shuffled = data.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 3);
}
