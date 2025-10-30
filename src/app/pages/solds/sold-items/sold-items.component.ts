import { Component, inject, OnInit } from '@angular/core';
import { CardModule } from 'primeng/card';
import { ApiService } from '../../../services/api.service';
import { CurrencyPipe, TitleCasePipe, UpperCasePipe } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { Router, RouterLink } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { DialogModule } from 'primeng/dialog';
import { PaginatorModule } from 'primeng/paginator';
import { LoginedUserService } from '../../../services/logined-user.service';
import { HttpParams } from '@angular/common/http';
import { ImageModule } from 'primeng/image';
import { BadgeModule } from 'primeng/badge';
import { TableModule } from 'primeng/table';

@Component({
  selector: 'app-sold-items',
  standalone: true,
  imports: [
    CardModule,
    TitleCasePipe,
    UpperCasePipe,
    CurrencyPipe,
    ButtonModule,
    RouterLink,
    DialogModule,
    PaginatorModule,
    ImageModule,
    BadgeModule,
    TableModule,
    RouterLink,
  ],
  templateUrl: './sold-items.component.html',
  styleUrl: './sold-items.component.css',
})
export class SoldItemsComponent implements OnInit {
  private apiService = inject(ApiService);
  private appUrl = environment.API_URL;
  public router = inject(Router);
  backendUrl = this.appUrl;

  private loginedUserService = inject(LoginedUserService);

  loginUser: string = '';

  // Data
  soldItems: any[] = []; // All items
  pagedItems: any[] = []; // Current page items

  // Paginator state
  first: number = 0;
  rows: number = 10;

  ngOnInit(): void {
    this.loginUser = this.loginedUserService.getLoginedUser();

    this.getAllSoldItems();
  }

  getAllSoldItems() {
    let params = new HttpParams();

    if (this.loginUser !== 'admin') {
      if (this.loginUser) params = params.set('sales_staff', this.loginUser);
    }
    this.apiService.getAllSoldItems(params).subscribe({
      next: (response: any) => {
        this.soldItems = response;
        this.updatePagedItems();
        console.log('Sold items fetched successfully:', response);
      },
      error: (error) => {
        console.error('Error fetching sold items:', error);
      },
    });
  }

  onPageChange(event: any) {
    this.first = event.first;
    this.rows = event.rows;
    this.updatePagedItems();
  }

  updatePagedItems() {
    const start = this.first;
    const end = this.first + this.rows;
    this.pagedItems = this.soldItems.slice(start, end);
  }

  delete(item_id: string) {
    console.log('Delete function called for item_id:', item_id);
  }
}
