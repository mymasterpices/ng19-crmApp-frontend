import { Component, inject } from '@angular/core';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { TableModule } from 'primeng/table';

import { ButtonModule } from 'primeng/button';
import { SharevideosService } from '../../../services/sharevideos.service';
import { environment } from '../../../../environments/environment';
import { RouterLink } from '@angular/router';
import { Drawer } from 'primeng/drawer';
import { LinkStatusComponent } from '../link-status/link-status.component';

@Component({
  selector: 'app-shared-links',
  imports: [
    CardModule,
    TagModule,
    TitleCasePipe,
    TableModule,
    DatePipe,
    ButtonModule,
    TableModule,
    RouterLink,
    Drawer,
    LinkStatusComponent,
  ],
  templateUrl: './shared-links.component.html',
  styleUrl: './shared-links.component.css',
})
export class SharedLinksComponent {
  private userService = inject(SharevideosService); // private is better here

  visible: boolean = false;
  sharedLinks: any[] = []; // store API data
  siteURL: string = environment.API_URL + `/api/videos/share-one`;
  //store token
  token: string = '';
  ngOnInit(): void {
    this.getLinkStatus();
  }

  getLinkStatus(): void {
    this.userService.getAllShareLink().subscribe({
      next: (response: any) => {
        this.sharedLinks = response;
        this.token = this.sharedLinks[0].token;
      },
      error: (error) => {
        console.error('Error fetching links:', error);
      },
    });
  }
}
