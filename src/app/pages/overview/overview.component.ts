import { OrderServices } from './../../services/orders/order-services';
import { Component, inject, OnInit } from '@angular/core';
import { Observable, of } from 'rxjs';
import { DatePipe, DecimalPipe, formatDate } from '@angular/common';
import { HttpParams } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ChartModule } from 'primeng/chart';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { DatePickerModule } from 'primeng/datepicker';
import { ProgressBarModule } from 'primeng/progressbar';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { TargetService } from '../../services/target/target.service';

import { KarigarDashboardComponent } from '../karigar/karigar-dashboard/karigar-dashboard.component';

/* ---------- types ---------- */
interface FootCard {
  label: string;
  value: string | number;
  icon: string;
  delta: number | null; // % change vs previous period (null = not applicable)
  deltaGood: boolean; // green when true, red when false
  sub?: string; // small line under the value (when there is no delta)
}

interface StatTile {
  label: string;
  value: number;
  icon: string;
  iconClass: string; // Tailwind classes for the icon bubble
  bgClass?: string; // Tailwind classes for the tile background
  link?: string;
}

interface OrderRow {
  orderNumber: string;
  party: string;
  itemCategory: string;
  status: string; // Received | Issued | Cancelled | Hold | Delivered | Pending ...
  timestamp: string;
}

interface TargetVm {
  target: number;
  achieved: number;
  percent: number;
  status: string;
}

type Range = 'weekly' | 'monthly' | 'custom';

/**
 * TODO: set these to the REAL method names in your services.
 * If a name is wrong, the browser console prints exactly which one
 * (instead of crashing the whole dashboard).
 */
const ORDERS_METHOD = 'getOrders'; // OrderService.<method>(params) -> OrderRow[]

@Component({
  selector: 'app-overview',
  imports: [
    DatePipe,
    DecimalPipe,
    FormsModule,
    RouterLink,
    ChartModule,
    CardModule,
    ButtonModule,
    TableModule,
    TagModule,
    DatePickerModule,
    ProgressBarModule,
    ToastModule,
    KarigarDashboardComponent,
  ],
  providers: [MessageService],
  templateUrl: './overview.component.html',
})
export class OverviewComponent implements OnInit {
  private _authService = inject(AuthService);
  private _apiServices = inject(ApiService);
  private _targetService = inject(TargetService);

  private _orderService = inject(OrderServices);
  private _messageService = inject(MessageService);

  userName = this._authService.getUserName();
  userRole = this._authService.getUserRole();
  today = new Date();

  greeting =
    this.today.getHours() < 12
      ? 'Good morning'
      : this.today.getHours() < 17
        ? 'Good afternoon'
        : 'Good evening';

  /* ---------- shared chart options ---------- */
  barOptions: any;
  seriousnessChartOptions: any;

  /* ---------- footfall ---------- */
  range: Range = 'weekly';
  customDates: Date[] | null = null;
  footCards: FootCard[] = [];
  footChartData: any;

  /* ---------- target ---------- */
  selectedDate: Date = new Date();
  isSyncing = false;
  targetVm: TargetVm | null = null;

  /* ---------- customers & follow-ups ---------- */
  customers: any[] = [];
  missedFollow: any[] = [];
  todaysFollow: any[] = [];
  failedCount = 0;
  custRange: Range = 'weekly';
  custDates: Date[] | null = null;
  customerStats: StatTile[] = [];
  custChartData: any;
  seriousnessChartData: any;
  seriousnessLegend: { label: string; color: string; count: number }[] = [];

  /* ---------- orders ---------- */
  orders: OrderRow[] = [];
  orderStats: StatTile[] = [];
  recentOrders: OrderRow[] = [];

  get isKarigar(): boolean {
    return this.userRole === 'karigar';
  }

  get rangeLabel(): string {
    if (this.range === 'weekly') return '7 days';
    if (this.range === 'monthly') return '30 days';
    return 'period';
  }

  get periodLabel(): string {
    return this.selectedDate.toLocaleString('default', {
      month: 'long',
      year: 'numeric',
    });
  }

  ngOnInit(): void {
    this.buildChartOptions();

    // visible to every role (as before)
    this.loadFootfallKpis();
    this.loadFeed();
    this.fetchPerformance();

    if (this.isKarigar) return;

    this.loadCustomers();
    this.loadMissedFollowups();
    this.loadTodaysFollowups();
    this.loadOrders();
  }

  /** Calls svc[method]; a wrong/missing method logs a clear error instead of throwing. */
  private safeCall(svc: any, method: string, ...args: any[]): Observable<any> {
    if (typeof svc?.[method] !== 'function') {
      console.error(
        `[Overview] ${svc?.constructor?.name}.${method}() does not exist`,
      );
      return of([]);
    }
    return svc[method](...args);
  }

