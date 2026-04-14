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
import { ActivatedRoute, Router } from '@angular/router';
import { SelectModule } from 'primeng/select';
import { HttpParams } from '@angular/common/http';
import { CardModule } from 'primeng/card';
import { PaginatorModule } from 'primeng/paginator';
import { ApiService } from '../../../services/api.service';
import { environment } from '../../../../environments/environment';
import { DrawerModule } from 'primeng/drawer';
import { AddNewComponent } from '../add-new/add-new.component';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { FloatLabel } from 'primeng/floatlabel';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { AuthService } from '../../../services/auth.service';

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
    MultiSelectModule,
  ],
  providers: [ConfirmationService],
  templateUrl: './customer-view-all.component.html',
  styleUrls: ['./customer-view-all.component.css'],
})
export class CustomerViewAllComponent implements OnInit {
  private loginService = inject(ApiService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private _authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute); // ✅ read query params

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
    this.userRole = this._authService.getUserRole();
    this.loginUser = this._authService.getUserName();

    this.getSalespersonOptions();

    // ✅ Check if analytic component passed query params
    const qp = this.route.snapshot.queryParams;

    if (qp['startDate'] || qp['endDate'] || qp['salesperson']) {
      // Build params from what analytic sent
      this.fetchWithAnalyticParams(
        qp['salesperson'] ?? '',
        qp['startDate'] ?? '',
        qp['endDate'] ?? '',
      );
    } else {
      // Normal load
      this.getAllcustomers();
    }
  }

  // ✅ Called when navigated from analytic component
  private fetchWithAnalyticParams(
    salesperson: string,
    startDate: string,
    endDate: string,
  ): void {
    const isPrivileged =
      this.userRole === 'admin' || this.userRole === 'superadmin';

    let params = new HttpParams();

    // Security: non-admins can only see their own customers
    if (!isPrivileged) {
      params = params.set('salesperson', this.loginUser);
    } else if (salesperson) {
      params = params.set('salesperson', salesperson);
    }

    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);

    this.executeFetch(params);
  }

  getSalespersonOptions() {
    this.loginService.getAllSalespersons().subscribe({
      next: (res: any) => {
        const unique = [
          ...new Set(
            res
              .filter((u: any) => u.status === 'active' && u.role === 'user')
              .map((u: any) => u.username),
          ),
        ];
        this.salespersonOptions.set(
          unique.map((name) => ({ label: name, value: name })),
        );
      },
      error: (err) => console.error(err),
    });
  }

  getSearchCustomer(search: string = '') {
    const isPrivileged =
      this.userRole === 'admin' || this.userRole === 'superadmin';
    let params = new HttpParams();

    if (!isPrivileged) {
      params = params.set('salesperson', this.loginUser);
    }

    if (search.trim()) {
      params = params.set('name', search.trim());
    }

    this.executeFetch(params);
  }

  searchCustomer(): void {
    const isPrivileged =
      this.userRole === 'admin' || this.userRole === 'superadmin';
    const { salesperson, status } = this.searchForm.value;
    let params = new HttpParams();

    if (!isPrivileged) {
      params = params.set('salesperson', this.loginUser);
    } else if (salesperson && (salesperson as string[]).length) {
      (salesperson as string[]).forEach((s) => {
        params = params.append('salesperson', s); // append, not set
      });
    }

    if (status && (status as string[]).length) {
      (status as string[]).forEach((s) => {
        params = params.append('status', s); // append, not set
      });
    }

    this.executeFetch(params);
  }

  getAllcustomers(): void {
    const isPrivileged =
      this.userRole === 'admin' || this.userRole === 'superadmin';
    let params = new HttpParams();

    if (!isPrivileged) {
      params = params.set('salesperson', this.loginUser);
    }

    this.executeFetch(params);
  }

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
