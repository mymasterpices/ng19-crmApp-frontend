import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { jwtDecode } from 'jwt-decode';

interface JwtPayload {
  role: string;
}

export const roleGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const token = sessionStorage.getItem('RkJewellersUser');

  if (!token) {
    router.navigate(['/login']);
    return false;
  }

  try {
    const decodedToken = jwtDecode<JwtPayload>(token);
    const userRole = decodedToken?.role;
    const expectedRole = route.data['expectedRole'];

    if (!userRole || (expectedRole && userRole.toLowerCase() !== expectedRole.toLowerCase())) {
      router.navigate(['/dashboard']);
      return false;
    }
    return true;

  } catch (err) {
    console.error('Failed to decode token:', err);
    router.navigate(['/login']);
    return false;
  }
};