  /** admin/superadmin see everything, others only their own records */
  private scopedParams(): HttpParams {
    let params = new HttpParams();
    if (this.userRole !== 'admin' && this.userRole !== 'superadmin') {
      params = params.set('salesperson', this.userName);
    }
    return params;
  }

  private inRange(value: any, from: Date, to: Date): boolean {
    if (!value) return false;
    const t = new Date(value).getTime();
    return !isNaN(t) && t >= from.getTime() && t <= to.getTime();
  }

  /* =====================================================================
   * FOOTFALL  (FootfallService: getKpis + getFeed)
   *  - KPI cards  -> GET /kpis?rangeType=weekly|monthly|custom[&startDate&endDate]
   *  - Table      -> GET /feed[?salesPerson=..]   (latest entries, not range-based)
   *  - Chart      -> built from the same feed, filtered to the selected range
   * ===================================================================== */
  setRange(r: Range) {
    this.range = r;
    this.customDates = null;
    this.loadFootfallKpis();
  }

  onCustomRangeChange(dates: Date[] | null) {
    this.customDates = dates;
    // the range picker also emits after the first click; wait for both dates
    if (dates?.[0] && dates?.[1]) {
      this.range = 'custom';
      this.loadFootfallKpis();
    }
  }

  /** from 00:00:00 of the first day to 23:59:59 of the last */
  private periodFor(
    range: Range,
    dates: Date[] | null,
  ): { from: Date; to: Date } {
    let from: Date;
    let to: Date;
    if (range === 'custom' && dates?.[0] && dates?.[1]) {
      from = new Date(dates[0]);
      to = new Date(dates[1]);
    } else {
      to = new Date();
      from = new Date();
      from.setDate(from.getDate() - (range === 'monthly' ? 29 : 6));
    }
    from.setHours(0, 0, 0, 0);
    to.setHours(23, 59, 59, 999);
    return { from, to };
  }

  private period() {
    return this.periodFor(this.range, this.customDates);
  }

  loadFootfallKpis() {
    const { from, to } = this.period();
    const fmt = (d: Date) => formatDate(d, 'yyyy-MM-dd', 'en-US');
    const custom = this.range === 'custom';
  }

  loadFeed() {
    const admin = this.userRole === 'admin' || this.userRole === 'superadmin';
  }

  /* =====================================================================
   * TARGET (Store-Wide Achievement) — uses your TargetService
   * ASSUMPTION about the response: it carries a target value and an achieved
   * value under one of the names tried in toTargetVm(). Adjust there.
   * ===================================================================== */
  onTargetMonthChange(date: Date | null) {
    if (!date) return;
    this.selectedDate = date;
    this.fetchPerformance();
  }

  fetchPerformance(): void {
    const month = this.selectedDate.getMonth() + 1;
    const year = this.selectedDate.getFullYear();
    this._targetService.getTargetPerformance(month, year).subscribe({
      next: (data: any) => (this.targetVm = this.toTargetVm(data)),
      error: () => (this.targetVm = null),
    });
  }

  private toTargetVm(d: any): TargetVm | null {
    if (!d || (Array.isArray(d) && !d.length)) return null;
    const src = Array.isArray(d) ? d[0] : d;
    const target = +(src.targetAmount ?? src.target ?? src.totalTarget ?? 0);
    if (!target) return null;
    const achieved = +(
      src.achievedAmount ??
      src.achieved ??
      src.totalAchieved ??
      0
    );
    const percent = this.calculatePercent(achieved, target);
    return {
      target,
      achieved,
      percent,
      status: src.status ?? (percent >= 100 ? 'Achieved' : 'In Progress'),
    };
  }

  syncData(): void {
    this.isSyncing = true;
    const month = this.selectedDate.getMonth() + 1;
    const year = this.selectedDate.getFullYear();

    this._targetService.syncTargetPerformance(month, year).subscribe({
      next: () => {
        this.fetchPerformance();
        this._messageService.add({
          severity: 'success',
          summary: 'Synced',
          detail: 'Store-wide achievements updated.',
        });
        this.isSyncing = false;
      },
      error: () => {
        this._messageService.add({
          severity: 'error',
          summary: 'Sync Failed',
          detail: 'Could not update data.',
        });
        this.isSyncing = false;
      },
    });
  }

  calculatePercent(achieved: number, target: number): number {
    if (!target) return 0;
    return Math.min(Math.round((achieved / target) * 100), 100);
  }

