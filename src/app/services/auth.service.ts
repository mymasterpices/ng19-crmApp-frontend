import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Location } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private router = inject(Router);
  private appUrl = environment.apiUrl;
  private baseUrl = this.appUrl;
  private http = inject(HttpClient);
  private location = inject(Location);

  constructor() { }

  setToken(token: string): void {
    localStorage.setItem('RkJewellersUser', token);
    this.router.navigate(['/dashboard']);
  }

  getToken() {
    return localStorage.getItem('RkJewellersUser');
  }

  isloggedIn() {
    return !!this.getToken();
  }

  logout(): void {
    localStorage.removeItem('RkJewellersUser');
    this.router.navigate(['/login']);
  }

  goBack() {
    this.location.back();
  }

  //login a user to the system
  login(loginInput: any) {
    return this.http.post(this.baseUrl + '/api/auth/login', loginInput);
  }


}
