import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { jwtDecode } from 'jwt-decode';

@Injectable({
  providedIn: 'root',
})
export class LoginedUserService {
  private _router = inject(Router);

  private userName: string = '';
  private userRole: string = '';
  private userID: string = '';

  getLoginedUser(): string {
    const token = localStorage.getItem('RkJewellersUser');
    if (token) {
      try {
        const decodedToken: any = jwtDecode(token);
        this.userName = decodedToken?.username || 'Guest';
        this.userRole = decodedToken?.role || '';
        this.userID = decodedToken?.userId || '';
      } catch (error) {
        console.error('Error decoding token:', error);
        this._router.navigate(['/login']);
      }
    }
    return this.userName;
  }

  /**
   * New Method: Returns the user's role (admin, superadmin, etc.)
   */
  getUserRole(): string {
    // If userName is empty, try to decode first
    if (!this.userName) {
      this.getLoginedUser();
    }
    return this.userRole;
  }

  getUserName(): string {
    return this.userName;
  }
  //get userId
  getUserId(): string {
    return this.userID;
  }
}
