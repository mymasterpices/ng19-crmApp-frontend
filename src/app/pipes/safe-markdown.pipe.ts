import { Pipe, PipeTransform, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { marked } from 'marked';

/**
 * Renders the agent's Markdown reply (tables, bold text, headers, emoji, etc.)
 * as sanitized HTML.
 *
 * Requires the `marked` package:
 *   npm install marked
 */
@Pipe({
  name: 'safeMarkdown',
  standalone: true,
})
export class SafeMarkdownPipe implements PipeTransform {
  private readonly sanitizer = inject(DomSanitizer);

  transform(value: string | null | undefined): SafeHtml {
    if (!value) {
      return '';
    }

    marked.setOptions({ breaks: true, gfm: true });
    const html = marked.parse(value, { async: false }) as string;

    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}
