import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { MessageService, ConfirmationService } from 'primeng/api';
import {
  FormsModule,
  ReactiveFormsModule,
  FormGroup,
  FormControl,
} from '@angular/forms';
import { DatePipe, NgClass, TitleCasePipe } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { Router } from '@angular/router';
import { SelectModule } from 'primeng/select';
import { HttpParams } from '@angular/common/http';
import { CardModule } from 'primeng/card';
import { PaginatorModule } from 'primeng/paginator';
import { ApiService } from '../../../services/api.service';
import { LoginedUserService } from '../../../services/logined-user.service';
import { environment } from '../../../../environments/environment';
import { DrawerModule } from 'primeng/drawer';
import { AddNewComponent } from '../add-new/add-new.component';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { FloatLabel } from 'primeng/floatlabel';
import { InputTextModule } from 'primeng/inputtext';

@Component({
  selector: 'app-customer-view-all',
  standalone: true,
  imports: [
    FormsModule,
    NgClass,
    DatePipe,
    ButtonModule,
    TitleCasePipe,
    SelectModule,
    CardModule,
    ReactiveFormsModule,
    PaginatorModule,
    DrawerModule,
    AddNewComponent,
    ConfirmDialogModule,
    FloatLabel,
    InputTextModule,
  ],
  providers: [ConfirmationService],
  templateUrl: './customer-view-all.component.html',
  styleUrls: ['./customer-view-all.component.css'],
})
export class CustomerViewAllComponent implements OnInit {
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
    { label: 'Close', value: 'Close' },
    { label: 'Failed', value: 'Failed' },
  ]);

  userRole: string = '';
  loginUser: string = '';
  addNewCustomer: boolean = false;
  backendAppUrl = environment.API_URL;

  totalRecords = signal<number>(0);
  rows = signal<number>(10);
  first = signal<number>(0);

  searchForm = new FormGroup({
    salesperson: new FormControl(null),
    status: new FormControl(null),
  });

  ngOnInit(): void {
    this.userRole = this.loginedUserService.getUserRole();
    this.loginUser = this.loginedUserService.getLoginedUser();
    this.getAllcustomers();
    this.getSalespersonOptions();
  }

  getSalespersonOptions() {
    this.loginService.getAllSalespersons().subscribe({
      next: (res: any) => {
        const unique = [...new Set(res.map((u: any) => u.username))];
        this.salespersonOptions.set(
          unique.map((name) => ({ label: name, value: name })),
        );
      },
      error: (err) => console.error(err),
    });
  }

  // ✅ Fixed: Only accepts name search + security restriction
  getSearchCustomer(search: string = '') {
    const isPrivileged =
      this.userRole === 'admin' || this.userRole === 'superadmin';
    let params = new HttpParams();

    // 1. Mandatory Security: Ensure non-admins only search THEIR own customers
    if (!isPrivileged) {
      params = params.set('salesperson', this.loginUser);
    }

    // 2. Name Search: Only apply the name parameter
    if (search.trim()) {
      params = params.set('name', search.trim());
    }

    // 3. Execute
    this.executeFetch(params);
  }

  // ✅ Fixed: Now combines form filters with role security
  searchCustomer(): void {
    const isPrivileged =
      this.userRole === 'admin' || this.userRole === 'superadmin';
    const { salesperson, status } = this.searchForm.value;
    let params = new HttpParams();

    if (!isPrivileged) {
      params = params.set('salesperson', this.loginUser);
    } else if (salesperson) {
      params = params.set('salesperson', salesperson);
    }

    if (status) params = params.set('status', status);

    this.executeFetch(params);
  }

  // ✅ Fixed: Standard load respecting roles
  getAllcustomers(): void {
    const isPrivileged =
      this.userRole === 'admin' || this.userRole === 'superadmin';
    let params = new HttpParams();

    if (!isPrivileged) {
      params = params.set('salesperson', this.loginUser);
    }

    this.executeFetch(params);
  }

  // Helper to prevent code duplication
  private executeFetch(params: HttpParams) {
    this.loginService.getAllcustomers(params).subscribe({
      next: (res: any) => {
        const data = Array.isArray(res) ? res : [];
        this.customers.set(data);
        this.totalRecords.set(data.length);
        this.first.set(0);
      },
      error: (error: any) => {
        this.customers.set([]);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error.error?.message,
        });
      },
    });
  }

  onPageChange(event: any) {
    this.first.set(event.first);
    this.rows.set(event.rows);
  }

  viewCustomer(customer_id: string) {
    this.router.navigate(['view-customer', customer_id]);
  }

  deleteCustomer(customerId: string) {
    this.confirmationService.confirm({
      message: 'Are you sure that you want to delete?',
      header: 'Delete customer',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.loginService.deleteCustomer(customerId).subscribe({
          next: (res: any) => {
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: res.message,
            });
            this.getAllcustomers();
          },
          error: (err) => console.error(err),
        });
      },
    });
  }

  paginatedCustomers = computed(() => {
    return this.customers().slice(this.first(), this.first() + this.rows());
  });
}
