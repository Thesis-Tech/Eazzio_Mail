export interface MessageSummaryInput {
  from: string;
  subject?: string | null;
  body: string;
  date?: string;
}

export interface EazzioAI {
  summarizeThread(messages: MessageSummaryInput[]): Promise<{ summary: string }>;
  suggestReply(thread: MessageSummaryInput[]): Promise<{ suggestions: string[] }>;
  classifyPriority(message: MessageSummaryInput): Promise<{ priorityHint: 'low' | 'normal' | 'high' }>;
  isEnabled(scopeId: string): Promise<boolean>;
}