  getStatusSeverity(status: string): 'success' | 'danger' | 'warn' {
    switch (status?.toLowerCase()) {
      case 'achieved':
        return 'success';
      case 'missed':
        return 'danger';
      default:
        return 'warn';
    }
  }

  /* =====================================================================
   * CUSTOMERS & FOLLOW-UPS
   * ===================================================================== */
  loadCustomers() {
    this._apiServices.getAllcustomers(this.scopedParams()).subscribe({
      next: (res: any) => {
        this.customers = res ?? [];
        this.failedCount = this.customers.filter(
          (c) => c.status === 'Failed',
        ).length;
        this.warnIfNoDateFields();
        this.rebuildCustomerCharts();
        this.createSeriousnessChart();
        this.refreshCustomerStats();
      },
      error: (err) => console.error('Error fetching customers:', err),
    });
  }

  loadMissedFollowups() {
    this._apiServices.missedFollowupCustomers(this.scopedParams()).subscribe({
      next: (res: any) => {
        this.missedFollow = res ?? [];
        this.refreshCustomerStats();
      },
      error: (err) => console.error(err),
    });
  }

  loadTodaysFollowups() {
    this._apiServices.todayFollowupCustomers(this.scopedParams()).subscribe({
      next: (res: any) => {
        this.todaysFollow = res ?? [];
        this.refreshCustomerStats();
      },
      error: (err) => console.error(err),
    });
  }

  private refreshCustomerStats() {
    this.customerStats = [
      {
        label: 'Total',
        value: this.customers.length,
        icon: 'pi-users',
        iconClass: 'bg-rose-100 text-rose-900',
        link: '/customers/view-all',
      },
      {
        label: 'Missed',
        value: this.missedFollow.length,
        icon: 'pi-exclamation-triangle',
        iconClass: 'bg-orange-100 text-orange-700',
        link: '/followup/missed',
      },
      {
        label: 'Upcoming',
        value: this.todaysFollow.length,
        icon: 'pi-calendar',
        iconClass: 'bg-green-100 text-green-700',
        link: '/followup/todays',
      },
      {
        label: 'Failed',
        value: this.failedCount,
        icon: 'pi-times-circle',
        iconClass: 'bg-red-100 text-red-700',
      },
    ];
  }

  /* ---------- Customer & Follow-up graphs (date-wise filter) ---------- */
  // The first key found on a customer is used. Add your real field names here.
  private readonly CREATED_KEYS = [
    'createdAt',
    'created_at',
    'createdOn',
    'created',
    'date',
    'timestamp',
  ];
  private readonly FOLLOWUP_KEYS = [
    'nextFollowupDate',
    'nextFollowUpDate',
    'followupDate',
    'followUpDate',
    'nextFollowup',
    'nextFollowUp',
    'next_followup_date',
  ];

  private pick(c: any, keys: string[]): any {
    for (const k of keys) if (c?.[k]) return c[k];
    return null;
  }

  /** tells you the real field names if none of the guesses match */
  private warnIfNoDateFields() {
    const sample = this.customers[0];
    if (!sample) return;
    if (!this.pick(sample, this.CREATED_KEYS))
      console.warn(
        '[Overview] No created-date field found on customers. Available keys:',
        Object.keys(sample),
      );
    if (!this.pick(sample, this.FOLLOWUP_KEYS))
      console.warn(
        '[Overview] No follow-up-date field found on customers. Available keys:',
        Object.keys(sample),
      );
  }

  setCustRange(r: Range) {
    this.custRange = r;
    this.custDates = null;
    this.rebuildCustomerCharts();
  }

  onCustDatesChange(dates: Date[] | null) {
    this.custDates = dates;
    // the range picker also emits after the first click; wait for both dates
    if (dates?.[0] && dates?.[1]) {
      this.custRange = 'custom';
      this.rebuildCustomerCharts();
    }
  }

  /** the date filter drives the bar chart only (the doughnut shows all customers) */
  private rebuildCustomerCharts() {
    const { from, to } = this.periodFor(this.custRange, this.custDates);
    this.prepareCustomerChart(from, to);
  }

