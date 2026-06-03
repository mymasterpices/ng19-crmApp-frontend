import {
  ChangeDetectorRef,
  Component,
  inject,
  OnInit,
  signal,
  computed,
} from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import {
  FootfallService,
  FeedEntry,
  KpiResponse,
  YearlyChartData,
} from '../../services/footfall/footfall.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { SelectButtonModule } from 'primeng/selectbutton';
import { DatePickerModule } from 'primeng/datepicker';
import { FloatLabelModule } from 'primeng/floatlabel';
import { CardModule } from 'primeng/card';
import { AvatarModule } from 'primeng/avatar';
import {
  NgClass,
  TitleCasePipe,
  CommonModule,
  DecimalPipe,
} from '@angular/common';
import { ChartModule } from 'primeng/chart';
import { TagModule } from 'primeng/tag';
import { BadgeModule } from 'primeng/badge';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { MessageService } from 'primeng/api';
import { InputTextModule } from 'primeng/inputtext';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { RouterLink } from '@angular/router';

// ─── Interfaces ───────────────────────────────────────────────────────────────

/** Row in the Staff Footfall Summary table */
export interface StaffRow {
  salesPerson: string;
  footfall: number;
  conversion: number;
  missed: number;
}

/** Row in the Staff Accountability table */
export interface StaffAccountabilityRow {
  user_id: string;
  salesPerson: string;
  footfall: number;
  conversion: number;
  leads: number;
  convRate: number;
  missedCustomers: string[];
  missedCount: number;
  lastActiveDate: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-footfall-data',
  standalone: true,
  imports: [
    SelectButtonModule,
    FormsModule,
    DatePickerModule,
    ReactiveFormsModule,
    FloatLabelModule,
    CardModule,
    AvatarModule,
    NgClass,
    ChartModule,
    TagModule,
    BadgeModule,
    ButtonModule,
    TooltipModule,
    DialogModule,
    TableModule,
    TitleCasePipe,
    DecimalPipe,
    InputTextModule,
    CommonModule,
    RouterLink,
  ],
  templateUrl: './footfall-data.component.html',
  styleUrl: './footfall-data.component.css',
})
export class FootfallData implements OnInit {
  // ─── Injected Services ──────────────────────────────────────────────────────
  private svc = inject(FootfallService);
  private cdr = inject(ChangeDetectorRef);
  private http = inject(HttpClient);
  private msg = inject(MessageService);
  private fb = inject(FormBuilder);

  // ─── Global Filter State ────────────────────────────────────────────────────
  filterOptions = [
    { label: 'Weekly', value: 'weekly' },
    { label: 'Monthly', value: 'monthly' },
  ];
  value: 'weekly' | 'monthly' = 'weekly';
  rangeDates: Date[] | undefined;

  // ─── Dialog & Form State ────────────────────────────────────────────────────
  entryFromVisible = false;
  footfallForm: FormGroup = this.fb.group({
    date: new FormControl<Date | null>(null),
    form: this.fb.array([]),
  });
  private salesPersons: any[] = [];

  // ─── KPI Signals ────────────────────────────────────────────────────────────
  totalFootfall = signal<number>(0);
  totalConversion = signal<number>(0);
  conversionRate = signal<number>(0);
  footfallChange = signal<number>(0);
  conversionChange = signal<number>(0);
  rateChange = signal<number>(0);
  topPerformer = signal<{ name: string; sales: number } | null>(null);

  // ─── Feed & Table Signals ───────────────────────────────────────────────────
  dailyFeed = signal<FeedEntry[]>([]);
  staffAccountability = signal<StaffAccountabilityRow[]>([]);
  rows: StaffRow[] = [];

  // ─── Bar Chart ──────────────────────────────────────────────────────────────
  barChartData = signal<any>(null);
  barChartOptions: any = {};

  // ─── Loading State ──────────────────────────────────────────────────────────
  loading = signal<boolean>(false);
  tableLoading = computed(() => this.loading());

  // ─── Staff Accountability — Separate Date Filter ─────────────────────────────
  // Filtering the accountability table by a specific date does NOT trigger a
  // full API reload; we reuse the cached reports/customers instead.
  accountabilityDate: Date | null = null;
  private cachedReports: any = [];
  private cachedCustomers: any = [];

