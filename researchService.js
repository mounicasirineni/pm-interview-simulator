import { supabase } from './supabase.js';

export async function fetchQuestionExamples(category, companyMode = null) {
  let query = supabase
    .from('question_examples')
    .select('question, company')
    .eq('category', category);

  if (companyMode === 'google') {
    query = query.eq('company', 'google');
  }

  const { data, error } = await query;

  // If Google mode but no Google questions seeded yet, fall back to generic
  if ((error || !data?.length) && companyMode === 'google') {
    const { data: fallback, error: fallbackError } = await supabase
      .from('question_examples')
      .select('question, company')
      .eq('category', category);
    if (fallbackError || !fallback?.length) return null;
    const shuffled = fallback.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 3);
  }

  if (error || !data?.length) return null;
  const shuffled = data.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 3);
}