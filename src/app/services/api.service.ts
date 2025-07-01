import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  getLoginedUser() {
    throw new Error('Method not implemented.');
  }

  private http = inject(HttpClient);
  private appUrl = environment.apiUrl;

  constructor() { }

  private baseUrl = this.appUrl;

  //get all customers on dashboard
  getAllcustomers(params?: HttpParams) {
    return this.http.get(this.baseUrl + '/api/customers/get', {
      params: params || {}
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
    return this.http.delete(this.baseUrl + '/api/customers/delete/' + customer_id);
  }

  //change password
  changePassword(confirmPasswordInput: any) {
    return this.http.patch(this.baseUrl + '/api/auth/update-password/', confirmPasswordInput);
  }

  //update a customer chat
  updateChat(customer_id: string, chat: any) {
    return this.http.post(`${this.baseUrl}/api/chat/add/${customer_id}`, chat);
  }

  //search for a customer by name
  searchCustomer(customer_name: string) {
    return this.http.get(`${this.baseUrl}/api/customers/search/${customer_name}`);
  }

  editChat(customer_id: string, chat_id: string, chat: any) {
    return this.http.put(`${this.baseUrl}/api/chat/update/${customer_id}/${chat_id}`, chat);
  }
  //delete a chat
  deleteChat(customer_id: string, chat_id: string) {
    return this.http.delete(`${this.baseUrl}/api/chat/delete/${customer_id}/${chat_id}`);
  }

  //today's followup customers
  todayFollowupCustomers(params?: HttpParams) {
    return this.http.get(`${this.baseUrl}/api/customers/followup/today`, {
      params: params || {}
    });
  }
  missedFollowupCustomers(params?: HttpParams) {
    return this.http.get(`${this.baseUrl}/api/customers/followup/missed`, {
      params: params || {}
    });
  }

  //update a customer
  updateCustomer(customer_id: string, update: any) {
    return this.http.put(`${this.baseUrl}/api/customers/update/${customer_id}`, update);
  }

  //get all salespersons
  getAllSalespersons() {
    return this.http.get(`${this.baseUrl}/api/auth/users`);
  }
  //get all sales staff
  getAllSalesstaff() {
    return this.http.get(`${this.baseUrl}/api/auth/users`);
  }

  //delete a staff
  deleteSalesstaff(userID: string) {
    return this.http.delete(`${this.baseUrl}/api/auth/delete/` + userID);
  }
  //change a staff password by admin
  updatePassword(userID: string, updatedPassword: any) {
    return this.http.patch(`${this.baseUrl}/api/auth/password/${userID}`, updatedPassword);
  }

  //new sales staff
  addSalesstaff(newSalesstaff: any) {
    return this.http.post(`${this.baseUrl}/api/auth/register`, newSalesstaff);
  }
}
