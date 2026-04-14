import { Component, OnInit } from '@angular/core';
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
  timestamp: string;
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
export class FootfaloverviewComponent implements OnInit {
  // ── Current date ──────────────────────────────────────────
  today = new Date(); // ← ADD THIS

  // ── KPI Cards (current month) ─────────────────────────────
  totalFootfall = 0;
  totalConversion = 0;
  conversionRate = 0;
  totalPc = 0;
  uniqueSalesPersons = 0;

  // ── Deltas vs previous month ──────────────────────────────
  footfallDelta = 0;
  conversionRateDelta = 0;

  // ── Charts ────────────────────────────────────────────────
  weeklyComparisonData: any;
  chartOptions: any;

  // ── Table ─────────────────────────────────────────────────
  recentDays: { date: Date; footfall: number; conversion: number }[] = [];

  private allEntries: FootEntry[] = [];

  constructor(private footfallService: FootfallService) {}

  ngOnInit(): void {
    this.initChartOptions();
    this.loadData();
  }

  loadData() {
    this.footfallService.getFootfallEntries().subscribe({
      next: (res: any) => {
        const users = res.data as FootfallUser[];
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
      error: (err) => console.error('Failed to load footfall entries', err),
    });
  }

  initChartOptions() {
    this.chartOptions = {
      plugins: {
        legend: { labels: { color: '#6b7280' } },
      },
      scales: {
        x: { ticks: { color: '#6b7280' }, grid: { color: '#e5e7eb' } },
        y: { ticks: { color: '#6b7280' }, grid: { color: '#e5e7eb' } },
      },
    };
  }

  computeStats() {
    if (!this.allEntries.length) return;

    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    const prevMonth = thisMonth === 0 ? 11 : thisMonth - 1;
    const prevYear = thisMonth === 0 ? thisYear - 1 : thisYear;

    // ── Filter current month entries ───────────────────────
    const currentMonthEntries = this.allEntries
      .map((e) => ({ ...e, date: new Date(e.timestamp) }))
      .filter(
        (e) =>
          e.date.getMonth() === thisMonth && e.date.getFullYear() === thisYear,
      );

    // ── Filter previous month entries (for deltas) ─────────
    const prevMonthEntries = this.allEntries
      .map((e) => ({ ...e, date: new Date(e.timestamp) }))
      .filter(
        (e) =>
          e.date.getMonth() === prevMonth && e.date.getFullYear() === prevYear,
      );

    // ── KPI: current month ─────────────────────────────────
    this.totalFootfall = currentMonthEntries.reduce(
      (sum, e) => sum + (e.footfall || 0),
      0,
    );
    this.totalConversion = currentMonthEntries.reduce(
      (sum, e) => sum + (e.conversion || 0),
      0,
    );
    this.conversionRate = this.totalFootfall
      ? (this.totalConversion / this.totalFootfall) * 100
      : 0;

    this.totalPc = currentMonthEntries.reduce((sum, e) => {
      const n = parseFloat(e.pc ?? '');
      return isNaN(n) ? sum : sum + n;
    }, 0);

    this.uniqueSalesPersons = new Set(
      currentMonthEntries.map((e) => e.username),
    ).size;

    // ── Deltas: current vs previous month ─────────────────
    const prevFootfall = prevMonthEntries.reduce(
      (sum, e) => sum + (e.footfall || 0),
      0,
    );
    const prevConversion = prevMonthEntries.reduce(
      (sum, e) => sum + (e.conversion || 0),
      0,
    );
    const prevRate = prevFootfall ? (prevConversion / prevFootfall) * 100 : 0;
    const curRate = this.conversionRate;

    this.footfallDelta =
      prevFootfall === 0
        ? 0
        : ((this.totalFootfall - prevFootfall) / prevFootfall) * 100;

    this.conversionRateDelta =
      prevRate === 0 ? 0 : ((curRate - prevRate) / prevRate) * 100;

    // ── Charts & Table (current month data) ───────────────
    this.buildWeeklyComparison(currentMonthEntries);
    this.buildRecentDays(currentMonthEntries);
  }

  // ── Current month: this week vs previous week ──────────────
  private buildWeeklyComparison(entries: any[]) {
    const now = new Date();
    const oneDay = 24 * 60 * 60 * 1000;
    const startCurrent = new Date(now.getTime() - 6 * oneDay);
    const startPrevious = new Date(now.getTime() - 13 * oneDay);

    let curFootfall = 0,
      curConversion = 0;
    let prevFootfall = 0,
      prevConversion = 0;

    entries.forEach((e) => {
      const d: Date = e.date;
      if (d >= startCurrent && d <= now) {
        curFootfall += e.footfall || 0;
        curConversion += e.conversion || 0;
      } else if (d >= startPrevious && d < startCurrent) {
        prevFootfall += e.footfall || 0;
        prevConversion += e.conversion || 0;
      }
    });

    this.weeklyComparisonData = {
      labels: ['Footfall', 'Conversion'],
      datasets: [
        { label: 'This week', data: [curFootfall, curConversion] },
        { label: 'Previous week', data: [prevFootfall, prevConversion] },
      ],
    };
  }

  // ── Recent 7 days of current month ────────────────────────
  private buildRecentDays(entries: any[]) {
    const byDate = new Map<string, { footfall: number; conversion: number }>();

    entries.forEach((e) => {
      const key = (e.date as Date).toISOString().substring(0, 10);
      const cur = byDate.get(key) || { footfall: 0, conversion: 0 };
      cur.footfall += e.footfall || 0;
      cur.conversion += e.conversion || 0;
      byDate.set(key, cur);
    });

    this.recentDays = Array.from(byDate.keys())
      .sort()
      .reverse()
      .slice(0, 7)
      .map((k) => ({
        date: new Date(k),
        footfall: byDate.get(k)!.footfall,
        conversion: byDate.get(k)!.conversion,
      }));
  }
}
