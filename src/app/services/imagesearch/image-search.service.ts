// crmApp/app/src/app/pages/image-search/image-search.service.ts

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ImageResult {
  _id: string;
  filename: string;
  subfolder: string;
  relative_path: string;
  distance?: number; // not returned by the CLIP/SigLIP service anymore
  score: number; // 0–1  (1 = identical)
  imageUrl: string; // built from environment.SYNC_IMAGE_URL + relative_path
}

export interface SearchResponse {
  success: boolean;
  count: number;
  results: ImageResult[];
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class ImageSearchService {
  private http = inject(HttpClient);
  private base = '/api/image-search';

  private buildUrl(relativePath: string): string {
    return `${environment.SYNC_IMAGE_URL}/${relativePath.replace(/^\/+/, '')}`;
  }

  async search(file: File, topK = 12): Promise<SearchResponse> {
    const form = new FormData();
    form.append('image', file);

    const res = await firstValueFrom(
      this.http.post<SearchResponse>(`${this.base}/search?top_k=${topK}`, form),
    );

    return {
      ...res,
      results: (res.results ?? []).map((r) => ({
        ...r,
        imageUrl: this.buildUrl(r.relative_path),
      })),
    };
  }

  stats(): Promise<unknown> {
    return firstValueFrom(this.http.get(`${this.base}/stats`));
  }

  health(): Promise<unknown> {
    return firstValueFrom(this.http.get(`${this.base}/health`));
  }

  triggerIndexAll(): Promise<unknown> {
    return firstValueFrom(this.http.post(`${this.base}/index/all`, null));
  }
}
