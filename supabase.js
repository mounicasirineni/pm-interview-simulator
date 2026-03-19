import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function createSession(questionType, initialQuestion) {
  const { data, error } = await supabase
    .from('sessions')
    .insert({
      question_type: questionType,
      initial_question: initialQuestion,
      conversation_history: []
    })
    .select()
    .single();

  if (error) throw error;
  return data.id;
}

export async function updateConversationHistory(sessionId, conversationHistory) {
  const { error } = await supabase
    .from('sessions')
    .update({ conversation_history: conversationHistory })
    .eq('id', sessionId);

  if (error) throw error;
}

export async function saveEvaluation(sessionId, questionType, scores, conversationHistory) {
  const { error: scoresError } = await supabase
    .from('scores')
    .insert({
      session_id: sessionId,
      structure: scores.structure,
      specificity: scores.specificity,
      opinion_clarity: scores.opinion_clarity,
      depth_under_pressure: scores.depth_under_pressure,
      debrief: scores.debrief
    });

  if (scoresError) throw scoresError;

  const { error: sessionError } = await supabase
    .from('sessions')
    .update({
      overall_score: scores.overall,
      debrief_text: scores.debrief,
      conversation_history: conversationHistory
    })
    .eq('id', sessionId);

  if (sessionError) throw sessionError;

  await updateProgress(questionType, scores);
}

export async function getSessionsWithScores() {
  const { data, error } = await supabase
    .from('sessions')
    .select(`
      id,
      question_type,
      initial_question,
      overall_score,
      debrief_text,
      created_at,
      scores (
        structure,
        specificity,
        opinion_clarity,
        depth_under_pressure,
        debrief
      )
    `)
    .not('overall_score', 'is', null)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

async function updateProgress(questionType, scores) {
  const avgScore = (
    scores.structure +
    scores.specificity +
    scores.opinion_clarity +
    scores.depth_under_pressure
  ) / 4;

  const { data: existing } = await supabase
    .from('progress')
    .select('*')
    .eq('question_type', questionType)
    .maybeSingle();

  if (existing) {
    const newSessionsCompleted = existing.sessions_completed + 1;
    const newAvgScore = (
      (existing.average_score * existing.sessions_completed) + avgScore
    ) / newSessionsCompleted;

    await supabase
      .from('progress')
      .update({
        sessions_completed: newSessionsCompleted,
        average_score: Math.round(newAvgScore * 100) / 100,
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id);
  } else {
    await supabase
      .from('progress')
      .insert({
        question_type: questionType,
        sessions_completed: 1,
        average_score: Math.round(avgScore * 100) / 100
      });
  }
}
