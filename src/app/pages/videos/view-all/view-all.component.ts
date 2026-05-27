import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { SharevideosService } from '../../../services/sharevideos.service';
import { UploadNewVideoComponent } from '../upload-new-video/upload-new-video.component';
import { UpperCasePipe } from '@angular/common';
import { Checkbox } from 'primeng/checkbox';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { DatePicker } from 'primeng/datepicker';
import { DrawerModule } from 'primeng/drawer';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../services/auth.service';
import { FloatLabelModule } from 'primeng/floatlabel';

@Component({
  selector: 'app-view-all',
  standalone: true,
  imports: [
    ButtonModule,
    RouterLink,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    CardModule,
    UploadNewVideoComponent,
    UpperCasePipe,
    Checkbox,
    ReactiveFormsModule,
    DatePicker,
    DrawerModule,
    FormsModule,
    UpperCasePipe,
    FloatLabelModule,
  ],
  templateUrl: './view-all.component.html',
  styleUrls: ['./view-all.component.css'], // fixed typo
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ViewAllComponent implements OnInit {
  private sharedVideosServices = inject(SharevideosService);
  private messageService = inject(MessageService);
  private _authService = inject(AuthService);
  private confirmationService = inject(ConfirmationService);

  loginUser = this._authService.getUserName();
  videoList = signal<any[]>([]);
  siteURL: string = environment.API_URL;

  // show/hide dialog
  visible: boolean = false;
  displayBasic: boolean = false;

  selectedVideoList: string[] = [];

  shareLinkForm: FormGroup = new FormGroup({
    LinkExpireOnDate: new FormControl('', [Validators.required]),
    customerName: new FormControl('', [
      Validators.required,
      Validators.minLength(3),
    ]),
  });

  ngOnInit(): void {
    this.getAllVideoData();
  }

  getAllVideoData() {
    try {
      this.sharedVideosServices.getAllVideos().subscribe((data: any) => {
        this.videoList.set(data);
      });
    } catch (error) {
      console.error('Error fetching videos:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Error fetching videos',
      });
    }
  }

  getSeletedVideOID(selectedVideo: string) {
    if (this.selectedVideoList.includes(selectedVideo)) {
      this.selectedVideoList = this.selectedVideoList.filter(
        (item) => item !== selectedVideo,
      );
      this.messageService.add({
        severity: 'error',
        summary: 'Video removed',
        detail: 'Video removed from playlist.',
      });
    } else {
      this.selectedVideoList.push(selectedVideo);
      this.messageService.add({
        severity: 'success',
        summary: 'Video added',
        detail: `Video added to the playlist.`,
      });
    }
    console.log(this.selectedVideoList);
  }

  generateShareableLink() {
    if (this.selectedVideoList.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'No Videos Selected',
        detail: 'Please select at least one video.',
      });
      return;
    }

    const expiryDate = this.shareLinkForm.value.LinkExpireOnDate;
    const customerName = this.shareLinkForm.value.customerName;

    if (!expiryDate) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Expiry Date Missing',
        detail: 'Please select an expiry date.',
      });
      return;
    }

    const generatedLinkInfo = {
      videoIds: this.selectedVideoList,
      expiryDate: expiryDate,
      customerName: customerName,
    };

    this.sharedVideosServices
      .generateShareableLink(generatedLinkInfo)
      .subscribe({
        next: (response: any) => {
          const finalLink = environment.app + `/myplaylist/${response.token}`;
          navigator.clipboard.writeText(finalLink).then(() => {
            this.messageService.add({
              severity: 'success',
              summary: 'Link Generated',
              detail: 'Shareable link copied to clipboard!',
            });
          });
          console.log('Generated Link Response:', response);
        },
        error: (error: any) => {
          console.error('Error generating shareable link:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to generate shareable link.',
          });
        },
      });
  }

  deleteVideoItem(videoIDdelete: string) {
    this.confirmationService.confirm({
      header: 'Delete Video',
      message: 'Are you sure you want to delete this video?',
      rejectButtonProps: { label: 'Cancel', severity: 'primary' },
      acceptButtonProps: { label: 'Yes', severity: 'secondary' },
      accept: () => {
        this.sharedVideosServices.deleteVideo(videoIDdelete).subscribe({
          next: (response: any) => {
            console.log('Video deleted successfully:', response);
            this.messageService.add({
              severity: 'success',
              summary: 'Video Deleted',
              detail: 'Video deleted successfully.',
            });
            this.getAllVideoData();
          },
          error: (error: any) => {
            console.error('Error deleting video:', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Failed to delete video.',
            });
          },
        });
      },
    });
  }

  autoplayOnHover(videoElement: HTMLVideoElement) {
    videoElement.play();
  }

  pauseOnLeave(videoElement: HTMLVideoElement) {
    videoElement.pause();
  }

  searchText: string = '';

  searchVideo() {
    const searchedValue = this.searchText.trim(); // remove extra spaces
    if (!searchedValue) {
      // If search is empty, you can optionally reload all videos
      console.warn('Search text is empty');
      return;
    }

    console.log('Search value:', searchedValue);

    this.sharedVideosServices
      .getVideoByTag({ tagNumber: searchedValue })
      .subscribe({
        next: (response: any) => {
          console.log('Search result:', response);

          // Depending on your API response, use response.videos
          if (response?.videos?.length > 0) {
            this.videoList.set(response.videos); // update the signal
          } else {
            // If no videos found, clear the list
            this.videoList.set([]);
            this.messageService.add({
              severity: 'warn',
              summary: 'No Videos Found',
              detail: `No videos found for "${searchedValue}".`,
            });
          }
        },
        error: (error: any) => {
          console.error('Error searching videos:', error);
          this.videoList.set([]); // clear the list on error
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Error searching videos.',
          });
        },
      });
  }
}
