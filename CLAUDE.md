# Multi-Agent Research Pipeline

An AI system that decomposes a research query into parallel specialised
sub-tasks, runs them concurrently with live web search, synthesises
findings, quality-gates them, and returns a structured cited report.

## Architecture
- frontend/      → Next.js 14 app with SSE progress streaming
- pipeline/      → Node.js orchestration layer (5 agents)
- Uses Anthropic SDK: claude-sonnet-4-6 and claude-haiku-4-5

## Agent roster
1. Planner    → Haiku  · decomposes query → JSON task manifest
2. Researcher → Sonnet · web search tool_use · runs in parallel
3. Aggregator → Sonnet · compresses + merges researcher outputs
4. Critic     → Haiku  · quality gate · returns PASS or RETRY + flags
5. Writer     → Sonnet · final structured markdown report

## Key rules
- NEVER use Sonnet for Planner or Critic — Haiku is sufficient and 20× cheaper
- Researcher agents run via Promise.allSettled (partial failure = OK)
- Aggregator receives pre-compressed researcher output (Haiku pre-pass first)
- Critic max retry depth = 2 (guard against infinite loops)
- All agent system prompts live in pipeline/prompts/ as .ts files
- Redis cache key = SHA256(normalised query), TTL = 24h

## Current status

### Completed
| Component | File(s) |
|---|---|
| Monorepo setup — workspaces, npm install, tsconfig | `package.json`, `pipeline/tsconfig.json`, `frontend/tsconfig.json` |
| Environment config & gitignore | `.env.example`, `.gitignore` |
| Shared TypeScript interfaces | `pipeline/src/types.ts` |
| All 5 agent system prompts | `pipeline/src/prompts/planner.prompt.ts`, `researcher.ts`, `aggregator.ts`, `critic.ts`, `writer.ts` |
| **Planner agent** (Haiku, tool_use, cost tracking, prompt cache) | `pipeline/src/agents/planner.ts` |
| Next.js 14 + Tailwind frontend skeleton | `frontend/src/app/` |

### In progress / stubs
| Component | File(s) | Notes |
|---|---|---|
| Pipeline HTTP server | `pipeline/src/index.ts` | Health check only — no routes yet |
| Frontend UI | `frontend/src/app/page.tsx` | Form rendered, no handlers or SSE |

### Not yet built
- `pipeline/src/agents/researcher.ts` — parallel web search via `Promise.allSettled`
- `pipeline/src/agents/aggregator.ts` — Haiku pre-compression + Sonnet merge
- `pipeline/src/agents/critic.ts` — PASS/RETRY quality gate, max retry depth 2
- `pipeline/src/agents/writer.ts` — final structured markdown report
- `pipeline/src/orchestrator.ts` — end-to-end pipeline wiring
- Redis caching layer — SHA256 key, 24 h TTL
- SSE `/query` endpoint + frontend streaming integration