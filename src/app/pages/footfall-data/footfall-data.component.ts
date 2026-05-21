import { Component, inject, OnInit, signal } from '@angular/core';
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

/** One row in the Staff Accountability table */
export interface StaffAccountabilityRow {
  salesPerson: string;
  footfall: number;
  conversion: number;
  leads: number;
  convRate: number;
  missedCustomers: string[];
}

@Component({
  selector: 'app-footfall-data',
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
  ],
  templateUrl: './footfall-data.component.html',
  styleUrl: './footfall-data.component.css',
})
export class FootfallData implements OnInit {
  private svc = inject(FootfallService);
  private http = inject(HttpClient);
  private msg = inject(MessageService);
  private fb = inject(FormBuilder);

  // ─── Filter State ──────────────────────────────────────────────────────────
  filterOptions = [
    { label: 'Weekly', value: 'weekly' },
    { label: 'Monthly', value: 'monthly' },
  ];
  value: 'weekly' | 'monthly' = 'weekly';
  rangeDates: Date[] | undefined;

  // ─── Dialog & Form ─────────────────────────────────────────────────────────
  entryFromVisible = false;
  footfallForm: FormGroup = this.fb.group({
    date: new FormControl<Date | null>(null),
    form: this.fb.array([]),
  });
  private salesPersons: any[] = [];

  addEntryVisible() {
    this.entryFromVisible = true;
  }

  // ─── KPI Signals ──────────────────────────────────────────────────────────
  totalFootfall = signal<number>(0);
  totalConversion = signal<number>(0);
  conversionRate = signal<number>(0);
  footfallChange = signal<number>(0);
  conversionChange = signal<number>(0);
  rateChange = signal<number>(0);
  topPerformer = signal<{ name: string; sales: number } | null>(null);

  // ─── Feed & Table ─────────────────────────────────────────────────────────
  dailyFeed = signal<FeedEntry[]>([]);
  staffAccountability = signal<StaffAccountabilityRow[]>([]);

  // ─── Bar Chart ────────────────────────────────────────────────────────────
  barChartData = signal<any>(null);
  barChartOptions: any = {};

  // ─── Misc ─────────────────────────────────────────────────────────────────
  loading = signal<boolean>(false);

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

  // ─── Lifecycle ────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.setupBarChartOptions();
    this.loadSalesPersons();
    this.loadAllSections();
  }

  // ─── Range helpers ────────────────────────────────────────────────────────
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

  // ─── Data Loading ─────────────────────────────────────────────────────────
  private loadAllSections(): void {
    this.loading.set(true);

    forkJoin({
      kpis: this.svc.getKpis(this.rangeType, this.startDate, this.endDate),
      feed: this.svc.getFeed(),
      chart: this.svc.getYearlyChart(new Date().getFullYear()),
      customers: this.http
        .get<any>(`${environment.API_URL}/api/customers/get`)
        .pipe(catchError(() => of([]))),
      reports: this.svc.getFootfallEntries().pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ kpis, feed, chart, customers, reports }) => {
        this.applyKpis(kpis);
        this.dailyFeed.set(feed);
        this.buildBarChart(chart, feed);
        this.buildAccountabilityTable(reports, customers);
        this.loading.set(false);
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

  // ─── Staff Accountability ─────────────────────────────────────────────────
  private buildAccountabilityTable(reports: any, customers: any): void {
    // ── Normalize API responses ── both endpoints may return { data: [...] }
    //    instead of a plain array; guard against either shape so the loop
    //    never throws "not iterable".
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

    const { start, end } = this.activeWindow;
    const toDay = (d: string | Date) => new Date(d).toISOString().slice(0, 10);

    // Filter customers to the active window
    const windowCustomers = customerList.filter((c) => {
      const d = new Date(c.createdAt);
      return d >= start && d <= end;
    });

    // Build map: salesperson(lower) → { footfall, conversion, days }
    const personMap = new Map<
      string,
      { footfall: number; conversion: number; days: Set<string> }
    >();

    for (const report of reportList) {
      if (!report.daily_stats) continue;
      const spKey = (report.sales_person as string).toLowerCase().trim();

      for (const stat of report.daily_stats) {
        const day = toDay(stat.date);
        const statDate = new Date(stat.date);
        if (statDate < start || statDate > end) continue;
        if (!stat.footfall || stat.footfall === 0) continue;

        if (!personMap.has(spKey)) {
          personMap.set(spKey, { footfall: 0, conversion: 0, days: new Set() });
        }
        const entry = personMap.get(spKey)!;
        entry.footfall += stat.footfall || 0;
        entry.conversion += stat.conversion || 0;
        entry.days.add(day);
      }
    }

    // Build accountability rows
    const rows: StaffAccountabilityRow[] = [];

    for (const [spKey, data] of personMap.entries()) {
      const myCustomers = windowCustomers.filter(
        (c) => (c.salesperson || '').toLowerCase().trim() === spKey,
      );

      const missedCustomers = myCustomers
        .filter((c) => !data.days.has(toDay(c.createdAt)))
        .map((c) => c.name as string);

      rows.push({
        salesPerson: spKey,
        footfall: data.footfall,
        conversion: data.conversion,
        leads: myCustomers.length,
        convRate:
          data.footfall > 0
            ? +((data.conversion / data.footfall) * 100).toFixed(1)
            : 0,
        missedCustomers,
      });
    }

    rows.sort((a, b) => b.footfall - a.footfall);
    this.staffAccountability.set(rows);
  }

  // ─── Bar Chart ────────────────────────────────────────────────────────────
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
    } else {
      // weekly or custom — use the feed array (reverse = oldest → newest)
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
  }

  // ─── Event Handlers ───────────────────────────────────────────────────────
  onFilterChange(): void {
    this.rangeDates = undefined;
    this.loadAllSections();
  }
  onDateChange(): void {
    if (this.rangeDates?.[1]) this.loadAllSections();
  }
  onClearDate(): void {
    this.rangeDates = undefined;
    this.loadAllSections();
  }

  // ─── Form / Submit ────────────────────────────────────────────────────────
  get form(): FormArray {
    return this.footfallForm.get('form') as FormArray;
  }

  private loadSalesPersons(): void {
    this.svc.getAllSalesPersons().subscribe({
      next: (res: any[]) => {
        this.salesPersons = res.filter(
          (u) => u.status === 'active' && u.role === 'user',
        );
        this.buildEntryForm();
      },
      error: (err) => console.error(err),
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
            console.error(err);
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
        this.loadAllSections();
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

  // ─── Utilities ────────────────────────────────────────────────────────────
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
  getUniquePCTags(pcs: string[]): string[] {
    return [...new Set(pcs)].slice(0, 3);
  }
  changeClass(val: number): string {
    return val >= 0 ? 'text-green-500' : 'text-red-500';
  }

  // ─── Chart Options ────────────────────────────────────────────────────────
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
