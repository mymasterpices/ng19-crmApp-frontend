import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class FootfallService {
  constructor() {}

  private http = inject(HttpClient);

  //get footfall entries
  getFootfallEntries(params?: HttpParams) {
    return this.http.get(environment.API_URL + '/api/footfall/get', {
      params: params || {},
    });
  }
  //save footfall entry
  saveFootfallEntry(userId: string, footfallEntry: any) {
    return this.http.post(
      `${environment.API_URL}/api/footfall/save/${userId}`,
      footfallEntry
    );
  }
  //delete footfall entry
  deleteFootfallEntry(footfall_id: string) {
    return this.http.delete(
      environment.API_URL + '/api/footfall/delete/' + footfall_id
    );
  }
  //update footfall entry
  updateFootfallEntry(footfall_id: string, footfallEntry: any) {
    return this.http.patch(
      environment.API_URL + '/api/footfall/update/' + footfall_id,
      footfallEntry
    );
  }
  //get all sales persons
  getAllSalesPersons() {
    return this.http.get(environment.API_URL + '/api/auth/users');
  }
  //upload bulk footfall entries
  uploadBulkFootfallEntries(file: any) {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(
      environment.API_URL + '/api/footfall/import',
      formData
    );
  }

  //// user.service.ts (or similar)
  updateUserStatus(id: string, status: 'active' | 'inactive') {
    return this.http.patch(`${environment.API_URL}/api/auth/status`, {
      id,
      status,
    });
  }
}
