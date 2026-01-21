import { Injectable } from '@angular/core';
import { jwtDecode } from 'jwt-decode';

@Injectable({
  providedIn: 'root',
})
export class LoginedUserService {
  private userName: string = '';
  private userRole: string = ''; // Added property for role

  /**
   * Decodes the token and returns the username.
   * Also updates the internal userRole state.
   */
  getLoginedUser(): string {
    const token = localStorage.getItem('RkJewellersUser');
    if (token) {
      try {
        const decodedToken: any = jwtDecode(token);
        this.userName = decodedToken?.username || 'Guest';
        this.userRole = decodedToken?.role || ''; // ✅ Extracting the role here
      } catch (error) {
        console.error('Error decoding token:', error);
        this.userName = 'Guest';
        this.userRole = '';
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
}
