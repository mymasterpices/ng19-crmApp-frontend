import { Component, inject, OnInit } from '@angular/core';
import { CardModule } from 'primeng/card';
import { ApiService } from '../../services/api.service';
import { CurrencyPipe, TitleCasePipe, UpperCasePipe } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { Router, RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { DialogModule } from 'primeng/dialog';
import { PaginatorModule } from 'primeng/paginator';

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
  ],
  templateUrl: './sold-items.component.html',
  styleUrl: './sold-items.component.css',
})
export class SoldItemsComponent implements OnInit {
  private apiService = inject(ApiService);
  private appUrl = environment.apiUrl;
  public router = inject(Router);
  backendUrl = this.appUrl;

  // Data
  soldItems: any[] = []; // All items
  pagedItems: any[] = []; // Current page items

  // Paginator state
  first: number = 0;
  rows: number = 10;

  ngOnInit(): void {
    this.getAllSoldItems();
  }

  getAllSoldItems() {
    this.apiService.getAllSoldItems().subscribe({
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
