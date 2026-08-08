import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

// ─── Response Interfaces ──────────────────────────────────────────────────────

export interface KpiResponse {
  totalFootfall: number;
  totalConversion: number;
  conversionRate: number;
  footfallChange: number;
  conversionChange: number;
  rateChange: number;
  topPerformer: { name: string; sales: number } | null;
}

export interface FeedEntry {
  date: string;
  footfall: number;
  conversion: number;
  pcs: string[];
}

export interface StaffStat {
  name: string;
  totalFootfall: number;
  totalConversion: number;
  conversionRate: number;
}

export interface MonthlyComparisonResponse {
  label: string;
  convEfficiencyValue: number;
  convEfficiencyChange: number;
  pcLeadsValue: number;
  pcLeadsChange: number;
  insight: string;
}

export interface HeatmapCell {
  date: string;
  value: number;
  isFuture: boolean;
  label: string;
}

export interface YearlyChartData {
  cy: { footfall: number; conversion: number }[];
  ly: { footfall: number; conversion: number }[];
}

// ─────────────────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class FootfallService {
  private http = inject(HttpClient);
  private base = `${environment.API_URL}/api/footfall/footfalldata`;

  // ── Shared range-param builder ─────────────────────────────────────────────
  private rangeParams(
    rangeType: 'weekly' | 'monthly' | 'custom',
    startDate?: string,
    endDate?: string,
  ): HttpParams {
    let p = new HttpParams().set('rangeType', rangeType);
    if (rangeType === 'custom' && startDate && endDate) {
      p = p.set('startDate', startDate).set('endDate', endDate);
    }
    return p;
  }

  // ── KPI Cards ──────────────────────────────────────────────────────────────
  getKpis(
    rangeType: 'weekly' | 'monthly' | 'custom',
    startDate?: string,
    endDate?: string,
  ): Observable<KpiResponse> {
    return this.http.get<KpiResponse>(`${this.base}/kpis`, {
      params: this.rangeParams(rangeType, startDate, endDate),
    });
  }

  // ── Recent Entry Feed ──────────────────────────────────────────────────────
  getFeed(salesPerson?: string): Observable<FeedEntry[]> {
    let p = new HttpParams();
    if (salesPerson) p = p.set('salesPerson', salesPerson);
    return this.http.get<FeedEntry[]>(`${this.base}/feed`, { params: p });
  }

  // ── Top Staff ──────────────────────────────────────────────────────────────
  getTopStaff(
    rangeType: 'weekly' | 'monthly' | 'custom',
    sortBy: 'sales' | 'conv' = 'sales',
    startDate?: string,
    endDate?: string,
  ): Observable<StaffStat[]> {
    const p = this.rangeParams(rangeType, startDate, endDate).set(
      'sortBy',
      sortBy,
    );
    return this.http.get<StaffStat[]>(`${this.base}/top-staff`, { params: p });
  }

  // ── Monthly Comparison ─────────────────────────────────────────────────────
  getMonthlyComparison(): Observable<MonthlyComparisonResponse> {
    return this.http.get<MonthlyComparisonResponse>(
      `${this.base}/monthly-comparison`,
    );
  }

  // ── Weekly Heatmap ─────────────────────────────────────────────────────────
  getHeatmap(): Observable<HeatmapCell[]> {
    return this.http.get<HeatmapCell[]>(`${this.base}/heatmap`);
  }

  // ── Yearly Chart ───────────────────────────────────────────────────────────
  getYearlyChart(year: number): Observable<YearlyChartData> {
    return this.http.get<YearlyChartData>(`${this.base}/yearly-chart/${year}`);
  }

  // ── Save Entry ─────────────────────────────────────────────────────────────
  saveFootfallData(data: any): Observable<any> {
    return this.http.post(`${this.base}/`, data);
  }

  // ── Users / Sales Persons ──────────────────────────────────────────────────
  getAllSalesPersons(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.API_URL}/api/auth/users`);
  }

  updateUserStatus(id: string, status: 'active' | 'inactive'): Observable<any> {
    return this.http.patch(`${environment.API_URL}/api/auth/status`, {
      id,
      status,
    });
  }

  // ── Legacy helpers (kept for other components that may still use them) ─────
  getFootfallEntries(params?: HttpParams): Observable<any> {
    return this.http.get(`${environment.API_URL}/api/footfall/get`, {
      params: params || {},
    });
  }

  saveFootfallEntry(userId: string, entry: any): Observable<any> {
    return this.http.post(
      `${environment.API_URL}/api/footfall/save/${userId}`,
      entry,
    );
  }

  deleteFootfallEntry(userId: string, footfallId: string): Observable<any> {
    return this.http.delete(
      `${environment.API_URL}/api/footfall/delete/${userId}/${footfallId}`,
    );
  }

  updateFootfallEntry(footfallId: string, entry: any): Observable<any> {
    return this.http.patch(
      `${environment.API_URL}/api/footfall/update/${footfallId}`,
      entry,
    );
  }

  uploadBulkFootfallEntries(file: File): Observable<any> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post(`${environment.API_URL}/api/footfall/import`, fd);
  }

  getAllFootfallData(): Observable<any[]> {
    return this.http.get<any[]>(
      `${environment.API_URL}/api/footfall/footfalldata/all`,
    );
  }

  //Get the footfall data for a specific user and year & month
  getFootfallData(
    userId: string,
    year: number,
    month: number,
  ): Observable<any[]> {
    return this.http.get<any[]>(
      `${environment.API_URL}/api/footfall/footfalldata/${userId}/${year}/${month}`,
    );
  }

  //update footfall entry by entry id
  updateFootfallEntryById(entryId: string, entry: any): Observable<any> {
    return this.http.patch(
      `${environment.API_URL}/api/footfall/footfalldata/update/${entryId}`,
      entry,
    );
  }

  //delete footfall entry by entry id
  deleteFootfallEntryById(entryId: string): Observable<any> {
    return this.http.delete(
      `${environment.API_URL}/api/footfall/footfalldata/delete/${entryId}`,
    );
  }

  getPCategory() {
    return this.http.get(`${environment.API_URL}/api/orders/category/get`);
  }
}
