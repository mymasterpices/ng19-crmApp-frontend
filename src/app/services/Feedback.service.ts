import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface FeedbackPayload {
  mobile: string;
  name?: string | null;
  address?: string | null;
  dob?: string | null; // ISO string
  anniversary?: string | null; // ISO string
  pan?: string | null;
  rating?: number | null;
  remarks?: string | null;
}

export interface Feedback extends FeedbackPayload {
  _id: string;
  createdAt: string;
  updatedAt: string;
}

export interface FeedbackPage {
  items: Feedback[];
  total: number;
  page: number;
  pages: number;
}

export interface FeedbackQuery {
  page?: number;
  limit?: number;
  mobile?: string;
  rating?: number;
}

@Injectable({ providedIn: 'root' })
export class FeedbackService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.API_URL}/api/feedback`;

  create(payload: FeedbackPayload): Observable<Feedback> {
    return this.http.post<Feedback>(this.baseUrl, payload);
  }

  getAll(query: FeedbackQuery = {}): Observable<FeedbackPage> {
    let params = new HttpParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });
    return this.http.get<FeedbackPage>(this.baseUrl, { params });
  }

  /** Latest feedback for a mobile number. Responds 404 when the number is new. */
  getByMobile(mobile: string): Observable<Feedback> {
    return this.http.get<Feedback>(`${this.baseUrl}/by-mobile/${mobile}`);
  }

  getById(id: string): Observable<Feedback> {
    return this.http.get<Feedback>(`${this.baseUrl}/${id}`);
  }

  update(id: string, payload: Partial<FeedbackPayload>): Observable<Feedback> {
    return this.http.put<Feedback>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
