import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { AccordionModule } from 'primeng/accordion';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { CardModule } from 'primeng/card';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { ImageModule } from 'primeng/image';
import { OrderServices } from '../../../services/orders/order-services';
import { HttpParams } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { PopoverModule } from 'primeng/popover';
import { PaginatorModule } from 'primeng/paginator';
import { MessageService } from 'primeng/api';
import { __param } from 'tslib';
import { ShareOrderService } from '../../../services/orders/share-order.service';
import { SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { DrawerModule } from 'primeng/drawer';
import { NewOrderComponent } from '../new-order/new-order.component';

@Component({
  selector: 'app-all-orders',
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
    SelectModule,
    FormsModule,
    DrawerModule,
    NewOrderComponent,
  ],
  templateUrl: './all-orders.component.html',
  styleUrl: './all-orders.component.css',
})
export class AllOrdersComponent implements OnInit {
  private _orderServices = inject(OrderServices);
  private _router = inject(Router);
  private _messageService = inject(MessageService);
  private _shareOrderService = inject(ShareOrderService);
  private _route = inject(ActivatedRoute);

  orders: any[] = [];
  pagedOrders: any[] = [];
  backendUrl = environment.API_URL;
  selectedStatus: any;

  first: number = 0;
  rows: number = 10;
  totalrecords: number = 0;

  drawerVisible: boolean = false;
  // masterdrawerVisible: boolean = false;

  ngOnInit() {
    // Single source of truth: Listen to route params
    this._route.paramMap.subscribe((params?) => {
      const status = params?.get('status');
      let httpParams = new HttpParams();

      if (status) {
        httpParams = httpParams.set('status', status);
      }
      this.fetchOrders(httpParams);
    });

    this.orderStatusListfunc();
  }

  onEdit(id: string) {
    this._router.navigate(['orders/edit-order', id]);
  }

  onStatusChange(event: any) {
    // Start with the base parameter (the Karigar's name)
    let params = new HttpParams().set('status', event.value.name);

    // Call your existing fetch function with the updated params
    this.fetchOrders(params);
  }

  orderStatuslist: any[] = [];
  //get orderStatus 
  orderStatusListfunc() {
    this._orderServices.getStatusList().subscribe({
      next: (res: any[]) => {
        // Use all lowercase here
        const toExclude = ['wip', 'dispatched'];

        this.orderStatuslist = res.filter(
          (status) =>
            // Now both sides are lowercase, so they match perfectly
            !toExclude.includes(status.name.toLowerCase()),
        );

        console.log('Filtered Statuses:', this.orderStatuslist);
      },
      error: (err) => {
        console.log('Order list not found', err);
      },
    });
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
        this.orders = Array.isArray(res) ? res : [];
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
        const currentFilter = this._route.snapshot.paramMap.get('status');
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
