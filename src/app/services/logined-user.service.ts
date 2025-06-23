import { Injectable } from '@angular/core';
import { jwtDecode } from "jwt-decode";

@Injectable({
  providedIn: 'root'
})
export class LoginedUserService {
  private userName: string = ''; // Default username

  // Get logged-in user's username
  getLoginedUser(): string {
    const token = localStorage.getItem('RkJewellersUser');
    if (token) {
      try {
        const decodedToken: any = jwtDecode(token);
        this.userName = decodedToken?.username || 'Guest';
      } catch (error) {
        console.error('Error decoding token:', error);
        this.userName = 'Guest';
      }
    }
    return this.userName;
  }

  // Getter for username
  getUserName(): string {
    return this.userName;
  }

  // Optional: Setter for username (e.g., after login)
  setUserName(userName: string): void {
    this.userName = userName;
  }
}
