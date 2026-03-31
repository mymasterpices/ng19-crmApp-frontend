import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class TargetService {
  constructor() {}
  private http = inject(HttpClient);
  private appUrl = environment.API_URL;

  // API call to save store-wide target
  saveTarget(target: any) {
    return this.http.post(`${this.appUrl}/api/targets`, target);
  }

  // Fetch store-wide target performance for a month
  getTargetPerformance(month: number, year: number) {
    return this.http.get(`${this.appUrl}/api/targets/${month}/${year}`);
  }

  // Sync/calculate store-wide achievements
  syncTargetPerformance(month: number, year: number) {
    return this.http.put(
      `${this.appUrl}/api/targets/calculate/${month}/${year}`,
      {},
    );
  }
}
