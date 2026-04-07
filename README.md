# research-pipeline

Multi-agent AI system: decomposes a query → parallel web research → synthesise → quality-gate → structured cited report with SSE progress streaming.

## Stack
| Layer | Tech |
|---|---|
| Frontend | Next.js 14 (App Router), Tailwind CSS, TypeScript |
| Pipeline | Node.js, Anthropic SDK (`claude-sonnet-4-6` / `claude-haiku-4-5`) |
| Cache | Redis (ioredis) — SHA256 key, 24 h TTL |
| Monorepo | npm workspaces |

## Agents
```
query → [Planner/Haiku] → tasks[]
       → [Researcher×N/Sonnet] (Promise.allSettled, parallel)
       → [Aggregator/Sonnet] (Haiku pre-compression first)
       → [Critic/Haiku] (PASS | RETRY ×2)
       → [Writer/Sonnet] → PipelineResult
```

## Setup
```bash
cp .env.example .env          # add ANTHROPIC_API_KEY
npm install                   # installs all workspaces
npm run dev                   # pipeline :3001 + frontend :3000
```

## Env vars
| Var | Required | Default |
|---|---|---|
| `ANTHROPIC_API_KEY` | yes | — |
| `REDIS_URL` | no | disabled |
| `PORT` | no | 3001 |

## Project layout
```
research-pipeline/
├── pipeline/src/
│   ├── agents/          planner.ts  researcher.ts  (aggregator critic writer — pending)
│   ├── prompts/         *.prompt.ts  per agent
│   ├── tools/           webSearch.ts  (mock → swap for real API)
│   ├── types.ts         shared interfaces
│   └── index.ts         HTTP server (stub)
└── frontend/src/app/    Next.js pages (stub)
```

## Build status
See `CLAUDE.md § Current status`.
