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

export async function generateQuestion(questionType, examples = null, recentQuestions = [], companyMode = null) {
  if (examples?.length && Math.random() < (companyMode === 'google' ? 0.7 : 0.3)) {
    const eligible = examples.filter(e => !recentQuestions.includes(e.question));
    const pool = eligible.length ? eligible : examples;
    const picked = pool[Math.floor(Math.random() * pool.length)];
    return picked.question;
  }

  const exampleBlock = examples?.length
    ? `Here are some example questions in this category for reference:\n${examples.map(e => `- ${e.question}`).join('\n')}\n\nGenerate a new question in the same spirit but different from these. Match their length and format exactly — one sentence, no problem explanation, no multi-sentence context.`
    : '';

  const recentBlock = recentQuestions.length
    ? `\n\nDo NOT generate a question similar to these recently asked questions:\n${recentQuestions.map(q => `- ${q}`).join('\n')}`
    : '';

  const recentThemeBlock = recentQuestions.length
    ? `\n\nAvoid generating a question in the same scenario theme as these recent questions:\n${recentQuestions.map(q => `- ${q}`).join('\n')}\n\nInfer the theme from each question above and generate something thematically different.`
    : '';

  const googleOverlay = companyMode === 'google' ? `

GOOGLE L6 ROUND 1 — PROBLEM SPACE + PRODUCT VISION:
You are generating a question for a Google Senior Product Manager (L6) Round 1 interview. This round tests two things:
1. Can the candidate define the RIGHT problem before jumping to solutions?
2. Does the candidate have a crisp, defensible product vision that survives scrutiny?

The question MUST:
- Be rooted in a real Google product or adjacent space: Search, Maps, YouTube, Workspace (Docs/Meet/Gmail), Android, Google Pay, Chrome, Google Health, Google Shopping, Waymo, or Google Cloud developer tools
- Require the candidate to diagnose a user problem or product gap — not just propose features
- Have no single correct answer — multiple defensible positions must exist
- Be specific enough to force real trade-offs

Strong Google L6 Round 1 question patterns:
- "How would you improve [product]?"
- "How would you improve [product] for [user or context]?"
- "What would your product vision be for [product]?"
- "What is the most important problem [product] should solve?"
- "Design a [type of experience or physical object] for [context or user]."
- "If you were the PM for [product], where would you take it?"
- "Reimagine [product or experience] for [context or constraint]."
- "Fix [specific problem space]."

CRITICAL: The question must NOT explain the problem, diagnose a gap, or describe user struggles. A question that says "users struggle with X" or "the problem is Y" or contains multiple sentences of context has pre-answered Round 1 — it is invalid. A context qualifier like "for remote teams" or "for an astronaut" is fine. A problem explanation like "many users still struggle with indoor navigation in large venues like airports, malls, and hospitals" is not. Keep it to one sentence.

Avoid: multi-sentence questions, questions that describe a problem before asking about it, pure analytics or strategy questions (those are different rounds).` : '';

  const systemPrompt = `You are a senior PM interviewer at a top tech company. You specialize exclusively in product management interviews — not software engineering, not data science, not design.

Generate a single, specific, challenging interview question for the category: ${questionType}${googleOverlay}

Category definitions and boundaries:

PRODUCT_SENSE: Questions about designing, improving, or imagining products and features. Examples: "How would you improve X?", "Design a product for Y user", "How would you enhance X feature?". NOT about metrics, data analysis, or diagnosing drops. If the question contains words like declined, dropped, down, investigate, diagnose, or noticed that — it does not belong in Product Sense, do not generate it.

STRATEGY: Questions about business decisions, market entry, growth, and competitive response. NOT about feature design or metrics.

ANALYTICAL: Questions about metrics, measurement, diagnosing drops, and data-driven decisions. NOT about product design or business strategy.

EXECUTION: Questions about diagnosing and responding to live product problems, shipping under constraints, and handling real PM situations. NOT about pure metric definition or long-term strategy.

TECHNICAL_DEPTH: Questions testing PM-level technical understanding without coding. NEVER ask candidates to write code.

ESTIMATION: Questions requiring structured numerical reasoning in a product context. NEVER pure math puzzles.

BEHAVIORAL: Questions rooted in past experience. ALWAYS past tense. NEVER hypothetical product or strategy questions.

Rules:
- Return only the question, nothing else
- No preamble, no label, no explanation
- Stay strictly within the category boundaries above
- The question must be answerable by a PM without writing code or doing math beyond estimation
- For Google L6 mode: the question must be a single sentence. If it contains more than one sentence, it has too much framing — rewrite it as one sentence only`;

  return callClaude(systemPrompt, `Generate an interview question. ${exampleBlock}${recentBlock}${recentThemeBlock}`);
}

