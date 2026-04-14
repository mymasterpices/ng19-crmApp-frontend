import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Location } from '@angular/common';
import { jwtDecode } from 'jwt-decode';

interface DecodedToken {
  username?: string;
  role?: string;
  userId?: string;
  exp?: number;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private router = inject(Router);
  private http = inject(HttpClient);
  private location = inject(Location);
  private baseUrl = environment.API_URL;

  // ─── Token ───────────────────────────────────────────────
  setToken(token: string): void {
    localStorage.removeItem('RkJewellersUser'); // clear old first
    localStorage.setItem('RkJewellersUser', token);
    this.router.navigate(['/overview']);
  }

  getToken(): string | null {
    return localStorage.getItem('RkJewellersUser');
  }

  // ─── Decode (always fresh, never cached) ─────────────────
  private decodeToken(): DecodedToken | null {
    const token = this.getToken();
    if (!token) return null;
    try {
      return jwtDecode<DecodedToken>(token);
    } catch (error) {
      console.error('Token decode error:', error);
      this.logout();
      return null;
    }
  }

  // ─── User Info ────────────────────────────────────────────
  getUserName(): string {
    return this.decodeToken()?.username || 'Guest';
  }

  getUserRole(): string {
    return this.decodeToken()?.role || '';
  }

  getUserId(): string {
    return this.decodeToken()?.userId || '';
  }

  // ─── Auth State ───────────────────────────────────────────
  isLoggedIn(): boolean {
    const decoded = this.decodeToken();
    if (!decoded) return false;
    const isExpired = (decoded.exp ?? 0) * 1000 < Date.now();
    if (isExpired) {
      this.logout();
      return false;
    }
    return true;
  }

  // ─── Auth Actions ─────────────────────────────────────────
  login(loginInput: any) {
    return this.http.post(this.baseUrl + '/api/auth/login', loginInput);
  }

  logout(): void {
    localStorage.removeItem('RkJewellersUser');
    sessionStorage.clear();
    this.router.navigate(['/login']);
  }

  goBack(): void {
    this.location.back();
  }
}
