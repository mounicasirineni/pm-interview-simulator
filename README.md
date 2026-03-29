# PM Interview Simulator

> A conversational AI-powered interview simulator built for serious PM interview prep.
> **[Try it live →](https://pm-interview-simulat-xs5s.bolt.host)**

## What This Is

I built this to practice PM interviews the way they actually feel — not flashcards, 
not static question lists, but a live back-and-forth with an interviewer who pushes 
back, probes weaknesses, and doesn't let you off the hook with vague answers.

The simulator generates a question, conducts a realistic interview, evaluates your 
performance against a calibrated rubric, and coaches you on exactly where you fell 
short — anchored to what actually happened in your session, not a generic model answer.

## What It Does

- Generates challenging PM interview questions across 7 categories: Product Sense, 
  Strategy, Analytical, Execution, Technical Depth, Estimation, and Behavioral
- Conducts a realistic conversational interview — gives you space to frame the 
  problem early, then stress-tests your reasoning and pushes for commitment
- Wraps up naturally when the interviewer has enough signal, like a real interview
- Evaluates performance on Structure, Specificity, Opinion Clarity, and Depth 
  Under Pressure with a category-aware rubric and specific debrief
- Provides post-session coaching anchored to your actual gaps — not a generic 
  ideal answer, but targeted feedback on what you missed and what stronger looks like
- Supports voice input via Sarvam AI speech-to-text
- Tracks session history and score trends over time across all question categories

## How It Works

```
User selects question category
        ↓
Generator Agent
Picks from 140 seeded real PM questions or generates a new one
using few-shot examples (70% generate, 30% pull directly)
        ↓
Interviewer Agent
Conducts live back-and-forth with category-aware probing
Enforces exchange limit and topic budget
Ends naturally when sufficient signal is gathered
        ↓
Evaluator Agent
Scores full transcript against category-specific rubric
Applies category-aware dimension weighting to overall score
Returns dimension scores + specific debrief
        ↓
Coach Agent (on demand, runs after Evaluator)
Receives evaluator scores and debrief as input
Produces two sections: where you fell short + what strong looks like
Coaching is anchored to your actual gaps, not a generic ideal answer
        ↓
Session saved to database
Progress tracked over time
```

## Agent Design

**Generator Agent** — Question quality was the first thing I hardened. The prompt 
includes explicit category definitions and hard boundaries to prevent drift 
(e.g. Product Sense questions drifting into Analytical territory). A seeded bank 
of 140 real PM interview questions sourced from Exponent provides few-shot grounding 
— 70% of sessions generate a new question using examples, 30% pull directly from 
the bank. Recent questions are tracked to avoid repeating similar scenarios across 
sessions.

**Interviewer Agent** — The hardest agent to get right. Early versions pushed for 
final recommendations in the first response, stacked multiple questions per turn, 
and drilled the same topic indefinitely. The current prompt enforces:
- Interview pacing — warm-up phase before stress-testing, no commitment demands early
- One question per turn — never stacking multiple probes
- Topic budget by concept — 3-exchange limit per underlying concept, not per angle, 
  so the same idea probed from different directions still counts against the budget
- Hard exchange limit — wraps up within 12 candidate turns regardless of remaining 
  signal gaps
- Candidate-stated priorities — never silently ignores priorities the candidate 
  names; either probes within them or explicitly challenges them
- Content approval prohibition — never signals whether an answer was good or bad 
  before probing; acknowledges a resolved challenge only after the candidate has 
  directly addressed it
- Category-aware probing — different dimensions probed by question type (e.g. 
  Product Sense probes user segmentation and feature design specifics; Behavioral 
  probes personal contribution vs. team contribution)
- Required phase coverage for Product Sense — must reach feature design before 
  wrapping, not just metrics

**Evaluator Agent** — Scores against an explicit rubric with defined ranges for 
each dimension. Without a rubric, scores were uncalibrated — a 7 in one session 
meant something different than a 7 in another. Key design decisions:
- Category-specific Structure rubric — what "organized" means differs by question 
  type. A Product Sense answer moving problem context → segmentation → pain points 
  is following the correct framework, not failing structure. Generic rubrics 
  penalized correct sequencing.
- Category-aware dimension weighting — the overall score weights dimensions 
  differently by category. Opinion Clarity matters most in Product Sense; 
  Specificity matters most in Analytical and Estimation; Depth Under Pressure 
  matters most in Execution. Each category also has an explicit failure condition 
  that can override the weighted average.
- Reasoning arc evaluation — scores where the candidate landed, not just early 
  exchanges. Distinguishes premise-questioning (legitimate) from refusal to engage 
  (failure).
- Debrief consistency check — debrief must reconcile with numerical scores before 
  output; can't describe something as a strength and give it a low score.

**Coach Agent** — Runs sequentially after the Evaluator, receiving scores and 
debrief as input. This sequential architecture is intentional: coaching anchored 
to evaluation findings is more useful than a generic model answer generated 
independently from the same transcript. Key design decisions:
- Leads with the highest-priority dimension for the category — for Product Sense, 
  Opinion Clarity gaps are surfaced first regardless of which dimension scored 
  lowest numerically
- Two-section output: "Where you fell short" names the specific moment in the 
  conversation where the gap showed up; "What strong looks like" demonstrates 
  stronger answers on those exact dimensions, including angles the candidate 
  didn't take
- Explicitly prohibited from restating the candidate's positions with thresholds 
  added — coaching must surface something the candidate didn't already say
- Category-specific guidance on what a 10/10 answer looks like for each of the 
  7 question types

## Tech Stack

- Frontend: Vanilla JS, HTML, CSS
- Backend: Supabase edge functions
- Database: Supabase
- AI: Claude Sonnet (Anthropic) via API
- Voice: Sarvam AI speech-to-text (Saaras v3)

## What I Learned Building This

- Prompt boundaries matter more than prompt length — adding explicit "never do X" 
  rules to the Generator eliminated category drift that vague positive instructions 
  couldn't fix
- Interviewer pacing is a product problem, not just a prompt problem — the interview 
  felt adversarial until I modeled how a real interviewer behaves across the arc 
  of a conversation
- Topic budgets need to track concepts, not angles — limiting exchanges per topic 
  didn't work until the prompt explicitly said "the same idea probed from different 
  directions still counts against the budget"
- Category-aware rubrics matter — a generic structure rubric penalized correct 
  Product Sense sequencing as a structural failure; the fix required defining what 
  "organized" means separately for each question type
- Evaluator and Coach should be sequential, not parallel — the Coach receiving 
  evaluator scores and debrief as input produces coaching anchored to actual gaps 
  rather than a generic ideal answer restated with better vocabulary
- Calibration requires rubrics with failure conditions — explicit score ranges fix 
  score variance, but category-level failure conditions (e.g. "no clear position 
  in Product Sense fails regardless of structure score") are needed to prevent 
  the weighted average from masking a fundamental miss
- Few-shot examples improve question realism significantly — seeding with 140 real 
  questions from Exponent grounded generation in patterns that actually appear in 
  PM interviews

## Roadmap

- [ ] Research library integration — context-aware interviews grounded in my 
      own company deep dives (pairs with PM Research Toolkit)
- [ ] Semantic question deduplication — current string-match allows same-domain 
      questions to slip through across sessions
- [ ] Score trend dashboard improvements
- [ ] Mobile optimization