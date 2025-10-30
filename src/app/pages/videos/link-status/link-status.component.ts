import { Component, EventEmitter, inject, OnInit, Output } from '@angular/core';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { environment } from '../../../../environments/environment';
import { SharevideosService } from '../../../services/sharevideos.service';

@Component({
  selector: 'app-link-status',
  imports: [
    CardModule,
    TagModule,
    TitleCasePipe,
    TableModule,
    DatePipe,
    ButtonModule,
  ],
  templateUrl: './link-status.component.html',
  styleUrl: './link-status.component.css',
})
export class LinkStatusComponent implements OnInit {
  @Output() close = new EventEmitter<void>();

  private _sharedVideosService = inject(SharevideosService);

  links: any[] = [];
  siteURL: string = environment.API_URL + `/api/video/share-one`;
  token: string = '';

  ngOnInit(): void {
    this.getLinkStatus();
  }

  getLinkStatus(): void {
    this._sharedVideosService.getAllShareLink().subscribe(
      (response: any) => {
        this.links = response?.data ?? [];
        this.token = this.links.length ? this.links[0].token : '';
        this.close.emit();
      },
      (error) => {
        console.error('Error fetching links:', error);
      }
    );
  }
}
