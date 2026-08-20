import { EazzioAI, MessageSummaryInput } from './interface.js';

export interface GeminiAiConfig {
  apiKey?: string;
  model?: string;
  endpoint?: string;
}

export class GeminiAiAdapter implements EazzioAI {
  private readonly apiKey?: string;
  private readonly model: string;
  private readonly endpoint: string;

  constructor(config?: GeminiAiConfig) {
    this.apiKey = config?.apiKey || process.env.GEMINI_API_KEY;
    this.model = config?.model || 'gemini-1.5-flash';
    this.endpoint = config?.endpoint || 'https://generativelanguage.googleapis.com/v1beta';
  }

  public async isEnabled(_scopeId: string): Promise<boolean> {
    return true;
  }

  public async summarizeThread(messages: MessageSummaryInput[]): Promise<{ summary: string }> {
    if (messages.length === 0) {
      return { summary: 'No messages in thread.' };
    }

    const threadText = messages
      .map((m) => `[From: ${m.from}, Subject: ${m.subject || '(No Subject)'}]\n${m.body}`)
      .join('\n\n---\n\n');

    if (!this.apiKey) {
      // Deterministic rule-based fallback summary when API key is not supplied
      const latest = messages[messages.length - 1]!;
      const mainSnippet = latest.body.slice(0, 120).replace(/\s+/g, ' ').trim();
      return {
        summary: `Thread of ${messages.length} message(s). Latest from ${latest.from}: "${mainSnippet}..."`,
      };
    }

    const prompt = `You are an AI email assistant. Summarize the following email thread concisely in 1-3 bullet points or sentences:\n\n${threadText}`;
    const text = await this.callGemini(prompt);
    return { summary: text.trim() };
  }

  public async suggestReply(thread: MessageSummaryInput[]): Promise<{ suggestions: string[] }> {
    if (thread.length === 0) {
      return { suggestions: ['Thank you.'] };
    }

    const latest = thread[thread.length - 1]!;
    if (!this.apiKey) {
      // Deterministic contextual suggestions
      return {
        suggestions: [
          'Thank you for the update. I will review shortly.',
          'Received, thanks!',
          'Could you provide more details regarding this?',
        ],
      };
    }

    const prompt = `Suggest 3 short, professional quick reply options (1 sentence each) to this email from ${latest.from}:\n"${latest.body}". Return only the 3 suggestions separated by newlines.`;
    const text = await this.callGemini(prompt);
    const suggestions = text
      .split(/\r?\n/)
      .map((s) => s.replace(/^\d+[\.\)]\s*/, '').trim())
      .filter((s) => s.length > 0)
      .slice(0, 3);

    return {
      suggestions: suggestions.length > 0 ? suggestions : ['Thank you for the update.'],
    };
  }

  public async classifyPriority(
    message: MessageSummaryInput
  ): Promise<{ priorityHint: 'low' | 'normal' | 'high' }> {
    const text = `${message.subject || ''} ${message.body}`.toLowerCase();
    if (text.includes('urgent') || text.includes('asap') || text.includes('immediate') || text.includes('critical')) {
      return { priorityHint: 'high' };
    }
    if (text.includes('unsubscribe') || text.includes('newsletter') || text.includes('digest')) {
      return { priorityHint: 'low' };
    }
    return { priorityHint: 'normal' };
  }

  private async callGemini(prompt: string): Promise<string> {
    const url = `${this.endpoint}/models/${this.model}:generateContent?key=${this.apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: HTTP ${response.status}`);
    }

    const data = await response.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };

    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }
}
