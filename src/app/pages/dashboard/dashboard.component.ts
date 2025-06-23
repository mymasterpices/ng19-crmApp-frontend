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
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { LoginedUserService } from '../../services/logined-user.service';
import { ApiService } from '../../services/api.service';
import { environment } from '../../../environments/environment';


@Component({
  selector: 'app-dashboard',
  imports: [
    FormsModule, NgClass, DatePipe,
    ButtonModule, TitleCasePipe,
    ConfirmDialog,
    SelectModule, CardModule, ReactiveFormsModule,
    PaginatorModule,
  ],
  providers: [ConfirmationService],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  private loginService = inject(ApiService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private loginedUserService = inject(LoginedUserService);
  private router = inject(Router);

  customers = signal<any[]>([]);
  private appUrl = environment.apiUrl;
  backedAppUrl = this.appUrl;
  statusOptions: any[] | undefined;
  salespersonOptions: any[] | undefined;

  loginUser: string = '';


  ngOnInit(): void {
    this.getAllcustomers();
    this.getSalespersonOptions();
    this.salespersonOptions = [];

    // Initialize status options
    this.statusOptions = [
      { label: 'Cold', value: 'Cold' },
      { label: 'Open', value: 'Open' },
      { label: 'Close', value: 'Close' }
    ];

    this.loginUser = this.loginedUserService.getLoginedUser();
  }


  selectedStatus(arg0: string, selectedStatus: any): HttpParams {
    throw new Error('Method not implemented.');
  }
  selectedSalesperson(arg0: string, selectedSalesperson: any): HttpParams {
    throw new Error('Method not implemented.');
  }

  getSalespersonOptions() {
    this.loginService.getAllSalespersons().subscribe(
      (res: any) => {
        // console.log(res);
        this.salespersonOptions = res.map((customer: any) => ({
          label: customer.salesPerson,
          value: customer.salesPerson
        }));
      },
      (error: any) => {
        console.log(error);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: error.error.message });
      }
    );
  }


  //filter form value
  searchForm = new FormGroup({
    salesperson: new FormControl(null),
    status: new FormControl(null)
  });

  searchCustomer(): void {
    const { salesperson, status } = this.searchForm.value;
    let params = new HttpParams();

    if (salesperson) {
      params = params.set('salesperson', salesperson);
    }

    if (status) {
      params = params.set('status', status);
    }

    this.loginService.getAllcustomers(params).subscribe(
      (res: any) => {
        console.log(res);
        this.customers.set(res);
        this.getSalespersonOptions();

        // Update salesperson options from result
        this.salespersonOptions = res.map((customer: any) => ({
          label: customer.salesperson,
          value: customer.salesperson
        }));
      },
      (error: any) => {
        this.customers.set([]);
        console.log(error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error.error.message
        });
      }
    );
  }


  // Pagination signals
  totalRecords = signal<number>(0);
  rows = signal<number>(10); // Items per page
  first = signal<number>(0); // Starting index

  // Computed signal for paginated data
  paginatedCustomers = computed(() => {
    const allCustomers = this.customers();
    const startIndex = this.first();
    const endIndex = startIndex + this.rows();
    return allCustomers.slice(startIndex, endIndex);
  });

  //initial customers list
  getAllcustomers(): void {
    const salesperson = this.loginedUserService.getLoginedUser(); // Get username from token
    let params = new HttpParams();

    if (salesperson && salesperson !== 'admin') {
      params = params.set('salesperson', salesperson);
      this.loginService.getAllcustomers(params).subscribe(
        (res: any) => {
          // console.log(res);
          this.customers.set(res);
          this.totalRecords.set(res.length);
          // Update salesperson options
          this.salespersonOptions = res.map((customer: any) => ({
            label: customer.salesperson,
            value: customer.salesperson
          }));
        },
        (error: any) => {
          this.customers.set([]);
          console.log(error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: error.error.message
          });
        }
      );
    }

    else {
      this.loginService.getAllcustomers().subscribe(
        (res: any) => {
          // console.log(res);
          this.customers.set(res);
          this.totalRecords.set(res.length);
          // Update salesperson options
          this.salespersonOptions = res.map((customer: any) => ({
            label: customer.salesperson,
            value: customer.salesperson
          }));
        }
      );
    }
  }

  onPageChange(event: any) {
    this.first.set(event.first);
    this.rows.set(event.rows);
  }

  viewCustomer(customer_id: string) {
    this.router.navigate(['view-customer', customer_id]);
  }

  // deleteCustomer(customer_id: string) {
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
            // console.log(res);
            this.messageService.add({ severity: 'success', summary: 'Success', detail: res.message });
            this.getAllcustomers();
          },
          (error: any) => {
            console.log(error);
            this.messageService.add({ severity: 'error', summary: 'Error', detail: error.error.message });
          }
        )
      },
    });
  };


}
