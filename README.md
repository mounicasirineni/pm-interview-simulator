# PM Interview Simulator

> A conversational AI-powered interview simulator built for serious PM interview prep.

## What This Is

I built this to practice PM interviews the way they actually feel — not flashcards, 
not static question lists, but a live back-and-forth with an interviewer who pushes 
back, probes weaknesses, and doesn't let you off the hook with vague answers.

The simulator generates a question, conducts a realistic interview, and evaluates 
your performance across four dimensions that actually matter in PM interviews.

## What It Does

- Generates challenging PM interview questions across 7 categories: Product Sense, 
  Strategy, Analytical, Execution, Technical Depth, Estimation, and Behavioral
- Conducts a realistic conversational interview — gives you space to frame the 
  problem early, then stress-tests your reasoning and pushes for commitment
- Wraps up naturally when the interviewer has enough signal, like a real interview
- Evaluates performance on Structure, Specificity, Opinion Clarity, and Depth 
  Under Pressure with a calibrated rubric and specific debrief
- Generates a model 10/10 answer on demand after evaluation
- Supports voice input via Sarvam AI speech-to-text
- Tracks session history and score trends over time across all question categories

## How It Works
```
User selects question category
        ↓
Generator Agent
Picks from 70 seeded real PM questions or generates a new one
using few-shot examples (70% generate, 30% pull directly)
        ↓
Interviewer Agent
Conducts live back-and-forth with category-aware probing
Ends naturally when sufficient signal is gathered
        ↓
Evaluator Agent
Scores full transcript against calibrated rubric
Returns dimension scores + specific debrief
        ↓
Model Answer Generator (on demand)
Produces a 10/10 reference answer for the same question
        ↓
Session saved to database
Progress tracked over time
```

## Agent Design

**Generator Agent** — Question quality was the first thing I hardened. The prompt 
includes explicit category definitions and hard boundaries to prevent drift 
(e.g. Product Sense questions drifting into Analytical territory). A seeded bank 
of 70 real PM interview questions sourced from Exponent provides few-shot grounding 
— 70% of sessions generate a new question using examples, 30% pull directly from 
the bank.

**Interviewer Agent** — The hardest agent to get right. Early versions pushed for 
final recommendations in the first response, stacked multiple questions per turn, 
and drilled the same topic indefinitely. The current prompt enforces interview 
pacing (warm-up phase before stress-testing), one question per turn, a 3-exchange 
limit per topic, and category-aware probing behavior. The interviewer decides when 
to wrap up based on signal gathered, not a fixed exchange count.

**Evaluator Agent** — Scores against an explicit rubric with defined ranges for 
each dimension. Without a rubric, scores were uncalibrated — a 7 in one session 
meant something different than a 7 in another. The debrief is constrained to 
include what was strongest, what was weakest, how the candidate handled pressure, 
and one concrete improvement.

**Model Answer Generator** — Takes the original question and produces a structured 
ideal response showing how to frame the problem, what clarifying questions to ask, 
how to reason through tradeoffs, and how to deliver a recommendation with conviction. 
Available on demand after evaluation so it doesn't short-circuit the learning 
process.

## Tech Stack

- Frontend: Vanilla JS, HTML, CSS
- Backend: Bolt edge functions
- Database: Bolt managed database
- AI: Claude Sonnet (Anthropic) via API
- Voice: Sarvam AI speech-to-text (Saaras v3)

## What I Learned Building This

- Prompt boundaries matter more than prompt length — adding explicit "never do X" 
  rules to the Generator eliminated category drift that vague positive instructions 
  couldn't fix
- Interviewer pacing is a product problem, not just a prompt problem — the interview 
  felt adversarial until I modeled how a real interviewer behaves across the arc 
  of a conversation
- Calibration requires rubrics — open-ended scoring instructions produce inconsistent 
  scores; explicit score ranges for each dimension fixed this
- Few-shot examples improve question realism significantly — seeding with real 
  questions from Exponent grounded generation in patterns that actually appear 
  in PM interviews
- Bolt's GitHub sync is unreliable — manual terminal pushes are more dependable 
  for maintaining a clean repo

## Roadmap

- [ ] Research library integration — context-aware interviews grounded in your 
      own company deep dives (pairs with PM Research Toolkit)
- [ ] Score trend dashboard improvements
- [ ] Mobile optimization
