import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChartModule } from 'primeng/chart';
import { DatePickerModule } from 'primeng/datepicker';
import { TableModule } from 'primeng/table';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { Router } from '@angular/router';
import { ApiService } from '../../../../services/api.service';
import { FootfallService } from '../../../../services/footfall/footfall.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-analytic',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ChartModule,
    DatePickerModule,
    TableModule,
    CardModule,
    TagModule,
  ],
  templateUrl: './analytic.component.html',
  styleUrl: './analytic.component.css',
})
export class AnalyticComponent implements OnInit {
  private _apiService = inject(ApiService);
  private _footfallService = inject(FootfallService);
  private _router = inject(Router);

  private allCustomers: any[] = [];
  private allFootfalls: any[] = [];
  private activeUsers: any[] = [];

  summaryTable: any[] = [];
  totals = { footfall: 0, conversion: 0, customers: 0, missed: 0 };
  selectedDateRange: Date[] | undefined;
  activeFilter: string = 'weekly';
  dateRangeLabel: string = '';

  // ✅ Store active start/end so navigation can use them
  private activeStart: Date = new Date();
  private activeEnd: Date = new Date();

  ngOnInit() {
    this.executeFetch();
  }

  private parseAnyDate(dateInput: any): number {
    if (!dateInput) return 0;
    if (dateInput.$date) return new Date(dateInput.$date).getTime();
    const ts = Date.parse(dateInput);
    return isNaN(ts) ? 0 : ts;
  }

  private compareNames(name1: string, name2: string): boolean {
    const n1 = (name1 || '').trim().toLowerCase();
    const n2 = (name2 || '').trim().toLowerCase();
    return n1 === n2 && n1 !== '';
  }

  private formatRangeLabel(start: Date, end: Date): string {
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return `${start.toLocaleDateString('en-IN', opts)} – ${end.toLocaleDateString('en-IN', opts)}`;
  }

  // ✅ Format date as YYYY-MM-DD for query params
  private toQueryDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  executeFetch() {
    forkJoin({
      customers: this._apiService.getAllcustomers(),
      footfalls: this._footfallService.getFootfallEntries(),
      users: this._apiService.getAllSalesstaff(),
    }).subscribe({
      next: (res: any) => {
        this.allCustomers = res.customers || [];
        this.allFootfalls = res.footfalls?.data ?? res.footfalls ?? [];
        this.activeUsers = (res.users || []).filter(
          (u: any) => u.status === 'active' && u.role === 'user',
        );
        this.applyFilter('weekly');
      },
      error: (err) => console.error('Data Load Error:', err),
    });
  }

  applyFilter(type: string) {
    this.activeFilter = type;
    const now = new Date();
    let start = new Date();
    let end = new Date();

    if (type === 'weekly') {
      start.setDate(now.getDate() - 7);
    } else if (type === 'monthly') {
      start.setMonth(now.getMonth() - 1);
    } else if (
      type === 'range' &&
      this.selectedDateRange?.[0] &&
      this.selectedDateRange?.[1]
    ) {
      start = this.selectedDateRange[0];
      end = this.selectedDateRange[1];
    }

    this.activeStart = new Date(start);
    this.activeEnd = new Date(end);
    this.dateRangeLabel = this.formatRangeLabel(start, end);
    this.calculateSummary(start, end);
  }

  calculateSummary(start: Date, end: Date) {
    const startTime = start.setHours(0, 0, 0, 0);
    const endTime = end.setHours(23, 59, 59, 999);

    this.totals = { footfall: 0, conversion: 0, customers: 0, missed: 0 };

    this.summaryTable = this.activeUsers.map((user) => {
      const staffName = user.username || user.name;

      const userCustomers = this.allCustomers.filter((c) => {
        const cDate = this.parseAnyDate(c.createdAt || c.timestamps);
        return (
          this.compareNames(c.salesperson, staffName) &&
          cDate >= startTime &&
          cDate <= endTime
        );
      });

      const userFootfallRecord = this.allFootfalls.find((f) =>
        this.compareNames(f.username, staffName),
      );

      let fSum = 0;
      let cSum = 0;

      if (userFootfallRecord?.foot_entry) {
        userFootfallRecord.foot_entry.forEach((entry: any) => {
          const entryDate = this.parseAnyDate(entry.timestamp);
          if (entryDate >= startTime && entryDate <= endTime) {
            fSum += entry.footfall || 0;
            cSum += entry.conversion || 0;
          }
        });
      }

      const missed = Math.max(fSum - cSum, 0);

      this.totals.footfall += fSum;
      this.totals.conversion += cSum;
      this.totals.customers += userCustomers.length;
      this.totals.missed += missed;

      return {
        salesperson: staffName,
        footfall: fSum,
        conversion: cSum,
        customers: userCustomers.length,
        missed,
      };
    });
  }

  // ✅ Navigate to /customers/view-all with salesperson + date range as query params
  viewLeads(salesperson: string) {
    this._router.navigate(['/customers/view-all'], {
      queryParams: {
        salesperson,
        startDate: this.toQueryDate(this.activeStart),
        endDate: this.toQueryDate(this.activeEnd),
      },
    });
  }
}
