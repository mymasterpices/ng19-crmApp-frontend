import { Component, inject, OnInit, signal, computed } from '@angular/core';
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
import { ConfirmationService, MessageService } from 'primeng/api';
import { FloatLabel } from 'primeng/floatlabel';
import { InputTextModule } from 'primeng/inputtext';

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
    FloatLabel,
    InputTextModule,
  ],
  templateUrl: './sold-items.component.html',
  styleUrl: './sold-items.component.css',
})
export class SoldItemsComponent implements OnInit {
  // Services
  private apiService = inject(ApiService);
  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);
  private loginedUserService = inject(LoginedUserService);
  public router = inject(Router);

  // Constants
  backendUrl = environment.API_URL;
  loginUser: string = '';

  // --- Signals (State) ---
  // We store the raw data in a signal
  allSoldItems = signal<any[]>([]);

  // Pagination State Signals
  first = signal<number>(0);
  rows = signal<number>(10);

  // --- Computed Signal (The Logic) ---
  // This automatically recalculates whenever allSoldItems, first, or rows change.
  // This replaces your manual 'updatePagedItems' function.
  pagedItems = computed(() => {
    const start = this.first();
    const end = start + this.rows();
    return this.allSoldItems().slice(start, end);
  });

  ngOnInit(): void {
    this.loginUser = this.loginedUserService.getLoginedUser();
    this.getAllSoldItems();
  }

  getAllSoldItems(search: string = '') {
    let params = new HttpParams();

    // Simply attach the search term if it exists
    if (search.trim()) {
      params = params.set('full_name', search.trim());
    }

    // We no longer check for user roles here
    this.apiService.getAllSoldItems(params).subscribe({
      next: (response: any) => {
        // ✅ Update the Signal - this ensures the table refreshes
        const data = Array.isArray(response) ? response : [];
        this.allSoldItems.set(data);

        // Reset pagination to the first page for the new results
        this.first.set(0);
        console.log('Public data fetched:', data);
      },
      error: (error) => {
        console.error('Error fetching data:', error);
        this.allSoldItems.set([]); // Clear the table on error
      },
    });
  }

  onPageChange(event: any) {
    // ✅ FIX: Update the signals directly
    this.first.set(event.first);
    this.rows.set(event.rows);
  }

  deleteSoldItem(item_id: string) {
    this.confirmationService.confirm({
      message: 'Are you sure you want to delete this record?',
      header: 'Delete Confirmation',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.apiService.deleteSoldItem(item_id).subscribe({
          next: (res: any) => {
            this.messageService.add({
              severity: 'success',
              summary: 'Deleted',
              detail: res.message || 'Item removed successfully',
            });
            this.getAllSoldItems(); // Refresh list
          },
          error: (err) => {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: err.error?.message || 'Delete failed',
            });
          },
        });
      },
    });
  }
}
