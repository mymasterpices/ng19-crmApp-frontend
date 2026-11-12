import {
  Component,
  computed,
  effect,
  inject,
  OnDestroy,
  signal,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';

// PrimeNG v19
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { CheckboxModule } from 'primeng/checkbox';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { ProgressBarModule } from 'primeng/progressbar';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { Tooltip } from 'primeng/tooltip';
import { ConfirmationService, MessageService } from 'primeng/api';

import { AuthService } from '../../services/auth.service';
import { DeskStateService } from '../../services/desk-state.service';
import { Enquiry, enquiryStatus, STAGES } from '../../models/desk.models';

/** Route of the catalogue desk (products-view-all). Change to match your router. */
const CATALOGUE_ROUTE = '/products/view-all';

type SortKey = 'recent' | 'oldest' | 'name' | 'stage';

const norm = (s: unknown) => (s ?? '').toString().trim().toLowerCase();

@Component({
  selector: 'app-enquiries',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    ButtonModule,
    InputTextModule,
    SelectModule,
    TagModule,
    CheckboxModule,
    PaginatorModule,
    ProgressBarModule,
    ConfirmDialogModule,
    Tooltip,
  ],
  providers: [ConfirmationService],
  templateUrl: './enquiries.component.html',
})
export class EnquiriesComponent implements OnDestroy {
  private readonly desk = inject(DeskStateService);
  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmationService);
  private readonly messages = inject(MessageService);
  readonly userRole = inject(AuthService).getUserRole();

  readonly STAGES = STAGES;
  readonly syncState = this.desk.syncState;
  readonly currentId = computed(() => this.desk.current().id);

  readonly sortOpts = [
    { label: 'Latest first', value: 'recent' },
    { label: 'Oldest first', value: 'oldest' },
    { label: 'Name A–Z', value: 'name' },
    { label: 'Furthest along', value: 'stage' },
  ];
  readonly stageOpts = STAGES.map((s, i) => ({ label: s.title, value: i }));

  // ---------- Clock (keeps "x min ago" and the reply timer fresh) ----------
  readonly now = signal(Date.now());
  private readonly tick = setInterval(() => this.now.set(Date.now()), 60_000);
  ngOnDestroy() {
    clearInterval(this.tick);
  }

  // ---------- Filters ----------
  readonly search = signal('');
  readonly statusFilter = signal<string | null>(null); // status label
  readonly stageFilter = signal<number | null>(null);
  readonly sort = signal<SortKey>('recent');
  /** The last stage is treated as "closed". Tick to include those. */
  readonly showClosed = signal(false);

  private isClosed = (e: Enquiry) => e.stage >= STAGES.length - 1;

  /** Active (or all, if showClosed) enquiries before search / status filters. */
  private readonly base = computed(() =>
    this.desk.enquiries().filter((e) => this.showClosed() || !this.isClosed(e)),
  );

  /** Status label → count, used for the filter chips. */
  readonly statusCounts = computed(() => {
    const now = this.now();
    const map = new Map<string, { label: string; severity: any; n: number }>();
    for (const e of this.base()) {
      const s = enquiryStatus(e, now);
      const hit = map.get(s.label);
      if (hit) hit.n++;
      else map.set(s.label, { label: s.label, severity: s.severity, n: 1 });
    }
    return [...map.values()];
  });

  readonly list = computed<Enquiry[]>(() => {
    const now = this.now();
    const q = norm(this.search());
    const words = q.split(/\s+/).filter(Boolean);
    const st = this.statusFilter();
    const sg = this.stageFilter();

    const rows = this.base().filter((e) => {
      if (st && enquiryStatus(e, now).label !== st) return false;
      if (sg !== null && e.stage !== sg) return false;
      if (!words.length) return true;

      const text = norm(
        [
          e.name || 'new customer',
          e.need,
          e.channel,
          e.market,
          e.occasion,
          ...(e.picked ?? []),
        ].join(' '),
      );
      const digits = (e.phone || '').replace(/\D/g, '');
      return words.every((w) => {
        if (text.includes(w)) return true;
        const d = w.replace(/\D/g, '');
        return d.length > 0 && digits.includes(d);
      });
    });

    const last = (e: Enquiry) => e.sentAt ?? e.createdAt;
    switch (this.sort()) {
      case 'oldest':
        return rows.sort((a, b) => last(a) - last(b));
      case 'name':
        return rows.sort((a, b) =>
          (a.name || '~').localeCompare(b.name || '~'),
        );
      case 'stage':
        return rows.sort((a, b) => b.stage - a.stage);
      default:
        return rows.sort((a, b) => last(b) - last(a));
    }
  });

  // ---------- Pagination ----------
  readonly rowsOptions = [10, 20, 50];
  /** Index of the first row on the current page (PrimeNG paginator `first`). */
  readonly first = signal(0);
  readonly rows = signal(10);

  /** Current page slice of the filtered list. */
  readonly paged = computed<Enquiry[]>(() =>
    this.list().slice(this.first(), this.first() + this.rows()),
  );

  /** "11–20" style range for the summary line. */
  readonly rangeText = computed(() => {
    const n = this.list().length;
    if (!n) return '0';
    return `${this.first() + 1}–${Math.min(this.first() + this.rows(), n)}`;
  });

  onPage(e: PaginatorState) {
    this.first.set(e.first ?? 0);
    this.rows.set(e.rows ?? this.rows());
  }

  constructor() {
    // Any filter / sort change → back to page 1 (not on the minute clock tick).
    effect(() => {
      this.search();
      this.statusFilter();
      this.stageFilter();
      this.sort();
      this.showClosed();
      untracked(() => this.first.set(0));
    });
    // List shrank (e.g. last row on a page deleted) → step back to a valid page.
    effect(() => {
      const n = this.list().length;
      const r = this.rows();
      untracked(() => {
        if (this.first() > 0 && this.first() >= n) {
          this.first.set(Math.max(0, Math.floor((n - 1) / r) * r));
        }
      });
    });
  }

  readonly activeFilters = computed(
    () =>
      +!!this.search().trim() +
      +!!this.statusFilter() +
      +(this.stageFilter() !== null),
  );

  readonly totals = computed(() => {
    const all = this.base();
    return {
      customers: all.length,
      pieces: all.reduce((t, e) => t + (e.picked?.length ?? 0), 0),
      shared: all.filter((e) => !!e.sentAt).length,
    };
  });

  clearFilters() {
    this.search.set('');
    this.statusFilter.set(null);
    this.stageFilter.set(null);
  }

  // ---------- Row helpers ----------
  status(e: Enquiry) {
    return enquiryStatus(e, this.now());
  }

  stageTitle(e: Enquiry) {
    return STAGES[Math.min(e.stage, STAGES.length - 1)]?.title ?? '';
  }

  progress(e: Enquiry) {
    return Math.round((e.stage / Math.max(1, STAGES.length - 1)) * 100);
  }

  ago(ts?: number | null): string {
    if (!ts) return '—';
    const m = Math.max(1, Math.round((this.now() - ts) / 6e4));
    if (m < 60) return `${m} min ago`;
    const h = Math.round(m / 60);
    return h < 48 ? `${h} hr ago` : `${Math.round(h / 24)} days ago`;
  }

  trackById = (_: number, e: Enquiry) => e.id;

  // ---------- Actions ----------
  /** Makes this the current enquiry and jumps to the catalogue desk. */
  open(e: Enquiry) {
    this.desk.select(e.id);
    this.router.navigate([CATALOGUE_ROUTE]);
  }

  async copyTags(e: Enquiry, ev: Event) {
    ev.stopPropagation();
    try {
      await navigator.clipboard.writeText((e.picked ?? []).join(', '));
      this.messages.add({
        severity: 'success',
        summary: 'Copied',
        detail: `${e.picked.length} tag no.(s) copied`,
      });
    } catch {
      this.messages.add({
        severity: 'info',
        summary: 'Copy',
        detail: (e.picked ?? []).join(', '),
      });
    }
  }

  whatsAppHref(e: Enquiry): string | null {
    const d = (e.phone || '').replace(/\D/g, '');
    if (!d) return null;
    return `https://wa.me/${e.market === 'India' && d.length === 10 ? '91' + d : d}`;
  }

  remove(e: Enquiry, ev: Event) {
    ev.stopPropagation();
    this.confirm.confirm({
      header: 'Delete enquiry',
      message: `Delete the enquiry for ${e.name || 'this customer'}?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptButtonProps: { severity: 'danger' },
      rejectButtonProps: { severity: 'secondary', outlined: true },
      accept: () => this.desk.remove(e.id),
    });
  }

  newEnquiry() {
    this.desk.add();
    this.router.navigate([CATALOGUE_ROUTE]);
  }
}