  // ─── KPI Tooltip Copy ───────────────────────────────────────────────────────
  readonly kpiTooltips = {
    totalFootfall:
      'Total visitors who entered the store in the selected period.',
    totalConversion:
      'Total visitors who completed a purchase in the selected period.',
    conversionRate:
      '(Total Conversion ÷ Total Footfall) × 100. Badge = absolute point shift vs prior period.',
    topPerformer:
      'Staff member with the highest confirmed sale count within the active filter period.',
  };

  // ─── Range Labels ───────────────────────────────────────────────────────────

  /** Label for the global date filter (used in KPI cards, chart, feed totals). */
  get rangeLabel(): string {
    if (this.rangeDates?.[0] && this.rangeDates?.[1]) {
      const fmt = (d: Date) =>
        d.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
      return `${fmt(this.rangeDates[0])} – ${fmt(this.rangeDates[1])}`;
    }
    return this.value === 'weekly' ? 'Last 7 days' : 'Last 30 days';
  }

  /**
   * Label shown in the Staff Accountability subtitle.
   * Reflects the accountability-specific date picker when set,
   * otherwise falls back to the global range label.
   */
  get accountabilityRangeLabel(): string {
    if (this.accountabilityDate) {
      return this.formatDate(this.accountabilityDate.toISOString());
    }
    return this.rangeLabel;
  }

  // ─── Computed: Footer Totals for Staff Footfall Summary ────────────────────
  get totalRowFootfall(): number {
    return this.rows.reduce((sum, r) => sum + r.footfall, 0);
  }
  get totalRowConversion(): number {
    return this.rows.reduce((sum, r) => sum + r.conversion, 0);
  }
  get totalRowMissed(): number {
    return this.rows.reduce((sum, r) => sum + r.missed, 0);
  }

  // ─── Form Array Accessor ────────────────────────────────────────────────────
  get form(): FormArray {
    return this.footfallForm.get('form') as FormArray;
  }

  // ─── Range Helpers ──────────────────────────────────────────────────────────
  private get rangeType(): 'weekly' | 'monthly' | 'custom' {
    return this.rangeDates?.[0] && this.rangeDates?.[1] ? 'custom' : this.value;
  }
  private get startDate(): string | undefined {
    return this.rangeDates?.[0]?.toISOString().slice(0, 10);
  }
  private get endDate(): string | undefined {
    return this.rangeDates?.[1]?.toISOString().slice(0, 10);
  }
  private get activeWindow(): { start: Date; end: Date } {
    if (this.rangeDates?.[0] && this.rangeDates?.[1]) {
      const s = new Date(this.rangeDates[0]);
      s.setHours(0, 0, 0, 0);
      const e = new Date(this.rangeDates[1]);
      e.setHours(23, 59, 59, 999);
      return { start: s, end: e };
    }
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date();
    start.setDate(start.getDate() - (this.value === 'monthly' ? 30 : 7));
    start.setHours(0, 0, 0, 0);
    return { start, end };
  }

