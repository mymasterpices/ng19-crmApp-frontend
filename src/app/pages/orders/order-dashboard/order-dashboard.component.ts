import { MessageService } from 'primeng/api';
import { Component, inject, OnInit } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { CarouselModule } from 'primeng/carousel';
import { RouterLink } from '@angular/router';
import { DrawerModule } from 'primeng/drawer';
import { HttpParams } from '@angular/common/http';
import { OrderServices } from '../../../services/orders/order-services';
import { TitleCasePipe } from '@angular/common';
import { NewOrderComponent } from '../new-order/new-order.component';
import { TabsModule } from 'primeng/tabs';
import { FloatLabelModule } from 'primeng/floatlabel';
import { InputTextModule } from 'primeng/inputtext';
import { LoginedUserService } from '../../../services/logined-user.service';

interface StatusTag {
  name: string;
  count: number;
  severity:
    | 'success'
    | 'secondary'
    | 'info'
    | 'warn'
    | 'danger'
    | 'contrast'
    | undefined;
}

@Component({
  selector: 'app-order-dashboard',
  imports: [
    ButtonModule,
    TagModule,
    CarouselModule,
    DrawerModule,
    RouterLink,
    TitleCasePipe,
    NewOrderComponent,
    TabsModule,
    FloatLabelModule,
    InputTextModule,
  ],
  templateUrl: './order-dashboard.component.html',
  styleUrl: './order-dashboard.component.css',
})
export class OrderDashboardComponent implements OnInit {
  private _orderServices = inject(OrderServices);
  private _messageService = inject(MessageService);
  private _loginedUserService = inject(LoginedUserService);
  userRole: string = '';

  tags: StatusTag[] = []; // This will hold our processed status cards
  karigarWeight: string = '0.000'; // This will hold our processed Karigari weight summary
  responsiveOptions: any[];
  drawerVisible: boolean = false;
  masterdrawerVisible: boolean = false;

  saveLoading: boolean = false;

  constructor() {
    this.responsiveOptions = [
      { breakpoint: '1199px', numVisible: 4, numScroll: 1 },
      { breakpoint: '991px', numVisible: 3, numScroll: 1 },
      { breakpoint: '767px', numVisible: 3, numScroll: 1 },
      { breakpoint: '575px', numVisible: 2, numScroll: 1 },
    ];
  }

  ngOnInit() {
    this.getAllorders();
    this.userRole = this._loginedUserService.getUserRole();
  }

  // Logic to map status string to PrimeNG severity types
  getStatusSeverity(status: string): any {
    switch (status.toLowerCase()) {
      case 'hold':
        return 'warn';
      case 'received':
        return 'info';
      case 'issued':
        return 'secondary';
      case 'dispatched':
        return 'success';
      case 'cancelled':
        return 'danger';
      default:
        return 'info';
    }
  }

  getAllorders() {
    // Passing empty HttpParams if needed by your service
    this._orderServices.getOrders(new HttpParams()).subscribe({
      next: (res: any) => {
        this.calculateStatusSummary(res);
        this.calculateKarigariSummary(res);
      },
      error: (err) => console.error('Error fetching orders:', err),
    });
  }

  calculateStatusSummary(data: any[]) {
    // 1. Group and count
    const counts = data.reduce((acc: any, curr: any) => {
      const status = curr.status || 'Unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    // 2. Map to the 'tags' format the HTML template expects
    this.tags = Object.keys(counts)
      .map((key) => ({
        name: key,
        count: counts[key],
        severity: this.getStatusSeverity(key),
      }))
      .sort((a, b) => b.count - a.count);
  }

  // 1. Declare as a simple string to hold the final sum
  totalKarigarWeight: string = '0.000';

  calculateKarigariSummary(data: any[]) {
    // Use reduce to sum every 'weight' field in the array
    const total = data.reduce((acc, curr) => {
      const weight = parseFloat(curr.weight) || 0;
      return acc + weight;
    }, 0);

    // 2. Format to 3 decimal places for jewelry precision
    this.totalKarigarWeight = total.toFixed(3);
  }

  //save new karigar
  saveNewkarigar(input: HTMLInputElement) {
    const karigarName = {
      name: input.value,
    };
    this._orderServices.createKarigar(karigarName).subscribe({
      next: (res: any) => {
        console.log(res);
        this._messageService.add({
          severity: 'success',
          summary: 'Karigar saved successfully',
          detail: 'Status changed',
        });
        input.value = '';
      },
      error: (error) => {
        console.log('Something went wrong!', error);
        this._messageService.add({
          severity: 'error',
          summary: 'Error! while saving...',
          detail: `Internal server error ${error.error.message}`,
        });
      },
    });
  }

  //save new category
  saveNewCategory(input: HTMLInputElement) {
    const categoryName = {
      name: input.value,
    };
    this._orderServices.createCategory(categoryName).subscribe({
      next: (res: any) => {
        console.log(res);
        this._messageService.add({
          severity: 'success',
          summary: 'Saved',
          detail: 'Category saved successfully',
        });
        //clear input field
        input.value = '';
      },
      error: (error) => {
        console.log('Something went wrong!', error);
        this._messageService.add({
          severity: 'error',
          summary: 'Error! while saving...',
          detail: `Internal server error ${error.error.message}`,
        });
      },
    });
  }

  //save new salesperson
  savenewsalesPerson(input: HTMLInputElement) {
    const salesPerson = {
      name: input.value,
    };
    this._orderServices.createSalesperson(salesPerson).subscribe({
      next: (res: any) => {
        console.log(res);
        this._messageService.add({
          severity: 'success',
          summary: 'Saved',
          detail: 'Sales person saved successfully',
        });
        //clear inout filed
        input.value = '';
      },
      error: (error) => {
        console.log('Something went wrong!', error);
        this._messageService.add({
          severity: 'error',
          summary: 'Error! while saving...',
          detail: `Internal server error ${error.error.message}`,
        });
      },
    });
  }
}