  /** Customers added vs follow-ups due, one bar pair per day in the range */
  private prepareCustomerChart(from: Date, to: Date) {
    const keyOf = (d: any) => formatDate(d, 'yyyy-MM-dd', 'en-US');
    const created = new Map<string, number>();
    const followups = new Map<string, number>();

    this.customers.forEach((c) => {
      const cd = this.pick(c, this.CREATED_KEYS);
      if (cd && this.inRange(cd, from, to))
        created.set(keyOf(cd), (created.get(keyOf(cd)) ?? 0) + 1);
      const fd = this.pick(c, this.FOLLOWUP_KEYS);
      if (fd && this.inRange(fd, from, to))
        followups.set(keyOf(fd), (followups.get(keyOf(fd)) ?? 0) + 1);
    });

    const days: Date[] = [];
    const d = new Date(from);
    while (d <= to && days.length < 366) {
      days.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }

    this.custChartData = {
      labels: days.map((x) => formatDate(x, 'MMM d', 'en-US')),
      datasets: [
        {
          label: 'Customers',
          data: days.map((x) => created.get(keyOf(x)) ?? 0),
          backgroundColor: '#3B82F6',
          borderRadius: 6,
          maxBarThickness: 36,
        },
        {
          label: 'Follow-ups',
          data: days.map((x) => followups.get(keyOf(x)) ?? 0),
          backgroundColor: '#10B981',
          borderRadius: 6,
          maxBarThickness: 36,
        },
      ],
    };
  }

  /** Legend is built from the real values, so it works whatever labels you store */
  createSeriousnessChart() {
    const KNOWN: Record<string, string> = {
      neutral: '#EBB79E',
      high: '#7A2145',
      low: '#5E8F6A',
    };
    const EXTRA = ['#576E9A', '#BE8A42', '#7565A0', '#A45352'];

    const counts = new Map<string, { label: string; count: number }>();
    this.customers.forEach((c) => {
      const raw = String(c.seriousness ?? '').trim();
      const label = raw || 'Unspecified';
      const k = label.toLowerCase();
      const cur = counts.get(k) ?? { label, count: 0 };
      cur.count++;
      counts.set(k, cur);
    });

    const order = ['neutral', 'high', 'low'];
    const entries = [...counts.entries()].sort(([a], [b]) => {
      const ia = order.indexOf(a),
        ib = order.indexOf(b);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });

    let extra = 0;
    this.seriousnessLegend = entries.map(([k, v]) => ({
      label: v.label,
      count: v.count,
      color: KNOWN[k] ?? EXTRA[extra++ % EXTRA.length],
    }));

    const total = this.seriousnessLegend.reduce((n, s) => n + s.count, 0);
    this.seriousnessChartData = {
      labels: total ? this.seriousnessLegend.map((s) => s.label) : ['No data'],
      datasets: [
        {
          data: total ? this.seriousnessLegend.map((s) => s.count) : [1],
          backgroundColor: total
            ? this.seriousnessLegend.map((s) => s.color)
            : ['#E8E1DE'],
          borderWidth: 0,
          borderRadius: 20,
          spacing: 2,
        },
      ],
    };
  }

  private buildChartOptions() {
    const tick = { color: '#6b5a60', font: { size: 11 } };
    this.barOptions = {
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          align: 'end',
          labels: { usePointStyle: true, boxWidth: 8, color: '#2B1A20' },
        },
      },
      scales: {
        x: { ticks: tick, grid: { display: false } },
        y: {
          beginAtZero: true,
          ticks: { ...tick, precision: 0 },
          grid: { color: '#F3E6E0' },
          border: { display: false },
        },
      },
    };
    this.seriousnessChartOptions = {
      cutout: '78%',
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
    };
  }

  /* =====================================================================
   * ORDERS
   * Uses OrderService (see ORDERS_METHOD at the top).
   * ===================================================================== */
  loadOrders() {
    this.safeCall(
      this._orderService,
      ORDERS_METHOD,
      this.scopedParams(),
    ).subscribe({
      next: (res: OrderRow[]) => {
        this.orders = res ?? [];
        const n = (s: string) =>
          this.orders.filter((o) => o.status?.toLowerCase() === s).length;

        this.orderStats = [
          {
            label: 'Received',
            value: n('received'),
            icon: 'pi-inbox',
            bgClass: 'bg-blue-50',
            iconClass: 'text-blue-600',
          },
          {
            label: 'Issued',
            value: n('issued'),
            icon: 'pi-check-circle',
            bgClass: 'bg-green-50',
            iconClass: 'text-green-600',
          },
          {
            label: 'Cancelled',
            value: n('cancelled'),
            icon: 'pi-times-circle',
            bgClass: 'bg-red-50',
            iconClass: 'text-red-600',
          },
          {
            label: 'Hold',
            value: n('hold'),
            icon: 'pi-pause-circle',
            bgClass: 'bg-orange-50',
            iconClass: 'text-orange-600',
          },
        ];

        this.recentOrders = [...this.orders]
          .sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp))
          .slice(0, 3);
      },
      error: (err: any) => console.error('Error fetching orders:', err),
    });
  }

  statusSeverity(status: string): 'success' | 'warn' | 'secondary' {
    const v = status?.toLowerCase();
    if (v === 'delivered') return 'success';
    if (v === 'pending') return 'warn';
    return 'secondary';
  }
}
