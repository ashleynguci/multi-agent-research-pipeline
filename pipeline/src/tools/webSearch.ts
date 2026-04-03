import Anthropic from '@anthropic-ai/sdk';

export interface WebSearchResult {
  url: string;
  title: string;
  snippet: string;
  publishedAt: string;
}

export interface WebSearchInput {
  query: string;
  max_results?: number;
}

export const WEB_SEARCH_TOOL: Anthropic.Tool = {
  name: 'web_search',
  description:
    'Search the web for information on a topic. Returns relevant URLs, titles, and snippets. ' +
    'Use specific, targeted queries for best results.',
  input_schema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The search query to execute',
      },
      max_results: {
        type: 'number',
        description: 'Maximum number of results to return (default: 3, max: 10)',
      },
    },
    required: ['query'],
  },
};

// ---------------------------------------------------------------------------
// Mock handler — returns realistic fake results based on the query.
// Replace this function body with a real search API call (e.g. Brave, Serper,
// Tavily) without changing its signature.
// ---------------------------------------------------------------------------
export function executeWebSearch(input: WebSearchInput): WebSearchResult[] {
  const limit = Math.min(input.max_results ?? 3, 10);
  const slug = input.query.replace(/\s+/g, '-').toLowerCase();
  const wikiSlug = input.query.replace(/\s+/g, '_');

  const pool: WebSearchResult[] = [
    {
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(wikiSlug)}`,
      title: `${input.query} — Wikipedia`,
      snippet:
        `${input.query} is a widely studied subject with significant implications across multiple ` +
        `domains. The field has evolved considerably in recent years, driven by advances in ` +
        `methodology, increased institutional interest, and growing empirical evidence. ` +
        `Key contributors include researchers from leading universities and independent think-tanks.`,
      publishedAt: '2025-11-01',
    },
    {
      url: `https://www.reuters.com/technology/${slug}-overview-2025-10-15/`,
      title: `${input.query}: What You Need to Know`,
      snippet:
        `A comprehensive analysis published in October 2025 identified the primary drivers behind ` +
        `${input.query}. The report, drawing on data from over 40 organisations across 12 countries, ` +
        `found consistent structural shifts. Industry leaders have responded by reallocating budgets ` +
        `and forming dedicated working groups. Regulatory bodies are monitoring developments closely.`,
      publishedAt: '2025-10-15',
    },
    {
      url: `https://arxiv.org/abs/2501.${String(input.query.length * 7919).padStart(5, '0')}`,
      title: `Empirical Analysis of ${input.query}: Evidence and Implications`,
      snippet:
        `This paper presents findings from a systematic literature review and primary data collection ` +
        `on ${input.query}. Results show a statistically significant correlation (p < 0.01) between ` +
        `key variables, with effect sizes ranging from moderate to large depending on contextual ` +
        `factors. Recommendations for practitioners and future research directions are discussed.`,
      publishedAt: '2025-09-20',
    },
    {
      url: `https://www.nature.com/articles/${slug}-2025`,
      title: `The Science Behind ${input.query}`,
      snippet:
        `Nature's special report examines the latest peer-reviewed literature on ${input.query}. ` +
        `Researchers highlight three emerging consensus points: the role of systemic factors, the ` +
        `importance of longitudinal data, and the need for interdisciplinary collaboration. ` +
        `The editorial board notes a 40% increase in submissions on this topic since 2023.`,
      publishedAt: '2025-08-05',
    },
    {
      url: `https://www.ft.com/content/${slug}-market-impact`,
      title: `How ${input.query} Is Reshaping Markets`,
      snippet:
        `Financial Times analysis reveals that ${input.query} is influencing investment flows and ` +
        `corporate strategy across sectors. Survey data from 200 senior executives indicates that ` +
        `67% have adjusted long-term plans in response. Analysts forecast continued disruption over ` +
        `the next 18–24 months, with particular pressure on incumbents.`,
      publishedAt: '2025-07-22',
    },
  ];

  return pool.slice(0, limit);
}
