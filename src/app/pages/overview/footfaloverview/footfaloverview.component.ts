import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChartModule } from 'primeng/chart';
import { Card } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { FootfallService } from '../../../services/footfall/footfall.service';

interface FootEntry {
  username: string;
  user_id: string;
  footfall: number;
  conversion: number;
  pc?: string | null;
  timestamp: string; // ISO string
}

interface FootfallUser {
  username: string;
  user_id: string;
  foot_entry: {
    footfall: number;
    conversion: number;
    pc?: string | null;
    timestamp: string;
  }[];
}
@Component({
  selector: 'app-footfaloverview',
  imports: [CommonModule, ChartModule, Card, TableModule],
  templateUrl: './footfaloverview.component.html',
  styleUrl: './footfaloverview.component.css',
})
export class FootfaloverviewComponent {
  allEntries: FootEntry[] = [];

  // KPI stats
  totalFootfall = 0;
  totalConversion = 0;
  conversionRate = 0;
  totalPc = 0;
  uniqueSalesPersons = 0;

  // deltas (vs previous period)
  footfallDelta = 0;
  conversionRateDelta = 0;

  // Chart data
  footfallTrendData: any;
  weeklyComparisonData: any;
  dailyPerformanceData: any;
  chartOptions: any;

  // Table data
  recentDays: { date: Date; footfall: number; conversion: number }[] = [];

  constructor(private footfallService: FootfallService) {}

  ngOnInit(): void {
    this.initChartOptions();
    this.loadData();
  }

  // ---- data loading ----
  loadData() {
    this.footfallService.getFootfallEntries().subscribe({
      next: (res: any) => {
        const users = res as FootfallUser[];

        const flat: FootEntry[] = [];
        users.forEach((u) => {
          (u.foot_entry || []).forEach((e) => {
            flat.push({
              username: u.username,
              user_id: u.user_id,
              footfall: e.footfall,
              conversion: e.conversion,
              pc: e.pc ?? null,
              timestamp: e.timestamp,
            });
          });
        });

        this.allEntries = flat;
        this.computeStats();
      },
      error: (err) => {
        console.error('Failed to load footfall entries', err);
      },
    });
  }

  initChartOptions() {
    this.chartOptions = {
      plugins: {
        legend: {
          labels: { color: '#6b7280' },
        },
      },
      scales: {
        x: {
          ticks: { color: '#6b7280' },
          grid: { color: '#e5e7eb' },
        },
        y: {
          ticks: { color: '#6b7280' },
          grid: { color: '#e5e7eb' },
        },
      },
    };
  }

  // ---- metrics & charts ----
  computeStats() {
    if (!this.allEntries.length) return;

    // Normalize timestamps to Date
    const entries = this.allEntries.map((e) => ({
      ...e,
      date: new Date(e.timestamp),
    }));

    // Basic totals
    this.totalFootfall = entries.reduce((sum, e) => sum + (e.footfall || 0), 0);
    this.totalConversion = entries.reduce(
      (sum, e) => sum + (e.conversion || 0),
      0
    );
    this.conversionRate = this.totalFootfall
      ? (this.totalConversion / this.totalFootfall) * 100
      : 0;

    // PC total (string → number, ignore invalid)
    this.totalPc = entries.reduce((sum, e) => {
      if (!e.pc) return sum;
      const n = parseFloat(e.pc);
      return isNaN(n) ? sum : sum + n;
    }, 0);

    // Unique salespersons
    const usernames = new Set(entries.map((e) => e.username));
    this.uniqueSalesPersons = usernames.size;

    // Charts
    this.buildMonthlyTrend(entries);
    this.buildWeeklyComparison(entries);
    this.buildDailyPerformance(entries);
    this.buildRecentDays(entries);
    this.computeDeltas(entries);
  }

  private buildMonthlyTrend(entries: any[]) {
    const byMonth = new Map<string, number>();

    entries.forEach((e) => {
      const d: Date = e.date;
      const key = `${d.getFullYear()}-${(d.getMonth() + 1)
        .toString()
        .padStart(2, '0')}`; // e.g. "2025-01"
      byMonth.set(key, (byMonth.get(key) || 0) + (e.footfall || 0));
    });

    const sortedKeys = Array.from(byMonth.keys()).sort();
    const labels = sortedKeys.map((k) => {
      const [year, month] = k.split('-');
      const date = new Date(Number(year), Number(month) - 1, 1);
      return date.toLocaleString('default', {
        month: 'short',
        year: '2-digit',
      });
    });
    const data = sortedKeys.map((k) => byMonth.get(k) || 0);

    this.footfallTrendData = {
      labels,
      datasets: [
        {
          label: 'Footfall',
          data,
          fill: true,
          tension: 0.4,
        },
      ],
    };
  }

