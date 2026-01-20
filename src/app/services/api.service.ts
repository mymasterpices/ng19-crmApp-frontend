import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private http = inject(HttpClient);
  private appUrl = environment.API_URL;

  constructor() {}

  private baseUrl = this.appUrl;

  //get all customers on view all customer
  getAllcustomers(params?: HttpParams) {
    return this.http.get(this.baseUrl + '/api/customers/get', {
      params: params || {},
    });
  }
  // get a customer by id
  viewCustomer(customer_id: string) {
    return this.http.get(this.baseUrl + '/api/customers/view/' + customer_id);
  }
  //get chat history of a customer
  getChatHistory(customer_id: string) {
    return this.http.get(this.baseUrl + '/api/chat/get/' + customer_id);
  }

  //save to customer to database
  saveCustomer(customer: any) {
    return this.http.post(this.baseUrl + '/api/customers/save', customer);
  }
  //delete a customer
  deleteCustomer(customer_id: string) {
    return this.http.delete(
      this.baseUrl + '/api/customers/delete/' + customer_id,
    );
  }

  //change password
  changePassword(confirmPasswordInput: any) {
    return this.http.patch(
      this.baseUrl + '/api/auth/update-password/',
      confirmPasswordInput,
    );
  }

  //update a customer chat
  updateChat(customer_id: string, chat: any) {
    return this.http.post(`${this.baseUrl}/api/chat/add/${customer_id}`, chat);
  }

  //search for a customer by name
  searchCustomer(customer_name: string) {
    return this.http.get(
      `${this.baseUrl}/api/customers/search/${customer_name}`,
    );
  }

  editChat(customer_id: string, chat_id: string, chat: any) {
    return this.http.put(
      `${this.baseUrl}/api/chat/update/${customer_id}/${chat_id}`,
      chat,
    );
  }
  //delete a chat
  deleteChat(customer_id: string, chat_id: string) {
    return this.http.delete(
      `${this.baseUrl}/api/chat/delete/${customer_id}/${chat_id}`,
    );
  }

  //today's followup customers
  todayFollowupCustomers(params?: HttpParams) {
    return this.http.get(`${this.baseUrl}/api/customers/followup/today`, {
      params: params || {},
    });
  }
  missedFollowupCustomers(params?: HttpParams) {
    return this.http.get(`${this.baseUrl}/api/customers/followup/missed`, {
      params: params || {},
    });
  }

  //update a customer
  updateCustomer(customer_id: string, update: any) {
    return this.http.put(
      `${this.baseUrl}/api/customers/update/${customer_id}`,
      update,
    );
  }

  //get all salespersons
  getAllSalespersons() {
    return this.http.get(`${this.baseUrl}/api/auth/users`);
  }
  //get all sales staff
  getAllSalesstaff(params?: HttpParams) {
    return this.http.get(`${this.baseUrl}/api/auth/users`, {
      params: params || {},
    });
  }

  //delete a staff
  deleteSalesstaff(userID: string) {
    return this.http.delete(`${this.baseUrl}/api/auth/delete/` + userID);
  }
  //change a staff password by admin
  updatePassword(newPassword: any) {
    return this.http.patch(`${this.baseUrl}/api/auth/password/`, newPassword);
  }

  //new sales staff
  addSalesstaff(newSalesstaff: any) {
    return this.http.post(`${this.baseUrl}/api/auth/register`, newSalesstaff);
  }

  addSoldEntry(soldEntry: any) {
    return this.http.post(`${this.baseUrl}/api/sold/save`, soldEntry);
  }
  //get all the sold items
  getAllSoldItems(params?: HttpParams) {
    return this.http.get(`${this.baseUrl}/api/sold/get`, {
      params: params || {},
    });
  }

  //get a sold item by id
  getSoldItemById(item_id: string) {
    return this.http.get(`${this.baseUrl}/api/sold/view/${item_id}`);
  }
  //update a sold item
  updateSoldItem(item_id: string, soldEntry: any) {
    return this.http.put(
      `${this.baseUrl}/api/sold/update/${item_id}`,
      soldEntry,
    );
  }
  //delete a sold item
  deleteSoldItem(item_id: string) {
    return this.http.delete(`${this.baseUrl}/api/sold/delete/${item_id}`);
  }

  // product specification
  findProduct(jewel_code: any) {
    return this.http.post(`${this.appUrl}/api/products/search`, jewel_code);
  }
  //product list upload
  uploadCsvFile(formData: FormData) {
    return this.http.post(`${this.baseUrl}/api/products/upload-csv`, formData);
  }

  getSavedList(): any[] {
    const data = localStorage.getItem('saveItems');
    return data ? JSON.parse(data) : [];
  }
}
