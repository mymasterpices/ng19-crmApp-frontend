import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MonthlyReport, DailyStat } from '../models/report.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ReportService {
  private http = inject(HttpClient);
  private apiUrl = environment.API_URL; // Your backend URL

  // State management using Signals
  currentReport = signal<MonthlyReport | null>(null);

  loadReport(year: number, month: number, userId: string) {
    this.http
      .get<MonthlyReport>(
        `${this.apiUrl}/api/footfall/report/${year}/${month}/${userId}`,
      )
      .subscribe((report) => this.currentReport.set(report));
  }

  addDailyStat(stat: DailyStat) {
    const report = this.currentReport();
    if (report) {
      // Update logic: In a real app, send this to the server first
      const updatedStats = [...report.daily_stats, stat];
      this.currentReport.set({ ...report, daily_stats: updatedStats });
    }
  }
}
