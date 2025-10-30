import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CardModule } from 'primeng/card';
import { GalleriaModule } from 'primeng/galleria';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { SharevideosService } from '../../../services/sharevideos.service';
import { environment } from '../../../../environments/environment';
import 'media-chrome';

@Component({
  selector: 'app-myplaylist',
  standalone: true,
  imports: [
    CardModule,
    GalleriaModule,
    ButtonModule,
    TooltipModule,
    ToastModule,
  ],
  providers: [MessageService],
  templateUrl: './myplaylist.component.html',
  styleUrls: ['./myplaylist.component.css'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class MyplaylistComponent implements OnInit {
  @ViewChild('mainVideo') mainVideo!: ElementRef<HTMLVideoElement>;

  siteURL: string = environment.API_URL + `/api/videos/share-one`;
  token: string = '';
  videoList: any[] = [];
  activeIndex = signal<number>(0);
  icons = signal<{ [key: string]: string }>({});
  reqQuote = signal<boolean>(true);

  constructor(
    private activatedRoute: ActivatedRoute,
    private userService: SharevideosService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.activatedRoute.params.subscribe((params) => {
      this.token = params['token'];
      this.fetchVideos();
      this.loadSessionFavorites();
    });
  }

  setActiveIndex(index: number): void {
    this.activeIndex.set(index);
    if (this.mainVideo?.nativeElement) {
      this.mainVideo.nativeElement.load();
    }
  }

  fetchVideos() {
    this.userService.getSharedVideos(this.token).subscribe(
      (response: any) => {
        this.videoList = Array.isArray(response) ? response : [];
      },
      (error: any) => {
        console.error('Error fetching shared videos:', error);
      }
    );
  }

  loadSessionFavorites() {
    const savedList = JSON.parse(
      sessionStorage.getItem('myVideoIdList') || '[]'
    );
    const iconsMap: { [key: string]: string } = {};
    savedList.forEach((item: any) => {
      iconsMap[item.markedVideoId] = 'pi pi-heart-fill';
    });
    this.icons.set(iconsMap);
    this.reqQuote.set(savedList.length === 0);
  }

  favoriteVideo(markedVideoId: string, tagNumber: string) {
    let existingList: { markedVideoId: string; tagNumber: string }[] =
      JSON.parse(sessionStorage.getItem('myVideoIdList') || '[]');

    const alreadyExists = existingList.some(
      (item) =>
        item.tagNumber === tagNumber || item.markedVideoId === markedVideoId
    );

    if (alreadyExists) {
      this.messageService.add({
        severity: 'info',
        summary: 'Info',
        detail: 'This video is already marked as favorite.',
      });
      return;
    }

    existingList.push({ markedVideoId, tagNumber });
    sessionStorage.setItem('myVideoIdList', JSON.stringify(existingList));

    this.reqQuote.set(false);
    this.icons.update((icons) => ({
      ...icons,
      [markedVideoId]: 'pi pi-heart-fill',
    }));

    this.messageService.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Favorite saved',
    });
  }

  removeFavorite(markedVideoId: string) {
    let existingList: { markedVideoId: string; tagNumber: string }[] =
      JSON.parse(sessionStorage.getItem('myVideoIdList') || '[]');

    existingList = existingList.filter(
      (item) => item.markedVideoId !== markedVideoId
    );
    sessionStorage.setItem('myVideoIdList', JSON.stringify(existingList));

    this.icons.update((icons) => ({
      ...icons,
      [markedVideoId]: 'pi pi-heart',
    }));

    if (existingList.length === 0) {
      this.reqQuote.set(true);
    }

    this.messageService.add({
      severity: 'info',
      summary: 'Info',
      detail: 'Favorite removed',
    });
  }

  requestQuote() {
    const savedFavoritesList = JSON.parse(
      sessionStorage.getItem('myVideoIdList') || '[]'
    );

    const data = {
      token: this.token,
      favVideoIds: savedFavoritesList,
    };

    this.userService.saveFavoriteVideos(data).subscribe(
      () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Favorite videos saved successfully',
        });

        // Clear session storage after successful save
        sessionStorage.removeItem('myVideoIdList');
        this.reqQuote.set(true);
        this.icons.set({});
      },
      (error: any) => {
        console.error('Error saving favorite videos:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to save favorite videos',
        });
      }
    );
  }
}
