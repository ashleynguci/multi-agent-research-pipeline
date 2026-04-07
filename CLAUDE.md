# research-pipeline — LLM working context

## What this is
5-agent pipeline: Planner → Researchers (parallel) → Aggregator → Critic → Writer.
Frontend streams progress via SSE. Backend is Node.js + Anthropic SDK.

## Agent roster
| # | Agent | Model | Input → Output |
|---|---|---|---|
| 1 | Planner | `claude-haiku-4-5-20251001` | query → `TaskManifest` (tool_use: `create_task_manifest`) |
| 2 | Researcher | `claude-sonnet-4-6` | `Task` + query → `ResearchFindings` (web_search loop, max 3 rounds) |
| 3 | Aggregator | `claude-sonnet-4-6` | `ResearchFindings[]` → aggregated markdown (Haiku pre-compression first) |
| 4 | Critic | `claude-haiku-4-5-20251001` | aggregated markdown → `CriticReport` (PASS\|RETRY + flags) |
| 5 | Writer | `claude-sonnet-4-6` | aggregated markdown + `CriticReport` → final `PipelineResult` |

## Hard rules
- Planner + Critic = Haiku only. Never Sonnet (20× cost difference).
- Researchers run via `Promise.allSettled` — partial failure is OK; fail only if <2 succeed.
- Aggregator always receives Haiku-compressed researcher output (prevents context overflow).
- Critic retry depth max = 2. On depth ≥ 2, pass flags to Writer as limitations.
- System prompts live in `pipeline/src/prompts/*.prompt.ts` — one file per agent.
- Cache key = `SHA256(query.toLowerCase().trim())`, TTL = 86400 s.
- All agents return `{ ...result, cost: number }` for cost aggregation in orchestrator.

## Key files
| File | Purpose |
|---|---|
| `pipeline/src/types.ts` | All shared TS interfaces |
| `pipeline/src/agents/planner.ts` | `runPlanner(query)` |
| `pipeline/src/agents/researcher.ts` | `runResearcher(task, query)` |
| `pipeline/src/tools/webSearch.ts` | Tool schema + mock handler (swap body for real API) |
| `pipeline/src/orchestrator.ts` | `runPipeline(query, emit)` — **not yet built** |
| `pipeline/src/index.ts` | HTTP server — health check stub only |
| `frontend/src/app/page.tsx` | Search UI — form stub, no SSE wiring yet |

## Current status

### Done
- Monorepo, tsconfig, `.env.example`, `.gitignore`
- `pipeline/src/types.ts` — all interfaces (`Task`, `TaskManifest`, `ResearchFindings`, `Source`, `CriticReport`, `Flag`, `PipelineResult`)
- All 5 system prompts (`pipeline/src/prompts/`)
- `agents/planner.ts` — tool_use, cost tracking, prompt cache
- `agents/researcher.ts` — web_search tool loop (max 3 rounds), cost tracking, prompt cache
- `tools/webSearch.ts` — tool schema + mock handler
- Next.js 14 + Tailwind frontend skeleton

### Pending
| File | What's needed |
|---|---|
| `agents/aggregator.ts` | Haiku pre-compression pass + Sonnet merge → markdown |
| `agents/critic.ts` | `CriticReport` via tool_use; PASS/RETRY logic |
| `agents/writer.ts` | Final `PipelineResult` markdown report |
| `orchestrator.ts` | Full pipeline wiring: cache → planner → researchers → compression → aggregator → critic loop → writer → cache write |
| `index.ts` | POST `/query` route with SSE response stream |
| `frontend/src/app/page.tsx` | EventSource wiring, progress UI, report render |

## SSE event schema
```
cache_hit          { result: PipelineResult }
agent_start        { agent, ...meta }
agent_done         { agent, ...meta }
researcher_update  { taskId, status: 'running'|'done'|'failed', findings? }
pipeline_error     { code, message }
```

## Pricing reference
| Model | Input | Output | Cache write | Cache read |
|---|---|---|---|---|
| haiku-4-5 | $0.80/MTok | $4.00/MTok | $1.00/MTok | $0.08/MTok |
| sonnet-4-6 | $3.00/MTok | $15.00/MTok | $3.75/MTok | $0.30/MTok |