  private buildWeeklyComparison(entries: any[]) {
    if (!entries.length) {
      this.weeklyComparisonData = {
        labels: ['Footfall', 'Conversion'],
        datasets: [
          { label: 'Current week', data: [0, 0] },
          { label: 'Previous week', data: [0, 0] },
        ],
      };
      return;
    }

    // Use last date in your data as "now"
    const maxTime = Math.max(...entries.map((e) => e.date.getTime()));
    const now = new Date(maxTime);

    const oneDay = 24 * 60 * 60 * 1000;
    const startCurrent = new Date(now.getTime() - 6 * oneDay); // last 7 days in data
    const startPrevious = new Date(now.getTime() - 13 * oneDay); // previous 7 days in data

    let currentFootfall = 0;
    let currentConversion = 0;
    let previousFootfall = 0;
    let previousConversion = 0;

    entries.forEach((e) => {
      const d: Date = e.date;
      if (d >= startCurrent && d <= now) {
        currentFootfall += e.footfall || 0;
        currentConversion += e.conversion || 0;
      } else if (d >= startPrevious && d < startCurrent) {
        previousFootfall += e.footfall || 0;
        previousConversion += e.conversion || 0;
      }
    });

    this.weeklyComparisonData = {
      labels: ['Footfall', 'Conversion'],
      datasets: [
        {
          label: 'Current week',
          data: [currentFootfall, currentConversion],
        },
        {
          label: 'Previous week',
          data: [previousFootfall, previousConversion],
        },
      ],
    };
  }

  private buildDailyPerformance(entries: any[]) {
    const sums = new Array(7).fill(0);
    const counts = new Array(7).fill(0);

    entries.forEach((e) => {
      const d: Date = e.date;
      const day = d.getDay(); // 0–6 (Sun–Sat)
      sums[day] += e.footfall || 0;
      counts[day] += 1;
    });

    const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const data = labels.map((_, idx) =>
      counts[idx] ? sums[idx] / counts[idx] : 0
    );

    this.dailyPerformanceData = {
      labels,
      datasets: [
        {
          label: 'Avg Footfall',
          data,
        },
      ],
    };
  }

  private buildRecentDays(entries: any[]) {
    const byDate = new Map<string, { footfall: number; conversion: number }>();

    entries.forEach((e) => {
      const d: Date = e.date;
      const key = d.toISOString().substring(0, 10); // yyyy-mm-dd
      const current = byDate.get(key) || { footfall: 0, conversion: 0 };
      current.footfall += e.footfall || 0;
      current.conversion += e.conversion || 0;
      byDate.set(key, current);
    });

    const sortedDates = Array.from(byDate.keys()).sort().reverse(); // newest first
    this.recentDays = sortedDates.slice(0, 7).map((k) => {
      const agg = byDate.get(k)!;
      return {
        date: new Date(k),
        footfall: agg.footfall,
        conversion: agg.conversion,
      };
    });
  }

  private computeDeltas(entries: any[]) {
    const now = new Date();
    const oneDay = 24 * 60 * 60 * 1000;
    const startCurrent = new Date(now.getTime() - 29 * oneDay);
    const startPrevious = new Date(now.getTime() - 59 * oneDay);
    const endPrevious = new Date(now.getTime() - 30 * oneDay);

    let curFoot = 0,
      curConv = 0;
    let prevFoot = 0,
      prevConv = 0;

    entries.forEach((e) => {
      const d: Date = e.date;
      if (d >= startCurrent && d <= now) {
        curFoot += e.footfall || 0;
        curConv += e.conversion || 0;
      } else if (d >= startPrevious && d <= endPrevious) {
        prevFoot += e.footfall || 0;
        prevConv += e.conversion || 0;
      }
    });

    const curRate = curFoot ? (curConv / curFoot) * 100 : 0;
    const prevRate = prevFoot ? (prevConv / prevFoot) * 100 : 0;

    this.footfallDelta =
      prevFoot === 0 ? 0 : ((curFoot - prevFoot) / prevFoot) * 100;
    this.conversionRateDelta =
      prevRate === 0 ? 0 : ((curRate - prevRate) / prevRate) * 100;
  }
}
