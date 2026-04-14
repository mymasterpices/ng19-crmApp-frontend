import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DatePipe, NgClass, TitleCasePipe } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { CardModule } from 'primeng/card';
import { ApiService } from '../../services/api.service';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-search',
  imports: [
    TitleCasePipe,
    NgClass,
    ButtonModule,
    DatePipe,
    ConfirmDialog,
    NgClass,
    CardModule,
  ],
  providers: [ConfirmationService],
  templateUrl: './search.component.html',
  styleUrl: './search.component.css',
})
export class SearchComponent implements OnInit {
  private _activatedRoute = inject(ActivatedRoute);
  private loginService = inject(ApiService);
  private router = inject(Router);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private _authService = inject(AuthService);

  searchCustomer: string = '';
  // searchResults: any[] = [];
  searchResults = signal<any[]>([]);
  backedAppUrl = environment.API_URL;

  loginUser = '';

  ngOnInit(): void {
    this._activatedRoute.params.subscribe((params) => {
      const customerName = params['customer_name'];
      if (customerName) {
        console.log(customerName);
        this.loginService.searchCustomer(customerName).subscribe({
          next: (res: any) => {
            console.log(res);
            this.searchCustomer;
            this.searchResults.set(res);
          },
          error: (error: any) => {
            console.error('Error fetching search results:', error);
          },
        });
      }
    });

    //set logged-in user
    this.loginUser = this._authService.getUserName();
  }

  viewCustomer(customer_id: string) {
    console.log(customer_id);
    this.router.navigate(['view-customer', customer_id]);
  }

  deleteCustomer(event: string) {
    //console.log(event);
    this.confirmationService.confirm({
      message: 'Are you sure that you want to delete?',
      header: 'Delete a customer',
      closable: true,
      closeOnEscape: true,
      icon: 'pi pi-exclamation-triangle',
      rejectButtonProps: {
        label: 'Cancel',
        severity: 'secondary',
        outlined: true,
      },
      acceptButtonProps: {
        label: 'Delete',
      },
      accept: () => {
        this.loginService.deleteCustomer(event).subscribe(
          (res: any) => {
            console.log(res);
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: res.message,
            });
            // this.getAllcustomers();
          },
          (error: any) => {
            console.log(error);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: error.error.message,
            });
          },
        );
      },
    });
  }
}