  // ─── Lifecycle ──────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.setupBarChartOptions();
    this.loadSalesPersons();
    this.loadDashboard();
  }

  // ─── Unified Dashboard Load ─────────────────────────────────────────────────
  private loadDashboard(): void {
    this.loading.set(true);

    forkJoin({
      kpis: this.svc.getKpis(this.rangeType, this.startDate, this.endDate),
      feed: this.svc.getFeed(),
      chart: this.svc.getYearlyChart(new Date().getFullYear()),
      customers: this.http
        .get<any>(`${environment.API_URL}/api/customers/get`)
        .pipe(catchError(() => of([]))),
      reports: this.svc.getAllFootfallData().pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ kpis, feed, chart, customers, reports }) => {
        // Cache reports & customers so the accountability date filter
        // can rebuild the table without re-fetching.
        this.cachedReports = reports;
        this.cachedCustomers = customers;

        // ① KPI Cards
        this.applyKpis(kpis);

        // ② Recent Entry Feed (last 7 days from API)
        this.dailyFeed.set(feed);

        // ③ Bar Chart
        this.buildBarChart(chart, feed);

        // ④ Staff Accountability (uses accountabilityDate if set)
        this.buildAccountabilityTable(reports, customers);

        // ⑤ Staff Footfall Summary
        this.rows = this.buildSummaryRows(reports);

        this.loading.set(false);
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error(err);
        this.loading.set(false);
        this.msg.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load dashboard data.',
        });
      },
    });
  }

  // ─── Section Builders ───────────────────────────────────────────────────────

  /** ① Apply KPI response to all KPI signals */
  private applyKpis(k: KpiResponse): void {
    this.totalFootfall.set(k.totalFootfall);
    this.totalConversion.set(k.totalConversion);
    this.conversionRate.set(k.conversionRate);
    this.footfallChange.set(k.footfallChange);
    this.conversionChange.set(k.conversionChange);
    this.rateChange.set(k.rateChange);
    this.topPerformer.set(k.topPerformer);
  }

  /** ③ Build bar chart — weekly uses feed days, monthly uses full-year buckets */
  private buildBarChart(yearData: YearlyChartData, feed: FeedEntry[]): void {
    if (this.rangeType === 'monthly') {
      const monthLabels = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ];
      this.barChartData.set({
        labels: monthLabels,
        datasets: [
          {
            label: 'Footfall',
            backgroundColor: '#3b82f6',
            borderRadius: 4,
            data: yearData.cy.map((m) => m.footfall),
          },
          {
            label: 'Conversion',
            backgroundColor: '#10b981',
            borderRadius: 4,
            data: yearData.cy.map((m) => m.conversion),
          },
        ],
      });
      return;
    }

    // Weekly / custom — use the feed entries chronologically
    const sorted = [...feed].reverse();
    if (sorted.length === 0) {
      this.barChartData.set(null);
      return;
    }
    this.barChartData.set({
      labels: sorted.map((e) =>
        new Date(e.date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
      ),
      datasets: [
        {
          label: 'Footfall',
          backgroundColor: '#3b82f6',
          borderRadius: 4,
          data: sorted.map((e) => e.footfall),
        },
        {
          label: 'Conversion',
          backgroundColor: '#10b981',
          borderRadius: 4,
          data: sorted.map((e) => e.conversion),
        },
      ],
    });
  }

  /**
   * ④ Staff Accountability
   *
   * Filter window:
   *   • If accountabilityDate is set → single day
   *   • Otherwise → activeWindow (weekly / monthly / custom)
   *
   * Missed formula (FIXED):
   *   gap   = footfall − conversion
   *   missed = max(0, gap − leads)
   *
   *   Ex 1: footfall=20, conv=15, leads=5  → gap=5,  missed = max(0, 5−5)  = 0
   *   Ex 2: footfall=30, conv=20, leads=5  → gap=10, missed = max(0, 10−5) = 5
   *
   * Sort: most-recent lastActiveDate first, then footfall descending.
   */
  private buildAccountabilityTable(reports: any, customers: any): void {
    const reportList: any[] = Array.isArray(reports)
      ? reports
      : Array.isArray(reports?.data)
        ? reports.data
        : [];

    const customerList: any[] = Array.isArray(customers)
      ? customers
      : Array.isArray(customers?.data)
        ? customers.data
        : [];

    // ── Determine filter window ──────────────────────────────────────────────
    let filterStart: Date;
    let filterEnd: Date;

    if (this.accountabilityDate) {
      filterStart = new Date(this.accountabilityDate);
      filterStart.setHours(0, 0, 0, 0);
      filterEnd = new Date(this.accountabilityDate);
      filterEnd.setHours(23, 59, 59, 999);
    } else {
      ({ start: filterStart, end: filterEnd } = this.activeWindow);
    }

    const toDay = (d: string | Date) => new Date(d).toISOString().slice(0, 10);

    // Customers created within the filter window
    const windowCustomers = customerList.filter((c) => {
      const d = new Date(c.createdAt);
      return d >= filterStart && d <= filterEnd;
    });

    // Aggregate per salesperson: footfall, conversion, active days, lastActiveDate
    const personMap = new Map<
      string,
      {
        user_id: string;
        footfall: number;
        conversion: number;
        days: Set<string>;
        lastActiveDate: string;
      }
    >();

    for (const report of reportList) {
      if (!report.daily_stats) continue;
      const spKey = (report.sales_person as string).toLowerCase().trim();

      for (const stat of report.daily_stats) {
        const day = toDay(stat.date);
        const statDate = new Date(stat.date);
        if (statDate < filterStart || statDate > filterEnd) continue;
        if (!stat.footfall || stat.footfall === 0) continue;

        if (!personMap.has(spKey)) {
          personMap.set(spKey, {
            user_id: report.user_id ?? '',
            footfall: 0,
            conversion: 0,
            days: new Set(),
            lastActiveDate: day,
          });
        }
        const entry = personMap.get(spKey)!;
        entry.footfall += stat.footfall || 0;
        entry.conversion += stat.conversion || 0;
        entry.days.add(day);

        // Track the most recent day with footfall
        if (day > entry.lastActiveDate) {
          entry.lastActiveDate = day;
        }
      }
    }

    const rows: StaffAccountabilityRow[] = [];

    for (const [spKey, data] of personMap.entries()) {
      // All customer records attributed to this salesperson in the window
      const myCustomers = windowCustomers.filter(
        (c) => (c.salesperson || '').toLowerCase().trim() === spKey,
      );

      // Customers saved on days where this person had NO footfall entry
      const missedCustomers = myCustomers
        .filter((c) => !data.days.has(toDay(c.createdAt)))
        .map((c) => c.name as string);

      const leads = myCustomers.length;
      const gap = data.footfall - data.conversion;

      // FIXED missed calculation: max(0, gap − leads)
      const computedMissedCount = Math.max(0, gap - leads);

      rows.push({
        user_id: data.user_id,
        salesPerson: spKey,
        footfall: data.footfall,
        conversion: data.conversion,
        leads,
        convRate:
          data.footfall > 0
            ? +((data.conversion / data.footfall) * 100).toFixed(1)
            : 0,
        missedCustomers,
        missedCount: computedMissedCount,
        lastActiveDate: data.lastActiveDate,
      });
    }

    // Sort: most-recent lastActiveDate first, then higher footfall first
    rows.sort((a, b) => {
      const dateDiff = b.lastActiveDate.localeCompare(a.lastActiveDate);
      return dateDiff !== 0 ? dateDiff : b.footfall - a.footfall;
    });

    this.staffAccountability.set(rows);
    this.cdr.markForCheck();
  }

  /** ⑤ Staff Footfall Summary — filter-aware aggregation */
  private buildSummaryRows(records: any): StaffRow[] {
    const reportList: any[] = Array.isArray(records)
      ? records
      : Array.isArray(records?.data)
        ? records.data
        : [];

    const { start, end } = this.activeWindow;
    const map = new Map<string, { footfall: number; conversion: number }>();

    for (const record of reportList) {
      const name: string = (record.sales_person ?? '').trim();
      if (!name) continue;
      if (!map.has(name)) map.set(name, { footfall: 0, conversion: 0 });
      const entry = map.get(name)!;

      for (const stat of record.daily_stats ?? []) {
        const statDate = new Date(stat.date);
        if (statDate >= start && statDate <= end) {
          entry.footfall += stat.footfall ?? 0;
          entry.conversion += stat.conversion ?? 0;
        }
      }
    }

    return [...map.entries()]
      .map(([salesPerson, { footfall, conversion }]) => ({
        salesPerson,
        footfall,
        conversion,
        missed: footfall - conversion,
      }))
      .sort((a, b) => b.footfall - a.footfall);
  }

  // ─── Event Handlers ─────────────────────────────────────────────────────────

  /** Global filter toggle (Weekly / Monthly) — clears custom date and reloads */
  onFilterChange(): void {
    this.rangeDates = undefined;
    this.loadDashboard();
  }

  /** Global custom date range selected — reload once both ends are picked */
  onDateChange(): void {
    if (this.rangeDates?.[1]) this.loadDashboard();
  }

  /** Clear global custom date range — revert to current filter and reload */
  onClearDate(): void {
    this.rangeDates = undefined;
    this.loadDashboard();
  }

  /**
   * Accountability-specific date changed.
   * Rebuilds the accountability table from the cache — NO full API reload.
   */
  onAccountabilityDateChange(): void {
    this.buildAccountabilityTable(this.cachedReports, this.cachedCustomers);
  }

  /** Clear the accountability date filter — revert to the global window. */
  onClearAccountabilityDate(): void {
    this.accountabilityDate = null;
    this.buildAccountabilityTable(this.cachedReports, this.cachedCustomers);
  }

  // ─── Dialog: Add New Entry ──────────────────────────────────────────────────

  addEntryVisible(): void {
    this.entryFromVisible = true;
  }

  // ─── Form: Load Sales Persons & Build Entry Form ────────────────────────────

  private loadSalesPersons(): void {
    this.svc.getAllSalesPersons().subscribe({
      next: (res: any[]) => {
        this.salesPersons = res.filter(
          (u) => u.status === 'active' && u.role === 'user',
        );
        this.buildEntryForm();
      },
      error: (err) => console.error('Failed to load sales persons:', err),
    });
  }

  private buildEntryForm(): void {
    this.form.clear();
    this.salesPersons.forEach((p) =>
      this.form.push(
        this.fb.group({
          sales_person: new FormControl(p.username || ''),
          ff: new FormControl(''),
          con: new FormControl(''),
          pc: new FormControl(''),
        }),
      ),
    );
  }

  // ─── Form Submit ────────────────────────────────────────────────────────────

  onSubmit(): void {
    if (this.footfallForm.invalid) return;
    this.loading.set(true);

    const { date, form: rows } = this.footfallForm.value;
    const selectedDate: Date = date instanceof Date ? date : new Date();
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth() + 1;
    const timestamp = selectedDate.toISOString();

    const saves = this.salesPersons.map((person) => {
      const entry = rows.find((f: any) => f.sales_person === person.username);
      if (!entry) return of(null);

      return this.svc
        .saveFootfallData({
          year,
          month,
          user_status: person.status,
          user_id: person._id,
          sales_person: person.username,
          daily_stat: {
            date: timestamp,
            footfall: entry.ff ? Number(entry.ff) : null,
            conversion: entry.con ? Number(entry.con) : null,
            pc: entry.pc ? [String(entry.pc)] : [],
          },
        })
        .pipe(
          catchError((err) => {
            console.error(`Save failed for ${person.username}:`, err);
            return of({ error: true, user: person.username });
          }),
        );
    });

    forkJoin(saves).subscribe({
      next: (results) => {
        this.loading.set(false);
        const failed = results
          .filter((r: any) => r?.error)
          .map((r: any) => r.user);

        if (failed.length > 0) {
          this.msg.add({
            severity: 'warn',
            summary: 'Partial Success',
            detail: `Failed for: ${failed.join(', ')}`,
          });
        } else {
          this.msg.add({
            severity: 'success',
            summary: 'Success',
            detail: 'All entries saved successfully',
          });
        }

        this.footfallForm.reset();
        this.entryFromVisible = false;
        this.loadDashboard();
      },
      error: () => {
        this.loading.set(false);
        this.msg.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Critical error while saving data.',
        });
      },
    });
  }

  // ─── Utility Methods ────────────────────────────────────────────────────────

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  formatChange(val: number): string {
    return `${val >= 0 ? '+' : ''}${val.toFixed(1)}%`;
  }

  changeClass(val: number): string {
    return val >= 0 ? 'text-green-500' : 'text-red-500';
  }

  getUniquePCTags(pcs: string[]): string[] {
    return [...new Set(pcs)].slice(0, 3);
  }

  // ─── Chart Options Setup ────────────────────────────────────────────────────

  private setupBarChartOptions(): void {
    this.barChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          align: 'end',
          labels: { color: '#94a3b8', font: { size: 11 } },
        },
        tooltip: {
          backgroundColor: '#111419',
          titleColor: '#e2e8f0',
          bodyColor: '#94a3b8',
        },
      },
      scales: {
        x: {
          ticks: { color: '#475569', maxRotation: 45, minRotation: 0 },
          grid: { color: 'rgba(255,255,255,0.02)' },
        },
        y: {
          beginAtZero: true,
          ticks: { color: '#475569' },
          grid: { color: 'rgba(255,255,255,0.03)' },
        },
      },
    };
  }
}
