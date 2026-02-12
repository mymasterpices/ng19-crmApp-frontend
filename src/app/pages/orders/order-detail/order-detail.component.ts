import { Component, inject, OnInit } from '@angular/core';
import { OrderServices } from '../../../services/orders/order-services';
import { ActivatedRoute } from '@angular/router';
import { HttpParams } from '@angular/common/http';

@Component({
  selector: 'app-order-detail',
  imports: [],
  templateUrl: './order-detail.component.html',
  styleUrl: './order-detail.component.css',
})
export class OrderDetailComponent implements OnInit {
  private _orderServices = inject(OrderServices);
  private _route = inject(ActivatedRoute);

  orderIdDetails: any = null;

  ngOnInit() {
    this._route.paramMap.subscribe((params) => {
      const orderId = params.get('id');
      console.log('Received order ID:', orderId);
      if (orderId) {
        this.fetchOrderDetails(orderId);
      }
    });
  }

  fetchOrderDetails(orderId: string) {
    // Use _id because that is the key in your JSON
    const params = new HttpParams().set('_id', orderId);

    this._orderServices.getOrders(params).subscribe({
      next: (response: any) => {
        // Since API returns an array, we grab the matching object
        if (response && response.length > 0) {
          this.orderIdDetails =
            response.find((o:any) => o._id === orderId) || response[0];
        }
      },
      error: (err) => console.error('Fetch Error:', err),
    });
  }

}
