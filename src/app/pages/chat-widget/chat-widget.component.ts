import { CommonModule } from '@angular/common';
import {
  AfterViewChecked,
  Component,
  ElementRef,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ChatMessage } from '../../models/chat.model';
import { ChatServiceService } from '../../services/chat-service.service';
import { SafeMarkdownPipe } from '../../pipes/safe-markdown.pipe';

@Component({
  selector: 'app-chat-widget',
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    InputTextModule,
    SafeMarkdownPipe,
  ],
  templateUrl: './chat-widget.component.html',
  styleUrl: './chat-widget.component.css',
})
export class ChatWidgetComponent implements AfterViewChecked {
  private readonly chatService = inject(ChatServiceService);

  @ViewChild('scrollContainer')
  private scrollContainer?: ElementRef<HTMLDivElement>;

  readonly isOpen = signal(false);
  readonly isLoading = signal(false);
  readonly messages = signal<ChatMessage[]>([
    {
      id: this.generateId(),
      role: 'assistant',
      content:
        "Hi! I'm your store insights assistant. Ask me about revenue, targets, conversions, or salesperson performance.",
      timestamp: new Date(),
    },
  ]);

  userInput = '';

  private pendingScroll = false;

  toggleChat(): void {
    this.isOpen.update((open) => !open);
    if (this.isOpen()) {
      this.pendingScroll = true;
    }
  }

  closeChat(): void {
    this.isOpen.set(false);
  }

  sendMessage(): void {
    const text = this.userInput.trim();
    if (!text || this.isLoading()) {
      return;
    }

    this.messages.update((msgs) => [
      ...msgs,
      {
        id: this.generateId(),
        role: 'user',
        content: text,
        timestamp: new Date(),
      },
    ]);

    this.userInput = '';
    this.isLoading.set(true);
    this.pendingScroll = true;

    this.chatService.sendMessage(text).subscribe({
      next: (response) => {
        this.messages.update((msgs) => [
          ...msgs,
          {
            id: this.generateId(),
            role: 'assistant',
            content: response.reply,
            timestamp: new Date(),
          },
        ]);
        this.isLoading.set(false);
        this.pendingScroll = true;
      },
      error: () => {
        this.messages.update((msgs) => [
          ...msgs,
          {
            id: this.generateId(),
            role: 'assistant',
            content:
              'Something went wrong reaching the assistant. Please try again in a moment.',
            timestamp: new Date(),
            isError: true,
          },
        ]);
        this.isLoading.set(false);
        this.pendingScroll = true;
      },
    });
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  ngAfterViewChecked(): void {
    if (this.pendingScroll && this.scrollContainer) {
      const el = this.scrollContainer.nativeElement;
      el.scrollTop = el.scrollHeight;
      this.pendingScroll = false;
    }
  }

  private generateId(): string {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }
}
