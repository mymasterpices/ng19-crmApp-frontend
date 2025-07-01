import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { MessageService, ConfirmationService } from 'primeng/api';
import { FormsModule, ReactiveFormsModule, FormGroup, FormControl } from '@angular/forms';
import { DatePipe, NgClass, TitleCasePipe } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { Router } from '@angular/router';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { SelectModule } from 'primeng/select';
import { HttpParams } from '@angular/common/http';
import { CardModule } from 'primeng/card';
import { PaginatorModule } from 'primeng/paginator';
import { LoginedUserService } from '../../services/logined-user.service';
import { ApiService } from '../../services/api.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    FormsModule, NgClass, DatePipe,
    ButtonModule, TitleCasePipe,
    ConfirmDialog, SelectModule,
    CardModule, ReactiveFormsModule,
    PaginatorModule,
  ],
  providers: [ConfirmationService],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {

  private loginService = inject(ApiService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private loginedUserService = inject(LoginedUserService);
  private router = inject(Router);

  customers = signal<any[]>([]);
  salespersonOptions = signal<any[]>([]);
  statusOptions = signal<any[]>([
    { label: 'Cold', value: 'Cold' },
    { label: 'Open', value: 'Open' },
    { label: 'Close', value: 'Close' }
  ]);

  private appUrl = environment.apiUrl;
  backedAppUrl = this.appUrl;

  loginUser: string = '';

  // Pagination signals
  totalRecords = signal<number>(0);
  rows = signal<number>(10);
  first = signal<number>(0);

  ngOnInit(): void {
    this.loginUser = this.loginedUserService.getLoginedUser();
    this.getAllcustomers();
    this.getSalespersonOptions();  // ✅ Only called once
  }

  // Filter form
  searchForm = new FormGroup({
    salesperson: new FormControl(null),
    status: new FormControl(null)
  });

  // ✅ Fetch unique salesperson list
  getSalespersonOptions() {
    this.loginService.getAllSalespersons().subscribe(
      (res: any) => {
        const usernames = res.map((user: any) => user.username);
        const uniqueUsernames = Array.from(new Set(usernames));
        const options = uniqueUsernames.map(username => ({
          label: username,
          value: username
        }));
        this.salespersonOptions.set(options);
      },
      (error: any) => {
        console.error(error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error.error.message
        });
      }
    );
  }

  // ✅ Search with filters
  searchCustomer(): void {
    const { salesperson, status } = this.searchForm.value;
    let params = new HttpParams();

    if (salesperson) params = params.set('salesperson', salesperson);
    if (status) params = params.set('status', status);

    this.loginService.getAllcustomers(params).subscribe(
      (res: any) => {
        this.customers.set(res);
        this.totalRecords.set(res.length);
      },
      (error: any) => {
        this.customers.set([]);
        console.error(error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error.error.message
        });
      }
    );
  }

  // ✅ Load customers (with salesperson restriction if not admin)
  getAllcustomers(): void {
    const salesperson = this.loginedUserService.getLoginedUser();
    let params = new HttpParams();

    if (salesperson && salesperson !== 'admin') {
      params = params.set('salesperson', salesperson);
    }

    this.loginService.getAllcustomers(params).subscribe(
      (res: any) => {
        this.customers.set(res);
        this.totalRecords.set(res.length);
      },
      (error: any) => {
        this.customers.set([]);
        console.error(error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error.error.message
        });
      }
    );
  }

  // ✅ Handle pagination
  onPageChange(event: any) {
    this.first.set(event.first);
    this.rows.set(event.rows);
  }

  // ✅ View customer details
  viewCustomer(customer_id: string) {
    this.router.navigate(['view-customer', customer_id]);
  }

  // ✅ Delete customer with confirmation
  deleteCustomer(customerId: string) {
    this.confirmationService.confirm({
      message: 'Are you sure that you want to delete?',
      header: 'Delete a customer',
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
        this.loginService.deleteCustomer(customerId).subscribe(
          (res: any) => {
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: res.message
            });
            this.getAllcustomers(); // Refresh list
          },
          (error: any) => {
            console.error(error);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: error.error.message
            });
          }
        );
      },
    });
  }

  // ✅ Computed customer list for pagination
  paginatedCustomers = computed(() => {
    const allCustomers = this.customers();
    const startIndex = this.first();
    const endIndex = startIndex + this.rows();
    return allCustomers.slice(startIndex, endIndex);
  });
}
