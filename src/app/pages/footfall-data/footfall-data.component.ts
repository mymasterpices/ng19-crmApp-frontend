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
import { AuthService } from '../../services/auth.service';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface StaffRow {
  salesPerson: string;
  footfall: number;
  conversion: number;
  missed: number;
}

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

export interface RecentEntryRow {
  date: string;
  sales_person: string;
  footfall: number;
  conversion: number;
  pc: string[];
  user_id: string;
}

interface PersonAgg {
  user_id: string;
  footfall: number;
  conversion: number;
  days: Set<string>;
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
  private svc = inject(FootfallService);
  private cdr = inject(ChangeDetectorRef);
  private http = inject(HttpClient);
  private msg = inject(MessageService);
  private fb = inject(FormBuilder);
  private _authService = inject(AuthService);

  userRole = this._authService.getUserRole();

  filterOptions = [
    { label: 'Weekly', value: 'weekly' },
    { label: 'Monthly', value: 'monthly' },
  ];
  value: 'weekly' | 'monthly' = 'weekly';
  rangeDates: Date[] | undefined;

  entryFromVisible = false;
  footfallForm: FormGroup = this.fb.group({
    date: new FormControl<Date | null>(null),
    form: this.fb.array([]),
  });
  private salesPersons: any[] = [];

  totalFootfall = signal<number>(0);
  totalConversion = signal<number>(0);
  conversionRate = signal<number>(0);
  footfallChange = signal<number>(0);
  conversionChange = signal<number>(0);
  rateChange = signal<number>(0);
  topPerformer = signal<{ name: string; sales: number } | null>(null);

  dailyFeed = signal<FeedEntry[]>([]);
  staffAccountability = signal<StaffAccountabilityRow[]>([]);
  recentEntries = signal<RecentEntryRow[]>([]);
  rows: StaffRow[] = [];

  barChartData = signal<any>(null);
  barChartOptions: any = {};

  loading = signal<boolean>(false);
  tableLoading = computed(() => this.loading());

  accountabilityDate: Date | null = null;
  private cachedReports: any = [];
  private cachedCustomers: any = [];

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

  get accountabilityRangeLabel(): string {
    if (this.accountabilityDate) {
      return this.formatDate(this.accountabilityDate.toISOString());
    }
    return this.rangeLabel;
  }

  get totalRowFootfall(): number {
    return this.rows.reduce((sum, r) => sum + r.footfall, 0);
  }
  get totalRowConversion(): number {
    return this.rows.reduce((sum, r) => sum + r.conversion, 0);
  }
  get totalRowMissed(): number {
    return this.rows.reduce((sum, r) => sum + r.missed, 0);
  }

  get form(): FormArray {
    return this.footfallForm.get('form') as FormArray;
  }

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

  ngOnInit(): void {
    this.setupBarChartOptions();
    this.loadSalesPersons();
    this.loadDashboard();
  }

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
        this.cachedReports = reports;
        this.cachedCustomers = customers;

        this.applyKpis(kpis);
        this.dailyFeed.set(feed);
        this.buildBarChart(chart, feed);
        this.buildAccountabilityTable(reports, customers);
        this.rows = this.buildSummaryRows(reports);
        this.buildRecentEntries(reports);

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

  private applyKpis(k: KpiResponse): void {
    this.totalFootfall.set(k.totalFootfall);
    this.totalConversion.set(k.totalConversion);
    this.conversionRate.set(k.conversionRate);
    this.footfallChange.set(k.footfallChange);
    this.conversionChange.set(k.conversionChange);
    this.rateChange.set(k.rateChange);
    this.topPerformer.set(k.topPerformer);
  }

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

    const windowCustomers = customerList.filter((c) => {
      const d = new Date(c.createdAt);
      return d >= filterStart && d <= filterEnd;
    });

    const personMap = new Map<string, PersonAgg>();

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
            days: new Set<string>(),
            lastActiveDate: day,
          });
        }
        const entry = personMap.get(spKey)!;
        entry.footfall += stat.footfall || 0;
        entry.conversion += stat.conversion || 0;
        entry.days.add(day);

        if (day > entry.lastActiveDate) {
          entry.lastActiveDate = day;
        }
      }
    }

    const rows: StaffAccountabilityRow[] = [];

    for (const [spKey, data] of personMap.entries()) {
      const myCustomers = windowCustomers.filter(
        (c) => (c.salesperson || '').toLowerCase().trim() === spKey,
      );

      const missedCustomers = myCustomers
        .filter((c) => !data.days.has(toDay(c.createdAt)))
        .map((c) => c.name as string);

      const leads = myCustomers.length;
      const gap = data.footfall - data.conversion;
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

    rows.sort((a, b) => {
      const dateDiff = b.lastActiveDate.localeCompare(a.lastActiveDate);
      return dateDiff !== 0 ? dateDiff : b.footfall - a.footfall;
    });

    this.staffAccountability.set(rows);
    this.cdr.markForCheck();
  }

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

  private buildRecentEntries(reports: any): void {
    const reportList: any[] = Array.isArray(reports)
      ? reports
      : Array.isArray(reports?.data)
        ? reports.data
        : [];

    const entries: RecentEntryRow[] = [];

    for (const report of reportList) {
      const name: string = report.sales_person ?? '';

      for (const stat of report.daily_stats ?? []) {
        if (!stat.footfall && !stat.conversion) continue;

        entries.push({
          date: stat.date,
          sales_person: name,
          footfall: stat.footfall ?? 0,
          conversion: stat.conversion ?? 0,
          pc: stat.pc ?? [],
          user_id: report.user_id ?? '',
        });
      }
    }

    entries.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    this.recentEntries.set(entries.slice(0, 10));
  }

  onFilterChange(): void {
    this.rangeDates = undefined;
    this.loadDashboard();
  }

  onDateChange(): void {
    if (this.rangeDates?.[1]) this.loadDashboard();
  }

  onClearDate(): void {
    this.rangeDates = undefined;
    this.loadDashboard();
  }

  onAccountabilityDateChange(): void {
    this.buildAccountabilityTable(this.cachedReports, this.cachedCustomers);
  }

  onClearAccountabilityDate(): void {
    this.accountabilityDate = null;
    this.buildAccountabilityTable(this.cachedReports, this.cachedCustomers);
  }

  addEntryVisible(): void {
    this.entryFromVisible = true;
  }

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
        this.loadSalesPersons();
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

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  formatShortDate(dateStr: string): string {
    const d = new Date(dateStr);
    const day = d.getDate().toString().padStart(2, '0');
    const month = d.toLocaleDateString('en-US', { month: 'short' });
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
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
