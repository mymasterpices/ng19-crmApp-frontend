import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ChatRequest, ChatResponse } from '../models/chat.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ChatServiceService {
  constructor() {}

  private readonly http = inject(HttpClient);

  // TODO: move to environment.ts (environment.chatApiUrl) before shipping
  // apiURL = environment.API_URL;
  private readonly apiUrl = environment.API_URL + '/api/ai-chat';

  /**
   * Sends a user message to the AI agent and returns its reply.
   */
  sendMessage(message: string): Observable<ChatResponse> {
    const body: ChatRequest = { message };
    return this.http.post<ChatResponse>(this.apiUrl, body);
  }
}
