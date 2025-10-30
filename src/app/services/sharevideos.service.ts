import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class SharevideosService {
  private http = inject(HttpClient);
  constructor() {}

  //get video by category name
  getVideoData(category: string) {
    return this.http.get(environment.API_URL + `/api/videos/${category}`);
  }

  // API endpoint upload new video product
  uploadVideo(formData: FormData) {
    return this.http.post(environment.API_URL + `/api/videos/create`, formData);
  }
  // API endpoint get all video products
  getAllVideos() {
    return this.http.get(environment.API_URL + `/api/videos`);
  }

  getVideoByCategory(category: string) {
    return this.http.get(environment.API_URL + `/api/videos/${category}`);
  }

  //get the shareble link for seleted video items
  generateShareableLink(data: { videoIds: string[]; expiryDate: string }) {
    return this.http.post(
      environment.API_URL + `/api/videos/generate-shareable-link`,
      data
    );
  }

  getSharedVideos(token: string) {
    return this.http.get(environment.API_URL + `/api/videos/share/${token}`);
  }

  //delete a video
  deleteVideo(videoId: string) {
    return this.http.delete(environment.API_URL + `/api/videos/${videoId}`);
  }
  //save favrite videoList
  saveFavoriteVideos(favoriteList: any) {
    return this.http.post(environment.API_URL + `/api/videos/favorite`, {
      favoriteList,
    });
  }

  //customer selection list
  selectionList() {
    return this.http.get(environment.API_URL + `/api/videos/favorite/get`);
  }

  //  get all the shared link
  getAllShareLink() {
    return this.http.get(environment.API_URL + `/api/videos/shared/get`);
  }
  //get video by tag number
  getVideoByTag(tagNumber: any) {
    return this.http.post(
      environment.API_URL + `/api/videos/search`,
      tagNumber
    );
  }

  //get tag with category
  getTagWithCategory(tagBycat: string) {
    return this.http.get(
      environment.API_URL + `/api/videos/category/${tagBycat}`
    );
  }
}
