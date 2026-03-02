import { Component, inject, OnInit, signal } from '@angular/core';
import { OrderServices } from '../../../services/orders/order-services';
import { LoginedUserService } from '../../../services/logined-user.service';
import { MessageService } from 'primeng/api';
import { HttpParams } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { ShareOrderService } from '../../../services/orders/share-order.service';
import { environment } from '../../../../environments/environment';
import { Card, CardModule } from 'primeng/card';
import { Paginator, PaginatorModule } from 'primeng/paginator';
import { CommonModule, DatePipe, TitleCasePipe } from '@angular/common';
import {
  AccordionContent,
  AccordionHeader,
  Accordion,
  AccordionModule,
} from 'primeng/accordion';
import { Popover, PopoverModule } from 'primeng/popover';
import { Tag, TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { ImageModule } from 'primeng/image';
import { IconField, IconFieldModule } from 'primeng/iconfield';
import { InputIcon, InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { SharevideosService } from '../../../services/sharevideos.service';
import { Select, SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-karigar-dashboard',
  imports: [
    CommonModule,
    ButtonModule,
    TagModule,
    InputTextModule,
    AccordionModule,
    CardModule,
    IconField,
    InputIcon,
    ImageModule,
    PopoverModule,
    PaginatorModule,
    DatePipe,
    TitleCasePipe,
    PaginatorModule,
    SelectModule,
    FormsModule,
  ],
  templateUrl: './karigar-dashboard.component.html',
  styleUrl: './karigar-dashboard.component.css',
})
export class KarigarDashboardComponent implements OnInit {
  //Dependancy injection
  private _messageService = inject(MessageService);
  private _logginedUserService = inject(LoginedUserService);
  private _orderServices = inject(OrderServices);
  private _router = inject(Router);
  private _activeRouter = inject(ActivatedRoute);
  private _shareOrderService = inject(ShareOrderService);

  //Declear variables
  userRole = this._logginedUserService.getUserRole();
  userName = this._logginedUserService.getUserName();

  selectedStatus: any;

  orders: any[] = [];
  pagedOrders: any[] = [];
  backendUrl = environment.API_URL;

  first: number = 0;
  rows: number = 10;
  totalrecords: number = 0;

  ngOnInit() {
    const params = new HttpParams()
      .set('karigari', this.userName)
      .set('status', 'issued');
    this.fetchOrders(params);

    this.orderStatusListfunc();
  }

  onEdit(id: string) {
    this._router.navigate(['orders/edit-order', id]);
  }

  orderStatuslist: any[] = [];
  //get orderStatus
  orderStatusListfunc() {
    this._orderServices.getStatusList().subscribe({
      next: (res: any[]) => {
        // 1. Define what to exclude
        const toExclude = ['hold', 'issued', 'received', 'cancelled'];

        // 2. Filter and store in your property
        this.orderStatuslist = res.filter(
          (status) =>
            !toExclude.includes(status.name.toLowerCase()),
        );

        console.log('Filtered Statuses:', this.orderStatuslist);
      },
      error: (err) => {
        console.log('Order list not found', err);
      },
    });
  }

  onStatusChange(event: any) {
    // Start with the base parameter (the Karigar's name)
    let params = new HttpParams().set('karigari', this.userName);

    // If event.value exists, the user selected a status.
    // If event.value is null (cleared), we skip this block and send only 'karigari'.
    if (event.value && event.value.name) {
      params = params.set('status', event.value.name);
      console.log('Filtering by:', event.value.name);
    } else {
      console.log('Filter cleared, fetching all orders for:', this.userName);
    }

    // Call your existing fetch function with the updated params
    this.fetchOrders(params);
  }
  // FIXED: Matches your API strings exactly (hold, issued, received, etc.)
  getStatusSeverity(
    status: string,
  ): 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast' {
    switch (status?.toLowerCase()) {
      case 'issued':
        return 'info'; // Blue
      case 'received':
        return 'secondary'; // Orange
      case 'dispatched':
        return 'success'; // Green
      case 'hold':
        return 'danger'; // Red
      case 'cancelled':
        return 'warn'; // Gray
      default:
        return 'contrast';
    }
  }

  updatePageData() {
    const start = this.first;
    const end = this.first + this.rows;
    this.pagedOrders = this.orders.slice(start, end);
  }

  onPageChange(event: any) {
    this.first = event.first;
    this.rows = event.rows;
    this.updatePageData();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  searchByOrderNum(event: any) {
    const orderNum = event.target.value.trim();
    this.first = 0;

    let params = new HttpParams();
    if (orderNum) {
      // API check: ensure backend supports 'orderNumber' or 'partyOrderNo' query
      params = params.set('orderNumber', orderNum);
    }
    this.fetchOrders(params);
  }

  fetchOrders(params: HttpParams) {
    this._orderServices.getOrders(params).subscribe({
      next: (res: any) => {
        // 1. Ensure we have an array
        const rawOrders = Array.isArray(res) ? res : [];

        // 2. Sort by deliveryDate (Earliest/Soonest first)
        this.orders = rawOrders.sort((a, b) => {
          const dateA = new Date(a.deliveryDate).getTime();
          const dateB = new Date(b.deliveryDate).getTime();
          return dateA - dateB;
        });

        // 3. Update records and pagination
        this.totalrecords = this.orders.length;
        this.updatePageData();
      },
      error: (error) => console.error('Error fetching orders:', error),
    });
  }

  //update order status

  updateOrderStatus(orderId: string, newStatus: string) {
    // 1. Logic check: simple logging

    this._orderServices.updateOrderStatus(orderId, newStatus).subscribe({
      next: (res) => {
        // 2. Success Notification
        this._messageService.add({
          severity: 'success',
          summary: 'Order Updated',
          detail: `Status changed to ${newStatus}`,
        });

        // 3. RELOAD DATA
        // We grab the current route status to ensure we stay on the filtered view if one exists
        const currentFilter =
          this._activeRouter.snapshot.paramMap.get('status');
        let params = new HttpParams();
        if (currentFilter) {
          params = params.set('status', currentFilter);
        }

        this.fetchOrders(params);
      },
      error: (err) => {
        this._messageService.add({
          severity: 'error',
          summary: 'Update Failed',
          detail: 'Could not update status in database',
        });
        console.error('API Error:', err);
      },
    });
  }

  //download pdf file
  getPDF(orderId: any) {
    const params = new HttpParams().set('id', orderId);

    this._orderServices.getOrders(params).subscribe({
      next: (res: any) => {
        console.log('API Response:', res);
        const data = Array.isArray(res) ? res : [res];

        if (data.length > 0) {
          this._shareOrderService.generateOrderPdf(data);
        } else {
          console.warn('No order found for this ID');
        }
      },
      error: (err: any) => {
        console.log('error while fetch data for pdf', err);
      },
    });
  }
}
