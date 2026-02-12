import { Limit } from './../../../../../node_modules/qrcode/node_modules/p-limit/index.d';
import {
  Component,
  inject,
  ViewChild,
  AfterViewInit,
  OnInit,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpParams } from '@angular/common/http';

import {
  NgxScannerQrcodeComponent,
  ScannerQRCodeConfig,
  ScannerQRCodeResult,
} from 'ngx-scanner-qrcode';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { MessageService } from 'primeng/api';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { AccordionModule } from 'primeng/accordion';
import { TagModule } from 'primeng/tag';
import { PopoverModule } from 'primeng/popover';
import { ImageModule } from 'primeng/image';

import { OrderServices } from '../../../services/orders/order-services';
import { environment } from '../../../../environments/environment.development';
import { Router, RouterLink } from '@angular/router';
import { ShareOrderService } from '../../../services/orders/share-order.service';

@Component({
  selector: 'app-change-status',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NgxScannerQrcodeComponent,
    InputTextModule,
    ButtonModule,
    CardModule,
    IconFieldModule,
    InputIconModule,
    AccordionModule,
    TagModule,
    PopoverModule,
    ImageModule,
  ],
  templateUrl: './change-status.component.html',
  styleUrl: './change-status.component.css',
})
export class ChangeStatusComponent implements AfterViewInit, OnInit {
  private _orderService = inject(OrderServices);
  private _router = inject(Router);
  private _shareOrderService = inject(ShareOrderService);
  private _messageService = inject(MessageService);

  @ViewChild('action') scanner!: NgxScannerQrcodeComponent;

  public config: ScannerQRCodeConfig = {
    constraints: {
      video: {
        facingMode: 'environment',
        aspectRatio: { ideal: 1 }, // Standard 4:3 aspect ratio for stability
      },
    },
    canvasStyles: [
      { lineWidth: 1, strokeStyle: '#22c55e', fillStyle: '#22c55e' }, // Green scan line
    ],
  };
  searchOrderNum: string = '';
  isLoading: boolean = false;
  hasSearched: boolean = false; // Tracks if user has attempted a search

  isScanning = signal<boolean>(true);
  backendUrl = environment.API_URL;

  orderDetails = signal<any[]>([]);
  orderStatuslist: any[] = [];

  ngOnInit(): void {
    this.orderStatusListfunc();
  }

  ngAfterViewInit() {
    setTimeout(() => this.startScanner(), 500);
  }

  public startScanner() {
    if (this.scanner) this.scanner.start();
  }

  // Unified search function
  public handleSearch(orderNumber: string) {
    const term = orderNumber?.trim();
    if (!term) {
      this.orderDetails.set([]);
      this.hasSearched = false;
      return;
    }

    this.isLoading = true;
    this.hasSearched = true;

    let params = new HttpParams().set('orderNumber', term);
    this._orderService.getOrders(params).subscribe({
      next: (res: any) => {
        this.orderDetails.set(Array.isArray(res) ? res : []);
        this.isLoading = false;
      },
      error: (err) => {
        console.error(err);
        this.isLoading = false;
        this._messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Search failed',
        });
      },
    });
  }

  public onScanSuccess(event: ScannerQRCodeResult[]) {
    const result = Array.isArray(event)
      ? event[0]?.value
      : (event as any)?.value;
    if (result) {
      // this.scanner.stop();
      this.searchOrderNum = result;
      this.handleSearch(result);
    }
  }

  // Triggered on every keystroke
  searchByOrderNum(event: any) {
    const val = event.target.value;
    this.searchOrderNum = val;

    // Only search automatically if length > 2 to avoid excessive API hits
    if (val.length > 2) {
      this.handleSearch(val);
    } else if (val.length === 0) {
      this.orderDetails.set([]);
      this.hasSearched = false;
    }
  }

  orderStatusListfunc() {
    this._orderService.getStatusList().subscribe({
      next: (res: any) => (this.orderStatuslist = res),
      error: (err) => console.log('Status list error', err),
    });
  }

  getStatusSeverity(
    status: string,
  ): 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast' {
    switch (status?.toLowerCase()) {
      case 'issued':
        return 'info';
      case 'received':
        return 'warn';
      case 'dispatched':
        return 'success';
      case 'hold':
        return 'danger';
      case 'cancelled':
        return 'secondary';
      default:
        return 'contrast';
    }
  }

  updateOrderStatus(orderId: string, newStatus: string) {
    this._orderService.updateOrderStatus(orderId, newStatus).subscribe({
      next: () => {
        this._messageService.add({
          severity: 'success',
          summary: 'Updated',
          detail: `Status: ${newStatus}`,
        });
        this.handleSearch(this.searchOrderNum); // Refresh current view
      },
      error: (err) => console.error('Update Failed', err),
    });
  }

  public handleCameraError(error: any) {
    this._messageService.add({
      severity: 'warn',
      summary: 'Camera Error',
      detail: 'Check permissions.',
    });
  }
  //get pDf
  onEdit(id: string) {
    this._router.navigate(['orders/edit-order', id]);
  }
  getPDF(orderId: any) {
    const params = new HttpParams().set('id', orderId);

    this._orderService.getOrders(params).subscribe({
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
