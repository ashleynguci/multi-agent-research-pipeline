import Anthropic from '@anthropic-ai/sdk';
import { RESEARCHER_SYSTEM_PROMPT } from '../prompts/researcher.prompt';
import { WEB_SEARCH_TOOL, executeWebSearch } from '../tools/webSearch';
import type { Task, ResearchFindings, Source } from '../types';
import type { WebSearchResult } from '../tools/webSearch';

const MODEL = 'claude-sonnet-4-6';
const MAX_TOOL_ROUNDS = 3;

// Pricing per token (USD) for claude-sonnet-4-6
const COST = {
  input: 3.00 / 1_000_000,
  output: 15.00 / 1_000_000,
  cacheWrite: 3.75 / 1_000_000,
  cacheRead: 0.30 / 1_000_000,
} as const;

interface AccumulatedUsage {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens: number;
  cache_read_input_tokens: number;
}

function addUsage(acc: AccumulatedUsage, usage: Anthropic.Messages.Usage): void {
  acc.input_tokens += usage.input_tokens;
  acc.output_tokens += usage.output_tokens;
  acc.cache_creation_input_tokens += usage.cache_creation_input_tokens ?? 0;
  acc.cache_read_input_tokens += usage.cache_read_input_tokens ?? 0;
}

function calculateCost(usage: AccumulatedUsage): number {
  return (
    usage.input_tokens * COST.input +
    usage.output_tokens * COST.output +
    usage.cache_creation_input_tokens * COST.cacheWrite +
    usage.cache_read_input_tokens * COST.cacheRead
  );
}

function deriveConfidence(sources: Source[]): number {
  if (sources.length === 0) return 0.2;
  if (sources.length <= 2) return 0.5;
  if (sources.length <= 4) return 0.7;
  return 0.85;
}

function extractSummary(content: Anthropic.ContentBlock[]): string {
  const textBlocks = content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text.trim())
    .filter((text) => text.length > 0);

  return textBlocks.join('\n\n') || '(No summary produced by researcher.)';
}

function mapToSources(results: WebSearchResult[]): Source[] {
  return results.map((r) => ({
    url: r.url,
    title: r.title,
    excerpt: r.snippet,
    publishedAt: r.publishedAt,
  }));
}

function buildUserMessage(task: Task, query: string): string {
  return (
    `Original research query: "${query}"\n\n` +
    `Your assigned sub-task:\n` +
    `  ID:       ${task.id}\n` +
    `  Focus:    ${task.focus}\n` +
    `  Keywords: ${task.keywords.join(', ')}\n` +
    `  Priority: ${task.priority}\n\n` +
    `Search for information relevant to your focus area only. ` +
    `Use the keywords above as starting points and refine your searches as needed.`
  );
}

export async function runResearcher(
  task: Task,
  query: string,
): Promise<ResearchFindings & { cost: number }> {
  const client = new Anthropic();

  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: buildUserMessage(task, query) },
  ];

  const usage: AccumulatedUsage = {
    input_tokens: 0,
    output_tokens: 0,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0,
  };

  // Collect every source returned across all search rounds
  const allSources: Source[] = [];
  let finalContent: Anthropic.ContentBlock[] = [];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1500,
      system: [
        {
          type: 'text',
          text: RESEARCHER_SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      tools: [WEB_SEARCH_TOOL],
      messages,
    });

    addUsage(usage, response.usage);
    finalContent = response.content;

    if (response.stop_reason === 'end_turn') {
      // Claude finished — no more tool calls
      break;
    }

    if (response.stop_reason === 'tool_use') {
      const toolUseBlocks = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use',
      );

      // Execute each web_search call and collect results
      const toolResults: Anthropic.ToolResultBlockParam[] = toolUseBlocks.map((block) => {
        if (block.name !== 'web_search') {
          // Unknown tool — acknowledge and continue
          return {
            type: 'tool_result' as const,
            tool_use_id: block.id,
            content: 'Unknown tool. Only web_search is available.',
          };
        }

        const input = block.input as { query: string; max_results?: number };
        const results = executeWebSearch(input);
        allSources.push(...mapToSources(results));

        return {
          type: 'tool_result' as const,
          tool_use_id: block.id,
          content: JSON.stringify(results),
        };
      });

      // Append assistant turn + tool results before next round
      messages.push({ role: 'assistant', content: response.content });
      messages.push({ role: 'user', content: toolResults });

      // If this was the last allowed round, send one final request
      // with no tools so Claude must write its summary
      if (round === MAX_TOOL_ROUNDS - 1) {
        const finalResponse = await client.messages.create({
          model: MODEL,
          max_tokens: 1500,
          system: [
            {
              type: 'text',
              text: RESEARCHER_SYSTEM_PROMPT,
              cache_control: { type: 'ephemeral' },
            },
          ],
          // No tools — force Claude to write the summary now
          messages,
        });

        addUsage(usage, finalResponse.usage);
        finalContent = finalResponse.content;
      }

      continue;
    }

    // Unexpected stop reason (e.g. max_tokens) — exit loop with what we have
    break;
  }

  // Deduplicate sources by URL
  const seen = new Set<string>();
  const uniqueSources = allSources.filter((s) => {
    if (seen.has(s.url)) return false;
    seen.add(s.url);
    return true;
  });

  return {
    taskId: task.id,
    sources: uniqueSources,
    summary: extractSummary(finalContent),
    confidence: deriveConfidence(uniqueSources),
    cost: calculateCost(usage),
  };
}
