export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: Date;
  isError?: boolean;
}

/** Body sent to POST http://localhost:4000/chat */
export interface ChatRequest {
  message: string;
}

/**
 * Response shape returned by the /chat endpoint.
 * Only `reply` is guaranteed to be shown to the user;
 * `toolCalls` / `usage` are internal diagnostics from the agent
 * and are not rendered in the widget.
 */
export interface ChatResponse {
  reply: string;
  toolCalls?: unknown[];
  usage?: Record<string, unknown>;
}