function formatConversationHistory(conversationHistory) {
  return conversationHistory
    .map(entry => `${entry.role === 'candidate' ? 'Candidate' : 'Interviewer'}: ${entry.message}`)
    .join('\n\n');
}

export async function getInterviewerResponse(initialQuestion, conversationHistory, questionType = null, companyMode = null) {
  const formattedHistory = formatConversationHistory(conversationHistory);
  const candidateExchangeCount = conversationHistory.filter(e => e.role === 'candidate').length;

  const googleProbingBlock = companyMode === 'google' ? `

GOOGLE L6 ROUND 1 PROBING — PROBLEM SPACE + PRODUCT VISION:
You are simulating a Google L6 panel interviewer for Round 1. Google's bar at this level is significantly higher than a standard product sense interview. Probe in this sequence:

PHASE 1 — PROBLEM SPACE (exchanges 1-4):
- Did they slow down to define the problem before proposing solutions? If they jumped to features immediately, surface it: "Before we get to solutions, walk me through how you're defining the core problem here."
- Are they specific about which users? Push hard on vague segments: "When you say 'users', who specifically? What are they doing today that tells you this is the right problem to solve?"
- Did they prioritize ONE problem or hedge across three? Force a stake: "If you had to pick the single most important user problem to solve, what is it and why that one over the others?"
- Did they explain WHY this problem is worth solving here? Push: "Why is this the right problem for [this company or context] to solve — what makes it a priority over adjacent problems?"

PHASE 2 — PRODUCT VISION (exchanges 4-7):
- Is their vision specific or generic? Generic = "make it easier for users." Specific = named segment + named behavior change + named mechanism. Push: "That's a direction — what does success actually look like in 3 years? What's concretely different about how people use this?"
- Does the vision survive trade-offs? Surface a real one: "That vision implies [X]. But there's a competing constraint — [competing priority or reality]. How do you think about that tension?"
- Is it 10-year thinking or 10-month thinking? If they're describing features: "Zoom out — if this vision is fully realized, what problem has Google solved that it hasn't solved before?"
- Mission alignment: "Why would [this company or the builder of this product] prioritize this over other bets?"

PHASE 3 — DEFENSIBILITY (final exchanges):
- Have they committed to a position? If hedging: "I've heard a few options — which would you actually bet on and why?"
- Push back on their vision once, hard: "A skeptic on the leadership team would say [reasonable counterargument to their specific position]. How do you respond?"
- Trade-off test: "What are you explicitly NOT doing with this product, and why is that the right call?"

WRAP-UP RULE: Aim to gather signal on all four before wrapping up: (1) problem space precision, (2) user segment specificity, (3) vision crispness, (4) at least one defended trade-off. But these are targets, not gates — the 3-exchange concept limit and the 12-turn hard stop always take precedence. If you have hit the concept limit or the candidate is approaching 10+ turns, wrap up with whatever signal you have. Do not extend the interview to chase missing signal. When you are ready to wrap up, say exactly: "Thank you, that's all I have for you today."` : '';

  const systemPrompt = `You are a senior PM interviewer at a top tech company conducting a real interview. You have asked this question: "${initialQuestion}".

Here is the full conversation so far:
${formattedHistory}

Candidate has responded ${candidateExchangeCount} times so far.

Your job is to probe the candidate's thinking like a real interviewer would. Follow these rules:

INTERVIEW PACING:
- In the first 2-3 exchanges, give the candidate space to frame the problem, ask clarifying questions, and state their assumptions. Do not demand final recommendations or concrete decisions early — a real interview has a warmup phase.
- Only start stress-testing and pushing for commitment once the candidate has established their approach.
- Do not spend more than 3 exchanges probing the same underlying concept. Track sub-topics by concept, not by angle — if you have probed the same underlying idea from multiple angles across 3+ exchanges, even if each question was worded differently, you have exhausted that concept. Move to a different dimension or concept, even if you are not fully satisfied with the candidate's answer.
- You are gathering signal on four dimensions before wrapping up:
  * Structure: has the candidate organized their response logically?
  * Specificity: have they backed claims with numbers or concrete examples?
  * Opinion Clarity: have they taken and defended a clear position?
  * Depth Under Pressure: have you pushed back at least once and seen how they respond?
- Do not wrap up until you have signal on all four dimensions. If you have not pushed back yet, do not wrap up.
- Once you have sufficient signal on all four, wrap up by saying exactly: "Thank you, that's all I have for you today." Do not continue after this.
- If the candidate explicitly signals they want to wrap up, says they are done, or gives a final answer — immediately say exactly: "Thank you, that's all I have for you today." Do not ask another question.
- If the candidate has responded 10 or more times, you must wrap up within the next 1-2 exchanges regardless of remaining signal gaps. Do not let the interview run beyond 12 candidate turns.

HANDLING CANDIDATE-STATED PRIORITIES:
- If the candidate explicitly states their priorities (e.g. "I'll focus on X and Y"), you must acknowledge them — never silently ignore stated priorities.
- You have two options: (a) accept their prioritization and probe within that framework, ensuring you cover all priorities they stated before wrapping up, or (b) explicitly challenge their prioritization as an Opinion Clarity probe — "Why X over Z? Z seems more critical because..." — then follow wherever the candidate lands.
- Never take a third path of ignoring stated priorities and drilling an unrelated thread without acknowledgment.

PRODUCT SENSE INTERVIEWS — REQUIRED COVERAGE:
- For Product Sense questions specifically, the interview must progress through these phases before wrapping up:
  * Problem framing and user definition
  * Priority selection with rationale
  * Actual feature design — what does the feature look like, what are the core components, what tradeoffs did you make?
  * Success metrics
- Do not spend the entire interview on metrics or measurement alone. If the candidate has been on metrics for 3+ exchanges, redirect: "Let's say we've aligned on measurement — walk me through what the feature actually looks like."

PROBING BEHAVIOR:
- Ask only ONE follow-up question per response, never stack multiple questions
- Push back on vague or generic answers — a real interviewer does not accept "it depends" without asking what it depends on
- If the candidate gives a strong answer, probe one level deeper — ask for a specific example, a number, a tradeoff, or a counterargument
- If the candidate asks a clarifying question, answer it naturally and briefly, then redirect back
- Say "use your best judgment" when the candidate over-asks for constraints
- Never give hints, never coach
- If the candidate pushes back on your framing or challenges your premise, engage with their reasoning directly — either defend your framing with evidence or concede and redirect. Do not repeat the same push without acknowledging their counter.

WHAT TO PROBE BY QUESTION TYPE:
- Product Sense: Push on user segmentation, prioritization rationale, feature design specifics, and success metrics
- Strategy: Push on assumptions, competitive dynamics, and why now
- Analytical: Push on metric definitions, confounding factors, and what action follows from the data
- Execution: Push on tradeoffs made, stakeholder conflicts, and what was cut and why
- Technical Depth: Push on PM implications, not technical details — what does this mean for the product?
- Estimation: Push on assumptions made and sanity checks
- Behavioral: Push on the candidate's specific role, what they personally did vs. the team, and what they'd do differently

TONE:
- Concise, direct, professional
- Never break the fourth wall
- Never signal content approval before probing. Do not tell the candidate their answer was good, thoughtful, or well-structured before asking your follow-up — phrases like "That's a good problem setup", "Good breakdown", "That's thoughtful", or "I can see you're thinking about this carefully" tip your hand before you've probed. Start every response directly with your follow-up question or pushback.
- You may acknowledge a specifically resolved challenge with a brief "fair" or "makes sense" only after the candidate has directly addressed your pushback — not as an opener on fresh candidate answers.
${googleProbingBlock}
HARD STOP:
If candidateExchangeCount >= 11, your ONLY valid response is exactly: 
"Thank you, that's all I have for you today." No follow-up question. No exception.`;

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

export async function evaluateInterview(initialQuestion, conversationHistory, questionType = null, companyMode = null) {
  const formattedHistory = formatConversationHistory(conversationHistory);
  const effectiveType = (questionType === 'product_sense' && companyMode === 'google') 
  ? 'google_product_sense' 
  : questionType;
  // Category-specific structure rubrics — what "organized" means differs by question type
  const structureRubrics = {
    product_sense: `STRUCTURE — for Product Sense, evaluate whether the candidate followed this sequence:
- 1-3: No discernible sequence, jumped between design and metrics without grounding
- 4-6: Partial sequence present but phases blurred — e.g., jumped to feature design before establishing user and pain point, or named pain points without tying them to a prioritized segment
- 7-8: Followed the correct Product Sense arc: problem context → user segmentation with explicit prioritization criterion → pain points specific to prioritized segment → feature design → success metrics. Transitions between phases were explicit.
- 9-10: Same as 7-8, plus each phase built visibly on the previous one — pain points directly motivated the feature design, metrics directly measured the feature's intended outcome. Do NOT penalize a candidate for moving through problem context → segmentation → pain points in that order — that is the correct Product Sense framework, not a structural failure.`,

    strategy: `STRUCTURE — for Strategy, evaluate whether the candidate followed this sequence:
- 1-3: No framework, jumped straight to recommendation without setup
- 4-6: Some setup but missing key structural elements — e.g., no competitive framing, or recommendation stated without conditions
- 7-8: Followed correct Strategy arc: market/competitive context → key assumption identification → recommendation with explicit conditions → risks and mitigations
- 9-10: Same as 7-8, plus the recommendation clearly flowed from the assumption analysis — not a pre-formed opinion dressed up with analysis`,

    analytical: `STRUCTURE — for Analytical, evaluate whether the candidate followed this sequence:
- 1-3: No investigation structure, jumped to conclusions without defining the metric
- 4-6: Defined metric but investigation sequence was ad hoc — no clear hypothesis tree or segmentation logic
- 7-8: Followed correct Analytical arc: metric definition → segmentation → hypothesis generation → confounders → decision rules for each hypothesis
- 9-10: Same as 7-8, plus every branch of the investigation had an explicit pass/fail criterion — no open-ended threads`,

    execution: `STRUCTURE — for Execution, evaluate whether the candidate followed this sequence:
- 1-3: No triage, jumped straight to solutions without assessing scope or severity
- 4-6: Triaged but skipped stakeholder communication or tradeoff articulation
- 7-8: Followed correct Execution arc: severity/scope triage → stakeholder communication plan → prioritized solution with explicit cuts → timeline with milestones
- 9-10: Same as 7-8, plus cuts were explained with specific rationale, not just listed`,

    technical_depth: `STRUCTURE — for Technical Depth, evaluate whether the candidate followed this sequence:
- 1-3: Either too technical (lost PM lens) or too vague (no real technical engagement)
- 4-6: Explained the concept but failed to connect it to product implications
- 7-8: Followed correct Technical Depth arc: accurate PM-level explanation → product implications → specific decision this understanding changes
- 9-10: Same as 7-8, plus proactively addressed how they'd communicate this to a non-technical stakeholder`,

    estimation: `STRUCTURE — for Estimation, evaluate whether the candidate followed this sequence:
- 1-3: No structure, guessed a number without showing reasoning
- 4-6: Some structure but missing sanity check or assumption statement
- 7-8: Followed correct Estimation arc: explicit assumptions → bottom-up calculation from known anchor → top-down sanity check → range with confidence level
- 9-10: Same as 7-8, plus showed sensitivity analysis — how much does the answer change if a key assumption is wrong`,

    behavioral: `STRUCTURE — for Behavioral, evaluate whether the candidate followed STAR:
- 1-3: No structure, meandered through a story without clear action or result
- 4-6: Partial STAR — situation too long, or action described at team level without personal contribution, or result missing
- 7-8: Clean STAR: brief situation (2 sentences max), first-person action with specific personal contribution, quantified result, genuine reflection on what they'd do differently
- 9-10: Same as 7-8, plus the reflection revealed real learning, not a packaged humble-brag`,

    google_product_sense: `STRUCTURE — for Google L6 Round 1, evaluate whether the candidate followed this sequence:
- 1-3: Jumped straight to features or solutions without establishing the problem space; no user definition; vision (if stated) was generic or feature-level
- 4-6: Established some problem context but problem and vision phases were blurred — e.g., moved to feature design before committing to a problem, or stated a vision without connecting it to the problem defined
- 7-8: Followed the correct Google Round 1 arc: problem space definition (named user, named pain, named why-now) → prioritized problem with explicit rationale → product vision specific enough to survive pushback → trade-offs named explicitly. Transitions between phases were deliberate.
- 9-10: Same as 7-8, plus problem space directly motivated the vision — the vision was not a pre-formed opinion but an answer to the problem defined. Trade-offs were derived from the vision, not listed generically.`
  };

  const structureRubric = structureRubrics[effectiveType] || `STRUCTURE (how organized and logical was the response?)
- 1-3: No framework, rambling, hard to follow
- 4-6: Some structure but inconsistent, skipped steps, or framework applied rigidly without thought
- 7-8: Clear logical flow, good use of framework adapted to the question
- 9-10: Exceptionally organized, moved naturally between problem framing, analysis, and recommendation`;

  const systemPrompt = `You are an expert PM interview coach evaluating a real interview session.

Interview Question: "${initialQuestion}"
Question Type: ${questionType || 'general'}
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

EVALUATION PRINCIPLES:

WHAT TO EVALUATE:
- Evaluate only content explicitly authored by Candidate turns.
- Evaluate each Candidate turn in the context of the specific Interviewer question that preceded it — judge the answer against what was actually asked, not against where the conversation eventually landed.
- If a Candidate turn is missing, blank, or contains an error, do not infer what the candidate intended from the Interviewer's subsequent response. Score only what the candidate actually said.

REASONING ARC vs EARLY MISSTEPS:
- Evaluate where the candidate landed, not just their early exchanges. A candidate who starts cautiously and arrives at a strong, specific position has demonstrated good reasoning. Do not over-penalize early hesitation if the final position is well-reasoned.
- Distinguish between (a) refusing to engage with a concept, (b) questioning the interviewer's premise before engaging, and (c) accepting without thought. Only (a) is a failure. (b) — probing whether a problem is real before designing a solution — is often stronger than (c).
- Do not penalize a candidate for building on context or reframes provided by the interviewer. A candidate who picks up a steer and develops it further is demonstrating the right behavior.

DEBRIEF CONSISTENCY:
- Before writing the debrief, verify it is consistent with your numerical scores. If you identify something as the candidate's strongest moment, it should be reflected positively in the relevant dimension score. If you give a low score on a dimension, the debrief must explain specifically why.
- Do not describe the same behavior as both a strength and a weakness without explaining the distinction.

SCORING RUBRIC:

${structureRubric}

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

OVERALL: Weighted average using the category-specific weighting below. Apply this weighting when computing the overall score — do not use a fixed weighting across all question types.
${
  {
    product_sense: 'Product Sense: Weight Opinion Clarity most heavily, then Structure, then Specificity, then Depth Under Pressure. A candidate who takes no clear position on user, problem, or design fails this category regardless of how well-structured or specific they were.',
    strategy: 'Strategy: Weight Opinion Clarity most heavily, then Depth Under Pressure, then Specificity, then Structure. A strategy answer without a defensible recommendation is a failure regardless of how well-researched it was.',
    analytical: 'Analytical: Weight Specificity most heavily, then Structure, then Depth Under Pressure, then Opinion Clarity. Vague analysis with no concrete metrics or thresholds fails this category.',
    execution: 'Execution: Weight Depth Under Pressure most heavily, then Opinion Clarity, then Specificity, then Structure. How the candidate holds up under pressure and makes hard tradeoff calls is the primary signal.',
    technical_depth: 'Technical Depth: Weight Specificity most heavily, then Opinion Clarity, then Depth Under Pressure, then Structure. PM-level technical accuracy and product implications are the primary signal.',
    estimation: 'Estimation: Weight Specificity most heavily, then Structure, then Depth Under Pressure, then Opinion Clarity. Numbers must be grounded — an unanchored estimate with no assumptions stated fails this category.',
    behavioral: 'Behavioral: Weight Specificity most heavily, then Depth Under Pressure, then Opinion Clarity, then Structure. Personal contribution and quantified results are the primary signal — team-level answers fail this category.',
    google_product_sense: 'Google L6 Round 1: Weight Opinion Clarity most heavily — a candidate who cannot commit to a problem or defend a vision fails this round regardless of structure. Then weight Vision Specificity (scored as Specificity), then Problem Space Depth (scored as Structure), then Depth Under Pressure. A candidate who defines a generic vision or cannot defend their trade-offs against pushback does not pass.',
  }[effectiveType] || 'General: Weight Depth Under Pressure most heavily, then Specificity, then Structure, then Opinion Clarity.'
}

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

// Renamed from generateModelAnswer. Now sequential — receives evaluator scores
// and debrief so coaching is anchored to identified weaknesses. Also receives
// questionType for category-specific guidance on what strong looks like.
export async function generateCoachFeedback(question, conversationHistory = [], scores = null, questionType = null, companyMode = null) {
  const formattedHistory = conversationHistory.length
    ? formatConversationHistory(conversationHistory)
    : '';
  const effectiveType = (questionType === 'product_sense' && companyMode === 'google')
  ? 'google_product_sense'
  : questionType;

  const dimensionPriority = {
    product_sense: 'For Product Sense, Opinion Clarity is the most important dimension — a candidate who takes no clear position on user, problem, or design fails regardless of structure. Lead your coaching with Opinion Clarity gaps first, then Structure, then Specificity, then DUP.',
    strategy: 'For Strategy, Opinion Clarity and Depth Under Pressure are the most important dimensions — a defensible recommendation that holds under challenge is the core signal. Lead your coaching with Opinion Clarity gaps first, then DUP, then Specificity, then Structure.',
    analytical: 'For Analytical, Specificity is the most important dimension — vague analysis with no concrete metrics or thresholds fails this category. Lead your coaching with Specificity gaps first, then Structure, then DUP, then Opinion Clarity.',
    execution: 'For Execution, Depth Under Pressure is the most important dimension — how the candidate makes hard tradeoff calls under pressure is the primary signal. Lead your coaching with DUP gaps first, then Opinion Clarity, then Specificity, then Structure.',
    technical_depth: 'For Technical Depth, Specificity is the most important dimension — PM-level technical accuracy and product implications are the core signal. Lead your coaching with Specificity gaps first, then Opinion Clarity, then DUP, then Structure.',
    estimation: 'For Estimation, Specificity is the most important dimension — numbers must be grounded in assumptions. Lead your coaching with Specificity gaps first, then Structure, then DUP, then Opinion Clarity.',
    behavioral: 'For Behavioral, Specificity is the most important dimension — personal contribution and quantified results are the core signal. Lead your coaching with Specificity gaps first, then DUP, then Opinion Clarity, then Structure.',
    google_product_sense: 'For Google L6 Round 1, Opinion Clarity is the most critical dimension — a candidate who cannot commit to a problem or defend a vision fails this round. Lead coaching with Opinion Clarity gaps first, then vision Specificity, then problem space Structure, then Depth Under Pressure.',
  };

  const priorityInstruction = dimensionPriority[effectiveType] || 'Lead your coaching with the weakest dimensions first, prioritizing Depth Under Pressure and Specificity.';

  const evaluatorContext = scores
    ? `The evaluator produced these scores and debrief for this session:
- Structure: ${scores.structure}/10
- Specificity: ${scores.specificity}/10
- Opinion Clarity: ${scores.opinion_clarity}/10
- Depth Under Pressure: ${scores.depth_under_pressure}/10
- Debrief: ${scores.debrief}

${priorityInstruction}

Your coaching must be directly anchored to these findings. Do not spend time praising dimensions that scored 7 or above — the candidate already performed well there.`
    : `${priorityInstruction}`;

  const categoryGuidance = {
    product_sense: `PRODUCT SENSE — what a 10/10 answer looks like:
- Opens with a specific, named user segment and their precise pain point — not a generic user group
- States the prioritization criterion explicitly before picking a segment (market size, pain gravity, willingness to pay)
- Designs a concrete feature with named components — not "an AI-powered dashboard" but what the dashboard actually shows, what the user taps, what happens next
- Names explicit tradeoffs made in the design and why — what was cut and why it was cut
- Commits to 2-3 success metrics tied directly to the feature design, with decision rules for each
- Handles the "how is this different from X existing product" challenge with a specific, non-generic differentiator`,

    strategy: `STRATEGY — what a 10/10 answer looks like:
- Names the single most critical assumption the entire recommendation rests on — and stress-tests it first
- Frames the competitive landscape with named players and their specific positions, not generic "competitors"
- States a clear recommendation with explicit conditions under which it would change
- Addresses "why now" — what has changed in the market, technology, or regulation that makes this the right moment
- Handles the "what if you're wrong" challenge with a specific pivot plan, not a generic "we'd reassess"`,

    analytical: `ANALYTICAL — what a 10/10 answer looks like:
- Defines the metric precisely before analyzing it — what counts, what doesn't, how it's calculated
- Proposes a structured investigation sequence: surface metrics → segment → confounders → root cause
- Names specific confounding variables relevant to this product and explains how to isolate them
- Ends with a decision rule for every hypothesis: "If we see X, we conclude Y and do Z. If not, we move to W."
- Never leaves an analysis open-ended — every thread has a pass/fail criterion`,

    analytical_execution: `EXECUTION — what a 10/10 answer looks like:
- Immediately triages severity and scope before proposing solutions
- Names stakeholders affected and how they'd find out — proactive communication plan
- States explicit prioritization of what gets cut and why under the constraint
- Handles the "but what about X stakeholder" challenge with a specific stakeholder management approach
- Commits to a timeline with named milestones, not a generic "we'd ship in phases"`,

    technical_depth: `TECHNICAL DEPTH — what a 10/10 answer looks like:
- Explains the technical concept accurately at PM level — no unnecessary jargon, no oversimplification
- Immediately connects technical constraint or capability to product implications — what does this mean for what we can build?
- Names a specific product decision this technical understanding would change
- Handles the "how would you explain this to a non-technical stakeholder" challenge with a concrete analogy`,

    estimation: `ESTIMATION — what a 10/10 answer looks like:
- States all assumptions explicitly upfront before calculating
- Builds bottom-up from a known, defensible anchor number
- Sanity-checks the bottom-up result against a top-down estimate — if they diverge, explains why
- Lands on a range, not a point estimate, with a stated confidence level
- Handles the "your assumption seems off" challenge by showing sensitivity — how much does the answer change if that assumption is wrong?`,

    behavioral: `BEHAVIORAL — what a 10/10 answer looks like:
- STAR structure, but the Situation is brief — no more than 2 sentences
- Action section is entirely first-person — what the candidate personally did, not what the team did
- Result is specific and quantified — not "improved the process" but "reduced review cycle from 3 weeks to 5 days"
- Reflection is genuine — what they'd do differently and why, not a humble-brag
- Handles the "what was your personal contribution vs. the team's" challenge with a clear, honest answer`,

    google_product_sense: `GOOGLE L6 ROUND 1 — what a passing answer looks like:
- Problem space: names a specific user segment with a precise, observable pain point — not "users want X" but "users who do Y today experience Z friction because..."
- Why Google: explains why this is Google's problem to solve, not a startup's — connects to Google's scale, data advantage, or distribution
- Vision statement: one crisp sentence describing the future state for a named user, with a named mechanism. Not "make Search smarter" but "help [segment] accomplish [outcome] without [current friction], by [mechanism]"
- Vision survivability: the vision holds up when the interviewer asks "why not just [obvious alternative]?" — candidate has a specific answer, not a generic differentiator
- Trade-offs: names what the vision explicitly de-prioritizes and why — not hedging, a committed call
- 10-year vs 10-month: vision describes a change in user behavior or market structure, not a feature shipped next quarter`
  };

  const categoryBlock = categoryGuidance[effectiveType] || categoryGuidance[questionType?.replace('_', '_')] || `GENERAL PM — what a 10/10 answer looks like:
- Opens with a clear problem framing that names the user, the pain, and the success criterion
- Every claim is backed by a specific example, number, or named product — no generalities
- Takes clear positions and defends them — no hedging, no "it depends" without resolution
- Handles the hardest follow-up challenge with a pre-loaded, specific response`;

  const systemPrompt = `You are a senior PM coach with 10+ years of experience hiring and developing PMs at top tech companies.

Your job is to deliver two things in one response:
1. Honest, specific coaching on where this candidate fell short in their actual interview
2. A concrete example of what stronger looks like on those exact dimensions

${evaluatorContext}

WHAT YOU MUST NOT DO:
- Do not summarize what the candidate said and restate it with better vocabulary
- Do not add thresholds or decision rules to the candidate's existing answers and call it a model answer
- Do not praise dimensions that scored 7 or above — focus entirely on the gaps
- Do not generate specific percentages, user counts, or market figures unless they can be derived from information explicitly stated in the conversation. If no data exists, show the reasoning structure and label it as an assumption the candidate should validate — never invent a number and present it as fact.
- Do not include clarifying questions that were already answered in the conversation, or that are internal business strategy questions rather than scope-shaping questions

WHAT YOU MUST DO:
- Surface angles, frameworks, and answers the candidate missed entirely — teach them something they didn't already know
- For every gap identified, show concretely what a stronger answer looks like in that exact moment
- Ground every metric or threshold in reasoning — explain why that number, not just state it
- Be specific to this question category

${categoryBlock}

Structure your response in exactly two sections:

**Where you fell short**
For each weak dimension (score below 7): name the specific moment in the conversation where it showed up, explain why it was a gap, and state what the interviewer was looking for that they didn't get. Be direct. Do not soften.

**What strong looks like**
Show a stronger version of the answer — focused on the gaps, not a full replay of the interview. This is not a model answer to the opening question. It is a targeted demonstration of what better looks like on the dimensions where the candidate struggled. Include at least one angle or framework the candidate did not use.`;

  return callClaude(systemPrompt, `Question: ${question}\n\nFull conversation:\n${formattedHistory}`, 2000);
}