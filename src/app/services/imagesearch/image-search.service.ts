// crmApp/app/src/app/pages/image-search/image-search.service.ts

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ImageResult {
  _id:           string;
  filename:      string;
  subfolder:     string;
  relative_path: string;
  distance:      number;   // 0 = identical, higher = less similar
  score:         number;   // 0–1  (1 = identical)
  imageUrl:      string;   // https://syncdrive.jools.in/images/subfolder/file.jpg
}

export interface SearchResponse {
  success: boolean;
  count:   number;
  results: ImageResult[];
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class ImageSearchService {
  private http = inject(HttpClient);
  private base = '/api/image-search';

  search(file: File, topK = 12): Observable<SearchResponse> {
    const form = new FormData();
    form.append('image', file);
    return this.http.post<SearchResponse>(`${this.base}/search?top_k=${topK}`, form);
  }

  stats(): Observable<any> {
    return this.http.get(`${this.base}/stats`);
  }

  health(): Observable<any> {
    return this.http.get(`${this.base}/health`);
  }

  triggerIndexAll(): Observable<any> {
    return this.http.post(`${this.base}/index/all`, null);
  }
}
