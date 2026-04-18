import Anthropic from '@anthropic-ai/sdk';
import { PLANNER_SYSTEM_PROMPT } from '../prompts/planner.prompt';
import type { Task, TaskManifest } from '../types';

const MODEL = 'claude-haiku-4-5-20251001';

// Pricing per token (USD) for claude-haiku-4-5
const COST = {
  input: 0.80 / 1_000_000,
  output: 4.00 / 1_000_000,
  cacheWrite: 1.00 / 1_000_000,
  cacheRead: 0.08 / 1_000_000,
} as const;

const CREATE_TASK_MANIFEST_TOOL: Anthropic.Tool = {
  name: 'create_task_manifest',
  description: 'Create the research task manifest',
  input_schema: {
    type: 'object',
    properties: {
      tasks: {
        type: 'array',
        description: 'Ordered list of focused research sub-tasks (3–5 items)',
        minItems: 3,
        maxItems: 5,
        items: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Short slug, e.g. "task-1"',
            },
            focus: {
              type: 'string',
              description: 'One clear, narrow research question',
            },
            keywords: {
              type: 'array',
              description: 'Search terms specific enough for web search',
              items: { type: 'string' },
              minItems: 2,
            },
            priority: {
              type: 'number',
              description: 'Execution priority — 1 is highest',
            },
          },
          required: ['id', 'focus', 'keywords', 'priority'],
        },
      },
    },
    required: ['tasks'],
  },
};

function validateTaskManifest(raw: unknown): TaskManifest {
  if (typeof raw !== 'object' || raw === null || !('tasks' in raw)) {
    throw new Error('Tool input missing "tasks" field');
  }

  const { tasks } = raw as { tasks: unknown };

  if (!Array.isArray(tasks)) {
    throw new Error('"tasks" must be an array');
  }
  if (tasks.length < 3 || tasks.length > 5) {
    throw new Error(`Expected 3–5 tasks, got ${tasks.length}`);
  }

  const validated: Task[] = tasks.map((t, i) => {
    if (typeof t !== 'object' || t === null) {
      throw new Error(`Task at index ${i} is not an object`);
    }
    const task = t as Record<string, unknown>;

    if (typeof task['id'] !== 'string' || task['id'].trim() === '') {
      throw new Error(`Task ${i}: "id" must be a non-empty string`);
    }
    if (typeof task['focus'] !== 'string' || task['focus'].trim() === '') {
      throw new Error(`Task ${i}: "focus" must be a non-empty string`);
    }
    if (
      !Array.isArray(task['keywords']) ||
      task['keywords'].length < 2 ||
      task['keywords'].some((k) => typeof k !== 'string')
    ) {
      throw new Error(`Task ${i}: "keywords" must be an array of ≥2 strings`);
    }
    if (typeof task['priority'] !== 'number') {
      throw new Error(`Task ${i}: "priority" must be a number`);
    }

    return {
      id: task['id'] as string,
      focus: task['focus'] as string,
      keywords: task['keywords'] as string[],
      priority: task['priority'] as number,
    };
  });

  return { tasks: validated };
}

function calculateCost(usage: Anthropic.Messages.Usage): number {
  return (
    usage.input_tokens * COST.input +
    usage.output_tokens * COST.output +
    (usage.cache_creation_input_tokens ?? 0) * COST.cacheWrite +
    (usage.cache_read_input_tokens ?? 0) * COST.cacheRead
  );
}

export async function runPlanner(
  query: string,
): Promise<TaskManifest & { cost: number }> {
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY!,
  });
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: [
      {
        type: 'text',
        text: PLANNER_SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' },
      },
    ],
    tools: [CREATE_TASK_MANIFEST_TOOL],
    tool_choice: { type: 'tool', name: 'create_task_manifest' },
    messages: [{ role: 'user', content: query }],
  });

  const toolBlock = response.content.find(
    (block): block is Anthropic.ToolUseBlock =>
      block.type === 'tool_use' && block.name === 'create_task_manifest',
  );

  if (!toolBlock) {
    throw new Error(
      `Planner did not return a tool_use block. Stop reason: ${response.stop_reason}`,
    );
  }

  const manifest = validateTaskManifest(toolBlock.input);
  const cost = calculateCost(response.usage);

  return { ...manifest, cost };
}
