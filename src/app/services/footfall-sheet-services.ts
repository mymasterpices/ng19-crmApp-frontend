import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class FootfallSheetServices {
  private http = inject(HttpClient);
  private baseUrl = environment.API_URL;

  getTabs() {
    return this.http.get<any>(`${this.baseUrl}/api/footfall/sheet/tabs`);
  }

  getSheetData(tab?: string) {
    let params = new HttpParams();
    if (tab) params = params.set('tab', tab);
    return this.http.get<any>(`${this.baseUrl}/api/footfall/sheet`, { params });
  }
}
