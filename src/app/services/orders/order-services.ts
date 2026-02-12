import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class OrderServices {
  private http = inject(HttpClient);

  //get orders
  getOrders(params?: HttpParams) {
    return this.http.get(environment.API_URL + '/api/orders/get', {
      params: params || {},
    });
  }
  //create order
  createOrder(orderData: any) {
    return this.http.post(
      environment.API_URL + '/api/orders/create',
      orderData,
    );
  }

  //edit/update existing order
  updateOrder(id: string, formData: any) {
    // Use a slash before the ID, NOT a question mark
    return this.http.put(`${environment.API_URL}/api/orders/edit/${id}`, formData);
  }

  //create karigar
  createKarigar(orderData: any) {
    return this.http.post(
      environment.API_URL + '/api/orders/karigar/create',
      orderData,
    );
  }
  getkarigarsList() {
    return this.http.get(environment.API_URL + '/api/orders/karigar/get');
  }

  //create category
  createCategory(categoryData: any) {
    return this.http.post(
      environment.API_URL + '/api/orders/category/create',
      categoryData,
    );
  }

  //get category
  getCategoryList() {
    return this.http.get(environment.API_URL + '/api/orders/category/get');
  }

  //get salesperson
  getSalespersonList() {
    return this.http.get(environment.API_URL + '/api/orders/salesperson/get');
  }

  createSalesperson(salespersonData: any) {
    return this.http.post(
      environment.API_URL + '/api/orders/salesperson/create',
      salespersonData,
    );
  }

  //get status
  getStatusList() {
    return this.http.get(environment.API_URL + '/api/orders/status/get');
  }

  //update order status
  updateOrderStatus(orderId: string, status: string) {
    return this.http.put(
      environment.API_URL + `/api/orders/update/${orderId}`,
      { status },
    );
  }
}
