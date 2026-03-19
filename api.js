const API_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/pm-interview`;

async function callClaude(systemPrompt, userMessage, maxTokens = 1000) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      'Apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      system_prompt: systemPrompt,
      user_message: userMessage,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'API request failed');
  }

  const data = await response.json();
  return data.text;
}

export async function generateQuestion(questionType, examples = null) {
  if (examples?.length && Math.random() < 0.3) {
    const picked = examples[Math.floor(Math.random() * examples.length)];
    return picked.question;
  }

  const exampleBlock = examples?.length
    ? `Here are some example questions in this category for reference:\n${examples.map(e => `- ${e.question}`).join('\n')}\n\nGenerate a new question in the same spirit but different from these.`
    : '';

  const systemPrompt = `You are a senior PM interviewer at a top tech company. You specialize exclusively in product management interviews — not software engineering, not data science, not design.

Generate a single, specific, challenging interview question for the category: ${questionType}

Category definitions and boundaries:

PRODUCT_SENSE: Questions about designing, improving, or imagining products and features. Examples: "How would you improve X?", "Design a product for Y user", "How would you enhance X feature?". NOT about metrics, data analysis, or diagnosing drops. If the question contains words like declined, dropped, down, investigate, diagnose, or noticed that — it does not belong in Product Sense, do not generate it.

STRATEGY: Questions about business decisions, market entry, growth, and competitive response. Examples: "Should Company X enter Market Y?", "How would you grow X 10x?", "A competitor just launched Y — how do you respond?". NOT about feature design or metrics.

ANALYTICAL: Questions about metrics, measurement, diagnosing drops, and data-driven decisions. Examples: "Metric X dropped — how do you investigate?", "How would you measure success of X?", "Set goals for X product". NOT about product design or business strategy.

EXECUTION: Questions about shipping, prioritization, and handling real constraints. Examples: "You're 2 weeks from launch and X happens", "Metric X dropped — what do you do as the PM?", "How do you align teams under a tight deadline?". NOT about design or strategy.

TECHNICAL_DEPTH: Questions testing PM-level technical understanding without coding. Examples: "How does X technology work and what are the PM implications?", "How would you explain X constraint to a non-technical stakeholder?". NEVER ask candidates to write code or algorithms.

ESTIMATION: Questions requiring structured numerical reasoning in a product context. Examples: "Estimate the market size of X", "How many users does X feature have?". Always ground in a real product or business context. NEVER pure math puzzles.

BEHAVIORAL: Questions rooted in past experience. Examples: "Tell me about a time you...", "Describe a situation where...". ALWAYS past tense, real experience. NEVER hypothetical product or strategy questions.

Rules:
- Return only the question, nothing else
- No preamble, no label, no explanation
- Stay strictly within the category boundaries above
- The question must be answerable by a PM without writing code or doing math beyond estimation`;

  return callClaude(systemPrompt, `Generate an interview question. ${exampleBlock}`);
}

function formatConversationHistory(conversationHistory) {
  return conversationHistory
    .map(entry => `${entry.role === 'candidate' ? 'Candidate' : 'Interviewer'}: ${entry.message}`)
    .join('\n\n');
}

export async function getInterviewerResponse(initialQuestion, conversationHistory, questionType = null) {
  const formattedHistory = formatConversationHistory(conversationHistory);

  const systemPrompt = `You are a senior PM interviewer at a top tech company conducting a real interview. You have asked this question: "${initialQuestion}".

Here is the full conversation so far:
${formattedHistory}

Your job is to probe the candidate's thinking like a real interviewer would. Follow these rules:

INTERVIEW PACING:
- In the first 2-3 exchanges, give the candidate space to frame the problem, ask clarifying questions, and state their assumptions. Do not demand final recommendations or concrete decisions early — a real interview has a warmup phase.
- Only start stress-testing and pushing for commitment once the candidate has established their approach.
- Do not spend more than 3 exchanges probing the same topic or dimension. If you have pushed on a topic 3 times and the candidate has responded, move to a different dimension or wrap up.
- If you have covered at least 3 different angles and the conversation has had more than 8 exchanges total, you should strongly consider wrapping up.
- When you feel you have sufficiently tested the candidate's reasoning, ability to handle pushback, and depth of knowledge, wrap up by saying exactly: "Thank you, that's all I have for you today." Do not continue after this. End when you have enough signal, not on a fixed schedule.

