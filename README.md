# PM Interview Simulator
> A conversational interview simulator that runs a real PM interview loop — generate, probe, evaluate, coach — against a category-aware rubric.
> **[Live demo →](https://pm-interview-simulat-xs5s.bolt.host)**

## What it is
A four-agent system that runs the full arc of a PM interview: it picks a question in one of seven categories, conducts a multi-turn back-and-forth that pushes back on weak answers, evaluates the transcript against a rubric calibrated to that specific category, and then coaches you on the gaps the evaluator actually found. Built as a single-page vanilla JS app with Supabase for persistence and a Supabase edge function as the only component holding the Anthropic API key. Every behavior in this README is grounded in a specific file in the repo.

## Why I built it
I was prepping for PM interviews and the existing tools all failed in the same way: static question banks, generic "model answers," and no pressure. Real PM interviews are won or lost in the follow-up — when the interviewer pushes on your prioritization, asks for a number, or refuses to accept "it depends." None of that exists in flashcards. I wanted something that actually felt adversarial, that wrapped up like a real interview when the interviewer had enough signal, and that gave me feedback specific to what I said, not a polished essay generated independently of my answer.

## How it works
The system is four agents, each a single-purpose prompt, chained through one thin client wrapper.

```
User picks category
        ↓
Generator        api.js → generateQuestion
  70% generates a new question with few-shot grounding from a 140-question
  Exponent bank; 30% serves a real seeded question directly. Tracks recent
  questions to avoid repeats. Hard category boundaries in the prompt
  prevent drift (e.g. Product Sense leaking into Analytical).
        ↓
Interviewer      api.js → getInterviewerResponse
  Runs the live conversation. Prompt enforces a warm-up phase before
  pressure, one question per turn, a 3-exchange budget per concept (not
  per angle), required Product Sense phase coverage, and a hard 12-turn
  ceiling. Wraps up with an exact sentence the client detects.
        ↓
Evaluator        api.js → evaluateInterview
  Scores the full transcript on Structure, Specificity, Opinion Clarity,
  and Depth Under Pressure. Uses a category-specific Structure rubric and
  category-specific dimension weighting for the overall score, with
  explicit failure conditions that can override the weighted average.
        ↓
Coach (on demand) api.js → generateCoachFeedback
  Runs sequentially after the Evaluator and consumes its scores and
  debrief. Leads with the highest-priority dimension for the category,
  not the lowest score. Forbidden from restating the candidate's answers.
```

**Front of house.** `index.html` is a two-view SPA (Practice / Progress). `main.js` owns session state and the interview loop — it persists the running transcript on every turn via `supabase.js` `updateConversationHistory`, watches the interviewer's reply for the literal wrap-up sentence, and auto-triggers evaluation when it sees it. `voiceService.js` adds optional mic capture through Sarvam speech-to-text so users can practice out loud.

**Model calls.** `api.js` `callClaude` is the one wrapper every agent goes through. It posts to `supabase/functions/pm-interview/index.ts`, the Supabase edge function that holds the Anthropic key — the key never touches the browser.

**Persistence.** `supabase.js` writes to two tables: `sessions` (mutable conversation state + final overall score) and `scores` (immutable evaluation artifact), joined on session_id. A `progress` table maintains a running per-category average that's updated incrementally instead of recomputed from history. A separate `question_examples` table holds the 140 seeded questions the Generator pulls few-shot examples from via `researchService.js`.

**Progress dashboard.** `dashboard.js` mounts four Recharts widgets — score trend line, dimension radar, category heatmap, and an expandable session log with every past debrief — into the vanilla JS shell using cached React roots.

## What's technically interesting
**Category-aware evaluation, not a flat rubric.** Early versions used one Structure rubric across all categories and a fixed dimension weighting for the overall score. This produced nonsense — a Product Sense candidate following the correct framework (problem context → segmentation → pain points → feature → metrics) was scored as "jumping around." Fixed in `api.js` `evaluateInterview`: there's a separate Structure rubric per category, dimension weighting flips per category (Opinion Clarity dominates Product Sense, Specificity dominates Analytical and Estimation, Depth Under Pressure dominates Execution), and each category has an explicit failure condition that overrides the weighted average so a candidate can't get a 7 while completely missing the point of the question.

**Topic budget tracks concepts, not angles.** The Interviewer agent originally drilled the same idea forever by re-wording the question. Adding "max 3 exchanges per topic" didn't fix it because the model treated each rewording as a new topic. The current prompt in `getInterviewerResponse` says explicitly: track sub-topics by underlying concept, and the same idea probed from different directions still counts against the budget. A hard 12-turn ceiling sits underneath as a safety net so pacing failures can't run away.

**Coach is sequential to the Evaluator, not parallel.** The Coach receives the Evaluator's scores and debrief as input rather than re-reading the transcript independently. This was a deliberate choice — running them in parallel produced two disconnected analyses that often disagreed. Sequential composition means coaching is anchored to the same gaps the score reflects. The Coach prompt is also explicitly forbidden from restating the candidate's own answers with better vocabulary, which is the failure mode generic "model answer" features fall into.

**Defensive JSON parsing with raw fallback.** `api.js` `cleanJsonResponse` strips markdown fencing and slices to the outermost braces before `JSON.parse`, because Claude wraps JSON in fences often enough to matter. When parsing still fails, `main.js` surfaces the raw model output to the user instead of a generic error — debugging a black box is worse than seeing the actual failure.

**One trust boundary.** The Anthropic key only exists in `supabase/functions/pm-interview/index.ts`. The browser holds only the Supabase anon key. Adding an explicit RLS update policy (`add_sessions_update_policy.sql`) was necessary after sessions stopped persisting mid-interview — RLS denies by default, which is the right default but bites you the first time you forget.

## Stack
- Vanilla JS, HTML, CSS (Vite)
- Supabase (Postgres + RLS + edge functions)
- Claude Sonnet via the Anthropic API
- Recharts (mounted into vanilla DOM via React roots) for the dashboard
- Sarvam AI Saaras v3 for speech-to-text

## Live demo
**[pm-interview-simulator →](https://pm-interview-simulat-xs5s.bolt.host)**

## What I learned / what I'd do differently
**Prompt boundaries beat prompt length.** The Generator only stopped drifting between categories when I added explicit "do not generate questions containing words like *declined, dropped, investigate*" — positive examples weren't enough. Negative rules carry more signal than longer descriptions of what good looks like.

**Pacing is a product problem, not a prompt problem.** I spent a long time tweaking interviewer wording before realizing the issue was that I hadn't modeled the *arc* of a real interview at all. The fix wasn't better language — it was naming the warm-up phase, the four signal dimensions the interviewer is gathering, and the wrap-up condition explicitly. Once those concepts existed in the prompt, the tone fixed itself.

**A flat rubric is worse than no rubric.** My first evaluator used a single Structure rubric and a fixed dimension weighting. It produced confidently wrong scores — penalizing correct Product Sense sequencing as disorganized, giving high overall scores to candidates who never took a position. Category-specific rubrics plus failure conditions were the only thing that made the scores feel earned.

**I shouldn't have used JSONB for `conversation_history`.** Storing the running transcript as a JSONB column on `sessions` made early development fast but means I can't query or index individual turns, can't compute analytics like "average turn length per category" without parsing in app code, and have no referential integrity between turns and the session. The original schema actually had an `exchanges` table for exactly this — I removed it to simplify and regretted it. If I rebuilt this I'd keep `exchanges` and treat `conversation_history` on `sessions` as denormalized cache at most.

**The migration history is messier than it should be.** There are multiple `create_pm_interview_tables.sql` files with different timestamps because I recreated the schema a couple of times during early development instead of writing forward migrations. It works because every statement is `IF NOT EXISTS`, but it's not something I'd ship to a team. Lesson: even on a solo project, treat migrations as append-only from day one.

**Recent-question dedup is a string match and that's not enough.** `generateQuestion` filters out the last few exact-string questions, but the Generator can produce semantically identical questions worded differently across sessions. Real fix is an embedding-based dedup against the user's history, which is on the roadmap but not built yet.

**React-in-vanilla-JS for one chart library was the wrong call.** I pulled in React and React DOM solely so I could use Recharts in `dashboard.js`. That's a lot of bundle for four charts. If I were starting over I'd use a vanilla charting library (uPlot, Chart.js) and drop React entirely.

**The wrap-up detection is a literal string match.** `main.js` checks for the exact sentence `"Thank you, that's all I have for you today"`. It works because the prompt is forceful about the exact phrasing, but it's brittle — one model update that paraphrases will silently break auto-evaluation. A structured signal (a tool call, a JSON wrapper) would be safer.

## Roadmap
- [ ] Embedding-based question dedup across sessions
- [ ] Move `conversation_history` back into a proper `exchanges` table
- [ ] Replace literal-string wrap-up detection with a structured signal
- [ ] Drop React in favor of a vanilla charting library