export interface Task {
  id: string;
  focus: string;
  keywords: string[];
  priority: number;
}

export interface TaskManifest {
  tasks: Task[];
}

export interface Source {
  url: string;
  title: string;
  excerpt: string;
  publishedAt: string;
}

export interface ResearchFindings {
  taskId: string;
  sources: Source[];
  summary: string;
  confidence: number;
}

export type FlagType =
  | 'missing_data'
  | 'contradiction'
  | 'unsourced'
  | 'stale'
  | 'scope_drift';

export interface Flag {
  type: FlagType;
  section: string;
  severity: 'high' | 'medium' | 'low';
  message: string;
}

export interface CriticReport {
  verdict: 'PASS' | 'RETRY';
  confidence: number;
  flags: Flag[];
  retryTasks: string[];
  sectionConfidence: Record<string, number>;
}

export interface PipelineResult {
  query: string;
  report: string;
  sectionConfidence: Record<string, number>;
  sources: Source[];
  totalCost: number;
  durationMs: number;
}