PROBING BEHAVIOR:
- Ask only ONE follow-up question per response, never stack multiple questions
- Push back on vague or generic answers — a real interviewer does not accept "it depends" without asking what it depends on
- If the candidate gives a strong answer, probe one level deeper — ask for a specific example, a number, a tradeoff, or a counterargument
- If the candidate asks a clarifying question, answer it naturally and briefly, then redirect back
- Say "use your best judgment" when the candidate over-asks for constraints
- Never give hints, never validate answers with "great point", never coach

WHAT TO PROBE BY QUESTION TYPE:
- Product Sense: Push on user segmentation, prioritization rationale, and success metrics
- Strategy: Push on assumptions, competitive dynamics, and why now
- Analytical: Push on metric definitions, confounding factors, and what action follows from the data
- Execution: Push on tradeoffs made, stakeholder conflicts, and what was cut and why
- Technical Depth: Push on PM implications, not technical details — what does this mean for the product?
- Estimation: Push on assumptions made and sanity checks
- Behavioral: Push on the candidate's specific role, what they personally did vs. the team, and what they'd do differently

TONE:
- Concise, direct, professional
- Never break the fourth wall
- Never compliment or encourage — stay neutral`;

  return callClaude(systemPrompt, 'Continue the interview based on the conversation.', 500);
}

function cleanJsonResponse(text) {
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '');
  cleaned = cleaned.trim();
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }
  return cleaned;
}

export async function evaluateInterview(initialQuestion, conversationHistory) {
  const formattedHistory = formatConversationHistory(conversationHistory);

  const systemPrompt = `You are an expert PM interview coach evaluating a real interview session.

Interview Question: "${initialQuestion}"
Full conversation:
${formattedHistory}

Evaluate the candidate strictly and return a JSON object with exactly this structure:
{
  "structure": <1-10>,
  "specificity": <1-10>,
  "opinion_clarity": <1-10>,
  "depth_under_pressure": <1-10>,
  "overall": <1-10>,
  "debrief": "<4-5 sentences: what was strongest, what was weakest, how well did they handle follow-up pressure, one concrete thing to do differently next time>"
}

SCORING RUBRIC:

STRUCTURE (how organized and logical was the response?)
- 1-3: No framework, rambling, hard to follow
- 4-6: Some structure but inconsistent, skipped steps, or framework applied rigidly without thought
- 7-8: Clear logical flow, good use of framework adapted to the question
- 9-10: Exceptionally organized, moved naturally between problem framing, analysis, and recommendation

SPECIFICITY (how concrete and detailed were the answers?)
- 1-3: All generalities, no examples, no numbers, no named products or companies
- 4-6: Some specifics but mixed with vague statements
- 7-8: Consistent use of specific examples, metrics, or real-world references
- 9-10: Every claim backed by a specific example, number, or named reference

OPINION CLARITY (did the candidate take clear positions and defend them?)
- 1-3: Avoided taking positions, hedged everything, no clear recommendation
- 4-6: Took some positions but backed down under pressure or over-qualified
- 7-8: Clear opinions, defended them with reasoning, updated when genuinely challenged
- 9-10: Confident, well-reasoned positions that held up under pressure with intellectual honesty

DEPTH UNDER PRESSURE (how well did they respond to follow-up probing?)
- 1-3: Fell apart under follow-up, repeated the same answer, or deflected
- 4-6: Handled some follow-ups but ran out of depth on harder probes
- 7-8: Consistently went deeper when pushed, revealed genuine understanding
- 9-10: Thrived under pressure, each probe revealed more nuance and insight

OVERALL: Weighted average with depth_under_pressure weighted most heavily, then specificity, then structure, then opinion_clarity.

Be honest. A 7 should feel earned. Return only the JSON, nothing else.`;

  const rawText = await callClaude(systemPrompt, 'Evaluate this interview conversation.', 2000);
  console.log('Raw evaluation response:', rawText);

  try {
    const cleaned = cleanJsonResponse(rawText);
    return JSON.parse(cleaned);
  } catch (parseError) {
    console.error('JSON parse error:', parseError);
    const error = new Error('Failed to parse evaluation response');
    error.rawResponse = rawText;
    throw error;
  }
}

export async function generateModelAnswer(question) {
  const systemPrompt = `You are a senior PM with 10+ years of experience at top tech companies like Google, Meta, and Amazon. 

Given a PM interview question, write what a 10/10 answer looks like.

Structure your response as:
**How to frame the problem** — the right opening move
**Key clarifying questions** — what to ask and why
**Core tradeoffs** — what tensions to surface and how to reason through them
**Final recommendation** — a specific, well-reasoned decision stated with conviction
**How to handle pushback** — how to defend the recommendation under pressure

Be concrete and specific. Show exactly what strong PM thinking sounds like, not generic advice.`;

  return callClaude(systemPrompt, `Question: ${question}`, 2000);
}
