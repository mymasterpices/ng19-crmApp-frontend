import { Component, inject, OnInit, signal } from '@angular/core';
import { MessageService, ConfirmationService } from 'primeng/api';
import { DatePipe, NgClass, TitleCasePipe } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { Router } from '@angular/router';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { CardModule } from 'primeng/card';
import { environment } from '../../../environments/environment.development';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-missed',
  imports: [
    DatePipe,
    ButtonModule,
    TitleCasePipe,
    ConfirmDialog, NgClass, CardModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './missed.component.html',
  styleUrl: './missed.component.css'
})
export class MissedComponent implements OnInit {
  private loginService = inject(ApiService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private router = inject(Router);
  customers = signal<any[]>([]);
  private appUrl = environment.apiUrl;
  backedAppUrl = this.appUrl;

  ngOnInit(): void {
    this.getAllcustomers();
  }
  getAllcustomers() {
    this.loginService.missedFollowupCustomers().subscribe(
      (res: any) => {
        console.log(res);
        this.customers.set(res);
      },
      (error: any) => {
        console.log(error);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: error.error.message });
      }
    )
  }
  viewCustomer(customer_id: string) {
    console.log(customer_id);
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
            console.log(res);
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
